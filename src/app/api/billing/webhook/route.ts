import type Stripe from "stripe"
import { readDatabase, updateDatabase } from "@/lib/database"
import { jsonError, jsonOk } from "@/lib/http"
import { logger } from "@/lib/logger"
import { getStripe, isStripeConfigured } from "@/lib/stripe-server"
import type { BillingInterval, PlanType, SubscriptionStatus } from "@/lib/rolefit-types"

export const runtime = "nodejs"

// Keep at most this many processed-event records to bound storage growth.
const EVENT_HISTORY_CAP = 500

// Map Stripe priceId → internal plan so we never grant access based on
// hardcoded assumptions about which price was paid.
function planForPriceId(priceId: string | undefined): PlanType | null {
  if (!priceId) return null
  if (
    priceId === process.env.STRIPE_STARTER_PRICE_ID ||
    priceId === process.env.STRIPE_STARTER_YEARLY_PRICE_ID
  ) {
    return "starter"
  }
  if (
    priceId === process.env.STRIPE_PRO_PRICE_ID ||
    priceId === process.env.STRIPE_PRO_YEARLY_PRICE_ID
  ) {
    return "pro"
  }
  return null
}

function wasEventProcessed(eventId: string): boolean {
  const database = readDatabase()
  return Boolean(database.processedStripeEvents?.some((evt) => evt.id === eventId))
}

function markEventProcessed(event: Stripe.Event) {
  updateDatabase((database) => {
    if (!database.processedStripeEvents) database.processedStripeEvents = []
    database.processedStripeEvents.push({
      id: event.id,
      type: event.type,
      processedAt: new Date().toISOString(),
    })
    // Bounded ring buffer.
    if (database.processedStripeEvents.length > EVENT_HISTORY_CAP) {
      database.processedStripeEvents.splice(
        0,
        database.processedStripeEvents.length - EVENT_HISTORY_CAP,
      )
    }
  })
}

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

  // Idempotency guard: Stripe retries duplicate events on any non-2xx
  // response. Without dedup, retries would re-apply subscription updates.
  if (wasEventProcessed(event.id)) {
    logger.info("api.billing.webhook", "Skipping duplicate event", {
      id: event.id,
      type: event.type,
    })
    return jsonOk({ received: true, type: event.type, duplicate: true })
  }

  try {
    await handleStripeEvent(event, stripe)
    markEventProcessed(event)
  } catch (error) {
    // Return 200 + log instead of 500 so Stripe stops retrying a permanently
    // failing event (e.g. webhook-side schema bug). We still mark it processed
    // so manual replay is required to retry — that's the intended workflow.
    logger.error("api.billing.webhook", "Failed to process Stripe event — acking to stop retries", {
      type: event.type,
      id: event.id,
      error: error instanceof Error ? error.message : String(error),
    })
    try {
      markEventProcessed(event)
    } catch {
      /* If even idempotency persistence fails, accept the duplicate cost over a retry storm. */
    }
    return jsonOk({ received: true, type: event.type, processedWithError: true })
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
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id

      updateDatabase((database) => {
        const record = database.subscriptions.find(
          (item) => item.stripeCustomerId === customerId,
        )
        if (!record) return
        record.planType = "free"
        record.status = "canceled"
        record.billingInterval = null
        record.stripeSubscriptionId = null
        record.currentPeriodStart = null
        record.currentPeriodEnd = null
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
  const priceId = subscription.items.data[0]?.price?.id
  const planType = planForPriceId(priceId)

  // If the priceId doesn't map to a plan we recognize, refuse to grant access
  // — protects against ad-hoc / discount prices accidentally upgrading users.
  if (!planType) {
    logger.warn("api.billing.webhook", "Unknown priceId on subscription", {
      userId,
      customerId,
      priceId,
    })
    return
  }

  updateDatabase((database) => {
    // Prefer matching by stripeCustomerId; only trust the metadata.userId if
    // it agrees with the customer record we already have. This prevents
    // anyone with Stripe Dashboard access from re-assigning subscriptions to
    // arbitrary users via metadata edits.
    let record = database.subscriptions.find(
      (item) => customerId && item.stripeCustomerId === customerId,
    )
    if (!record && userId) {
      record = database.subscriptions.find((item) => item.userId === userId)
    }
    if (!record) {
      logger.warn("api.billing.webhook", "No local subscription record", {
        userId,
        customerId,
        priceId,
      })
      return
    }
    if (userId && record.userId !== userId) {
      logger.error("api.billing.webhook", "metadata.userId mismatch — refusing update", {
        metadataUserId: userId,
        recordUserId: record.userId,
        customerId,
      })
      return
    }

    if (customerId) record.stripeCustomerId = customerId
    record.stripeSubscriptionId = subscription.id
    record.planType = planType
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
