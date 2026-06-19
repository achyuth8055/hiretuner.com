import type { NextRequest } from "next/server"
import { updateDatabase } from "@/lib/database"
import { isEmailVerified } from "@/lib/email-verification"
import { jsonError, jsonOk, publicBaseUrl, readJson, requireApiUser } from "@/lib/http"
import { logger } from "@/lib/logger"
import { type CheckoutPlan, getStripe, isStripeConfigured, priceIdForPlan } from "@/lib/stripe-server"
import type { BillingInterval } from "@/lib/rolefit-types"

export const runtime = "nodejs"

type CheckoutBody = {
  interval?: BillingInterval
  plan?: CheckoutPlan
}

export async function POST(request: NextRequest) {
  const context = requireApiUser(request)
  if (context instanceof Response) return context

  // Gate paid checkout on email verification. Legacy accounts created before
  // verification shipped are grandfathered (isEmailVerified handles the
  // cutoff). Free-tier features remain available before verification.
  if (!isEmailVerified(context.user)) {
    return jsonError(
      "Please verify your email address before upgrading. Check your inbox for the verification link or request a new one from settings.",
      403,
      "email_not_verified",
    )
  }

  const body = await readJson<CheckoutBody>(request)
  const interval: BillingInterval = body?.interval === "yearly" ? "yearly" : "monthly"
  const plan: CheckoutPlan = body?.plan === "pro" ? "pro" : "starter"

  if (!isStripeConfigured()) {
    logger.warn("api.billing.checkout", "Stripe is not configured (STRIPE_SECRET_KEY missing)", {
      userId: context.user.id,
      plan,
      interval,
    })
    return jsonError(
      "Payments are temporarily unavailable. Please try again later.",
      501,
      "stripe_not_configured",
      { plan, interval },
    )
  }

  const priceId = priceIdForPlan(plan, interval)
  if (!priceId || priceId.includes("replace")) {
    const planPrefix = plan === "pro" ? "STRIPE_PRO" : "STRIPE_STARTER"
    logger.warn("api.billing.checkout", "Stripe price ID missing", {
      userId: context.user.id,
      plan,
      interval,
      requiredVar: interval === "yearly" ? `${planPrefix}_YEARLY_PRICE_ID` : `${planPrefix}_PRICE_ID`,
    })
    return jsonError(
      "Payments are temporarily unavailable. Please try again later.",
      501,
      "stripe_price_missing",
      { plan, interval },
    )
  }

  const stripe = getStripe()!
  const baseUrl = publicBaseUrl(request)

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      success_url: `${baseUrl}/dashboard?upgrade=success&plan=${plan}&interval=${interval}`,
      cancel_url: `${baseUrl}/dashboard?upgrade=cancelled`,
      customer_email: context.subscription?.stripeCustomerId ? undefined : context.user.email,
      customer: context.subscription?.stripeCustomerId ?? undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      metadata: { userId: context.user.id, plan, interval },
      subscription_data: { metadata: { userId: context.user.id, plan, interval } },
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

    return jsonOk({ checkoutUrl: session.url, plan, interval })
  } catch (error) {
    logger.error("api.billing.checkout", "Stripe checkout creation failed", {
      userId: context.user.id,
      plan,
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
