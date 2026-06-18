import type Stripe from "stripe"
import { updateDatabase } from "@/lib/database"
import { jsonError, jsonOk } from "@/lib/http"
import { logger } from "@/lib/logger"
import { getStripe, isStripeConfigured } from "@/lib/stripe-server"
import type { BillingInterval, PlanType, SubscriptionStatus } from "@/lib/rolefit-types"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const stripe = getStripe()

  if (!isStripeConfigured() || !stripe) {
    return jsonError("Stripe is not configured.", 501, "stripe_not_configured")
  }
  if (!webhookSecret || webhookSecret.includes("replace")) {
    return jsonError("Stripe webhook secret is not configured.", 501, "stripe_not_configured")
  }

  const payload = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return jsonError("Missing stripe-signature header.", 400, "invalid_signature")
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)
  } catch (error) {
    logger.warn("api.billing.webhook", "Invalid Stripe signature", {
      error: error instanceof Error ? error.message : String(error),
    })
    return jsonError("Invalid Stripe webhook signature.", 400, "invalid_signature")
  }

  try {
    await handleStripeEvent(event, stripe)
  } catch (error) {
    logger.error("api.billing.webhook", "Failed to process Stripe event", {
      type: event.type,
      id: event.id,
      error: error instanceof Error ? error.message : String(error),
    })
    return jsonError("Failed to process Stripe event.", 500, "stripe_error")
  }

  return jsonOk({ received: true, type: event.type })
}

async function handleStripeEvent(event: Stripe.Event, stripe: Stripe) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.userId
      const customerId =
        typeof session.customer === "string" ? session.customer : session.customer?.id ?? null
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id ?? null

      if (!userId || !subscriptionId) return

      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      applySubscriptionUpdate(userId, customerId, subscription, session.metadata?.interval)
      logger.info("api.billing.webhook", "checkout.session.completed processed", {
        userId,
        subscriptionId,
      })
      return
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription
      const userId = subscription.metadata?.userId
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id
      if (!userId && !customerId) return
      applySubscriptionUpdate(userId, customerId, subscription, subscription.metadata?.interval)
      return
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription
      const userId = subscription.metadata?.userId
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id

      updateDatabase((database) => {
        const record = database.subscriptions.find((item) =>
          userId ? item.userId === userId : item.stripeCustomerId === customerId,
        )
        if (!record) return
        record.planType = "free"
        record.status = "canceled"
        record.billingInterval = null
        record.updatedAt = new Date().toISOString()
      })
      return
    }

    default:
      // Ignore events we don't subscribe to.
      logger.debug("api.billing.webhook", `Unhandled event ${event.type}`)
  }
}

function applySubscriptionUpdate(
  userId: string | undefined,
  customerId: string | null,
  subscription: Stripe.Subscription,
  metadataInterval: string | undefined,
) {
  const interval = normalizeInterval(metadataInterval, subscription)

  updateDatabase((database) => {
    const record = database.subscriptions.find((item) =>
      userId ? item.userId === userId : item.stripeCustomerId === customerId,
    )
    if (!record) return

    if (customerId) record.stripeCustomerId = customerId
    record.stripeSubscriptionId = subscription.id
    record.planType = "starter" satisfies PlanType
    record.status = normalizeStripeStatus(subscription.status)
    if (interval) record.billingInterval = interval
    record.currentPeriodStart = subscription.current_period_start
      ? new Date(subscription.current_period_start * 1000).toISOString()
      : null
    record.currentPeriodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null
    record.updatedAt = new Date().toISOString()
  })
}

function normalizeInterval(
  metadataValue: string | undefined,
  subscription: Stripe.Subscription,
): BillingInterval | null {
  if (metadataValue === "yearly" || metadataValue === "monthly") return metadataValue
  const planInterval = subscription.items.data[0]?.plan?.interval
  if (planInterval === "year") return "yearly"
  if (planInterval === "month") return "monthly"
  return null
}

function normalizeStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  if (
    status === "active" ||
    status === "trialing" ||
    status === "past_due" ||
    status === "canceled" ||
    status === "incomplete"
  ) {
    return status
  }
  return "active"
}
