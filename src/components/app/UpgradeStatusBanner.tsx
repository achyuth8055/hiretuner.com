"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import type { PlanType } from "@/lib/rolefit-types"

/**
 * Reads ?upgrade=success|cancelled from the URL Stripe redirects to and shows
 * a one-shot confirmation banner. Polls /api/auth/me until the webhook-driven
 * plan flip propagates, then triggers a server-component refresh so the rest
 * of the dashboard (plan usage, limits) shows the new tier.
 */
export function UpgradeStatusBanner({ currentPlan }: { currentPlan: PlanType }) {
  const router = useRouter()
  const params = useSearchParams()
  const status = params.get("upgrade")
  const planParam = (params.get("plan") ?? "").toLowerCase() as "starter" | "pro" | ""
  const intervalParam = params.get("interval") === "yearly" ? "yearly" : "monthly"

  // Derive open state from the URL directly — a dismissed banner is signaled
  // by `dismissed` so the user can close it without re-opening on re-renders.
  const [dismissed, setDismissed] = useState(false)
  const open = !dismissed && (status === "success" || status === "cancelled")

  // While the page has ?upgrade=success and the plan hasn't caught up,
  // poll /api/auth/me every 2s for up to 20s. Once the plan flips we
  // trigger router.refresh() so the parent server component re-renders
  // with the new `currentPlan`.
  useEffect(() => {
    if (status !== "success" || !planParam) return
    if (currentPlan === planParam) return
    const start = Date.now()
    const interval = setInterval(async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" })
        const json = (await response.json()) as { data?: { plan?: string } }
        if (json.data?.plan === planParam) {
          router.refresh()
          clearInterval(interval)
          return
        }
      } catch {
        /* ignore */
      }
      if (Date.now() - start > 20_000) {
        clearInterval(interval)
      }
    }, 2_000)
    return () => clearInterval(interval)
  }, [status, planParam, currentPlan, router])

  if (!open) return null

  if (status === "cancelled") {
    return (
      <Banner tone="info" onClose={() => dismiss(setDismissed, router)}>
        <div>
          <p className="font-medium text-on-surface">Checkout cancelled.</p>
          <p className="text-body-sm text-on-surface-variant">
            No charge was made. Pick a plan any time from the Upgrade button.
          </p>
        </div>
      </Banner>
    )
  }

  const planMatched = Boolean(planParam) && currentPlan === planParam

  if (planMatched) {
    return (
      <Banner tone="success" onClose={() => dismiss(setDismissed, router)}>
        <div>
          <p className="font-medium text-on-surface">
            You&apos;re on the {planLabel(planParam)} plan — payment confirmed.
          </p>
          <p className="text-body-sm text-on-surface-variant">{benefitLine(planParam, intervalParam)}</p>
        </div>
      </Banner>
    )
  }

  // Webhook still propagating — reassure the user the charge succeeded.
  return (
    <Banner tone="success" onClose={() => dismiss(setDismissed, router)}>
      <div>
        <p className="font-medium text-on-surface">
          Payment received — finishing up your {planLabel(planParam || "starter")} subscription…
        </p>
        <p className="text-body-sm text-on-surface-variant">
          Stripe is syncing your plan. Limits will refresh in a few seconds — refresh manually if it&apos;s taking longer.
        </p>
      </div>
    </Banner>
  )
}

function dismiss(setDismissed: (v: boolean) => void, router: ReturnType<typeof useRouter>) {
  setDismissed(true)
  router.replace("/dashboard")
}

function planLabel(plan: "starter" | "pro" | ""): string {
  if (plan === "pro") return "Pro"
  if (plan === "starter") return "Starter"
  return "paid"
}

function benefitLine(plan: "starter" | "pro" | "", interval: "monthly" | "yearly"): string {
  if (plan === "pro") {
    return interval === "yearly"
      ? "Unlimited tailored resumes, ad-free, 1-year version history, priority support."
      : "Unlimited tailored resumes, unlimited ATS checks, ad-free, priority support."
  }
  return interval === "yearly"
    ? "100 tailored resumes / month plus PDF downloads — billed yearly with two free months."
    : "100 tailored resumes / month, ATS scoring, keyword gap analysis, full applications tracker, PDF downloads."
}

function Banner({
  tone,
  onClose,
  children,
}: {
  tone: "success" | "info"
  onClose: () => void
  children: React.ReactNode
}) {
  const colors =
    tone === "success"
      ? "border-[#10B981]/40 bg-[#10B981]/10"
      : "border-secondary/40 bg-secondary/10"
  return (
    <div
      className={`flex items-start justify-between gap-3 rounded-xl border ${colors} p-stack-md mb-stack-md`}
      role="status"
    >
      <div className="flex gap-3 items-start flex-1">
        <span className="material-symbols-outlined text-secondary mt-[2px]">
          {tone === "success" ? "check_circle" : "info"}
        </span>
        {children}
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onClose}
        className="text-on-surface-variant hover:text-on-surface"
      >
        <span className="material-symbols-outlined">close</span>
      </button>
    </div>
  )
}
