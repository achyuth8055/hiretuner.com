"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type Interval = "monthly" | "yearly"
type Plan = "starter" | "pro"

type PricingCTAProps = {
  interval: Interval
  plan?: Plan
  className?: string
  children: React.ReactNode
}

const INTENT_KEY = "rolefit_pending_upgrade"

/**
 * Pricing CTA used on the marketing pricing cards.
 *
 * Behavior:
 *  1. Click → check session via /api/auth/me.
 *  2. If signed in → POST /api/billing/checkout with the requested interval
 *     and redirect to Stripe (or show the configuration message inline).
 *  3. If not signed in → store the desired plan/interval in sessionStorage
 *     and route the user to /signup. The signup page reads the intent and
 *     auto-starts checkout after the new account is created.
 */
export function PricingCTA({ interval, plan = "starter", className, children }: PricingCTAProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  async function handleClick() {
    setLoading(true)
    setMessage("")

    try {
      // 1. Are they signed in?
      const meResponse = await fetch("/api/auth/me", { cache: "no-store" })

      if (meResponse.status === 401) {
        // 2. Not signed in - stash intent and route to signup.
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(
            INTENT_KEY,
            JSON.stringify({ plan, interval }),
          )
        }
        router.push(`/signup?plan=${plan}&interval=${interval}`)
        return
      }

      if (!meResponse.ok) {
        const json = (await meResponse.json().catch(() => ({}))) as {
          error?: { message?: string }
        }
        throw new Error(json.error?.message ?? "Unable to verify session.")
      }

      // 3. Signed in - kick off checkout.
      const checkoutResponse = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, interval }),
      })
      const json = (await checkoutResponse.json()) as {
        ok?: boolean
        data?: { checkoutUrl?: string }
        error?: { code?: string; message?: string }
      }

      if (!checkoutResponse.ok || !json.ok || !json.data?.checkoutUrl) {
        if (json.error?.code === "stripe_not_configured") {
          throw new Error(
            "Payments are temporarily unavailable. Please try again later or contact support@hiretuner.com.",
          )
        }
        throw new Error(json.error?.message ?? "Checkout is not available right now.")
      }

      window.location.href = json.data.checkoutUrl
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-8">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={
          className ??
          "w-full block text-center bg-secondary text-on-secondary font-label-uppercase text-label-uppercase px-4 py-3 rounded-lg hover:bg-secondary-container transition-colors disabled:opacity-60 disabled:pointer-events-none"
        }
      >
        {loading ? "One moment…" : children}
      </button>
      {message && (
        <p className="text-xs text-on-surface-variant mt-2 leading-snug" role="alert">
          {message}
        </p>
      )}
    </div>
  )
}

export const PRICING_INTENT_KEY = INTENT_KEY
