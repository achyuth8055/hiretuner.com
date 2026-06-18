import type { NextRequest } from "next/server"
import { updateDatabase } from "@/lib/database"
import { jsonError, jsonOk, publicBaseUrl, readJson, requireApiUser } from "@/lib/http"
import { logger } from "@/lib/logger"
import { getStripe, isStripeConfigured, priceIdForInterval } from "@/lib/stripe-server"
import type { BillingInterval } from "@/lib/rolefit-types"

export const runtime = "nodejs"

type CheckoutBody = {
  interval?: BillingInterval
}

export async function POST(request: NextRequest) {
  const context = requireApiUser(request)
  if (context instanceof Response) return context

  const body = await readJson<CheckoutBody>(request)
  const interval: BillingInterval = body?.interval === "yearly" ? "yearly" : "monthly"

  if (!isStripeConfigured()) {
    logger.warn("api.billing.checkout", "Stripe is not configured (STRIPE_SECRET_KEY missing)", {
      userId: context.user.id,
      interval,
    })
    return jsonError(
      "Payments are temporarily unavailable. Please try again later.",
      501,
      "stripe_not_configured",
      { interval },
    )
  }

  const priceId = priceIdForInterval(interval)
  if (!priceId || priceId.includes("replace")) {
    logger.warn("api.billing.checkout", "Stripe price ID missing", {
      userId: context.user.id,
      interval,
      requiredVar: interval === "yearly" ? "STRIPE_STARTER_YEARLY_PRICE_ID" : "STRIPE_STARTER_PRICE_ID",
    })
    return jsonError(
      "Payments are temporarily unavailable. Please try again later.",
      501,
      "stripe_price_missing",
      { interval },
    )
  }

  const stripe = getStripe()!
  const baseUrl = publicBaseUrl(request)

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      success_url: `${baseUrl}/dashboard?upgrade=success&interval=${interval}`,
      cancel_url: `${baseUrl}/dashboard?upgrade=cancelled`,
      customer_email: context.subscription?.stripeCustomerId ? undefined : context.user.email,
      customer: context.subscription?.stripeCustomerId ?? undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      metadata: { userId: context.user.id, interval },
      subscription_data: { metadata: { userId: context.user.id, interval } },
    })

    if (session.customer && typeof session.customer === "string") {
      updateDatabase((database) => {
        const subscription = database.subscriptions.find(
          (item) => item.userId === context.user.id,
        )
        if (subscription) {
          subscription.stripeCustomerId = session.customer as string
          subscription.billingInterval = interval
          subscription.updatedAt = new Date().toISOString()
        }
      })
    }

    if (!session.url) {
      return jsonError("Stripe did not return a checkout URL.", 502, "stripe_error")
    }

    return jsonOk({ checkoutUrl: session.url, interval })
  } catch (error) {
    logger.error("api.billing.checkout", "Stripe checkout creation failed", {
      userId: context.user.id,
      interval,
      error: error instanceof Error ? error.message : String(error),
    })
    return jsonError(
      error instanceof Error ? error.message : "Unable to create Stripe checkout session.",
      502,
      "stripe_error",
    )
  }
}
