import type { NextRequest } from "next/server"
import { jsonError, jsonOk, publicBaseUrl, requireApiUser } from "@/lib/http"
import { logger } from "@/lib/logger"
import { getStripe, isStripeConfigured } from "@/lib/stripe-server"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const context = requireApiUser(request)
  if (context instanceof Response) return context

  const customerId = context.subscription?.stripeCustomerId

  if (!isStripeConfigured()) {
    logger.warn("api.billing.portal", "Stripe is not configured (STRIPE_SECRET_KEY missing)", {
      userId: context.user.id,
    })
    return jsonError(
      "Billing management is temporarily unavailable. Please try again later.",
      501,
      "stripe_not_configured",
    )
  }

  if (!customerId) {
    return jsonError(
      "No Stripe customer is linked to this account yet.",
      409,
      "stripe_customer_missing",
    )
  }

  const stripe = getStripe()!
  const baseUrl = publicBaseUrl(request)

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/dashboard`,
    })
    return jsonOk({ portalUrl: session.url })
  } catch (error) {
    logger.error("api.billing.portal", "Stripe portal creation failed", {
      userId: context.user.id,
      error: error instanceof Error ? error.message : String(error),
    })
    return jsonError(
      error instanceof Error ? error.message : "Unable to create Stripe portal session.",
      502,
      "stripe_error",
    )
  }
}
