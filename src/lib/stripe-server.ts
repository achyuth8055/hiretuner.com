import "server-only"

import Stripe from "stripe"

let cached: Stripe | null = null

function isPlaceholder(value: string | undefined) {
  return !value || value.includes("replace")
}

export function isStripeConfigured() {
  return !isPlaceholder(process.env.STRIPE_SECRET_KEY)
}

export function getStripe(): Stripe | null {
  if (!isStripeConfigured()) return null
  if (cached) return cached
  cached = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    // Pin to a known API version so updates to the npm package don't silently
    // change request/response shapes. Bump deliberately when needed.
    apiVersion: "2024-09-30.acacia" as Stripe.LatestApiVersion,
    typescript: true,
    appInfo: {
      name: "HireTuner",
      url: "https://hiretuner.com",
    },
  })
  return cached
}

export function priceIdForInterval(interval: "monthly" | "yearly") {
  if (interval === "yearly") {
    return process.env.STRIPE_STARTER_YEARLY_PRICE_ID || null
  }
  return process.env.STRIPE_STARTER_PRICE_ID || null
}
