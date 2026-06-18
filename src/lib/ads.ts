import type { Subscription } from "@/lib/rolefit-types"

/**
 * Google AdSense configuration.
 *
 * All values are env-driven so the real publisher / slot IDs live outside the
 * repo. Ads only ever render when NEXT_PUBLIC_ADSENSE_CLIENT_ID is set, so the
 * site behaves exactly as before until you wire in your AdSense account.
 *
 * Gating rule (see isAdFree): free + monthly subscribers see ads; yearly
 * subscribers and the "plus" plan get an ad-free experience.
 */
export const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID ?? ""

/**
 * Named ad slots. Create each unit in the AdSense dashboard and paste its slot
 * id into the matching env var. A slot left empty falls back to "auto" sizing,
 * which still works once the client id is set.
 */
export const AD_SLOTS = {
  homeInline: process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME_INLINE ?? "",
  homeFooter: process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME_FOOTER ?? "",
  content: process.env.NEXT_PUBLIC_ADSENSE_SLOT_CONTENT ?? "",
} as const

export type AdSlotName = keyof typeof AD_SLOTS

export const ADSENSE_ENABLED = Boolean(ADSENSE_CLIENT_ID)

/**
 * Yearly subscribers (and the "plus" plan) get an ad-free experience. Free and
 * monthly subscribers see ads. A null/undefined subscription (anonymous or
 * free) is treated as ad-supported.
 */
export function isAdFree(subscription: Subscription | null | undefined): boolean {
  if (!subscription) return false

  const isActive = subscription.status === "active" || subscription.status === "trialing"
  if (!isActive) return false

  if (subscription.planType === "plus") return true
  if (subscription.billingInterval === "yearly") return true

  return false
}
