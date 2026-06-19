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

// Plans that can be purchased via Stripe checkout. "pro" maps to the
// $9.99/mo plan; its yearly variant ($120/yr) is marketed as "Max".
export type CheckoutPlan = "starter" | "pro"

export function priceIdForPlan(plan: CheckoutPlan, interval: "monthly" | "yearly") {
  if (plan === "pro") {
    return (
      (interval === "yearly"
        ? process.env.STRIPE_PRO_YEARLY_PRICE_ID
        : process.env.STRIPE_PRO_PRICE_ID) || null
    )
  }
  return (
    (interval === "yearly"
      ? process.env.STRIPE_STARTER_YEARLY_PRICE_ID
      : process.env.STRIPE_STARTER_PRICE_ID) || null
  )
}

/** @deprecated use priceIdForPlan("starter", interval). Kept for compatibility. */
export function priceIdForInterval(interval: "monthly" | "yearly") {
  return priceIdForPlan("starter", interval)
}
