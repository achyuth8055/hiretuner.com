"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/Button"
import type { PlanType } from "@/lib/rolefit-types"

type Interval = "monthly" | "yearly"
type CheckoutPlan = "starter" | "pro"

type PlanOption = {
  plan: CheckoutPlan
  interval: Interval
  badge?: string
  title: string
  price: string
  cadence: string
  features: string[]
}

const PLAN_OPTIONS: PlanOption[] = [
  {
    plan: "starter",
    interval: "monthly",
    title: "Starter",
    price: "$5.49",
    cadence: "per month",
    features: [
      "100 tailored resumes / month",
      "ATS scoring + keyword gap",
      "Unlimited applications tracker",
    ],
  },
  {
    plan: "starter",
    interval: "yearly",
    badge: "Save 24%",
    title: "Starter Yearly",
    price: "$49.99",
    cadence: "per year",
    features: [
      "Everything in Starter",
      "Two months free vs. monthly",
      "Priority email support",
    ],
  },
  {
    plan: "pro",
    interval: "monthly",
    badge: "Most popular",
    title: "Pro",
    price: "$9.99",
    cadence: "per month",
    features: [
      "Unlimited tailored resumes",
      "Unlimited ATS & match checks",
      "Ad-free, 1-year version history",
    ],
  },
  {
    plan: "pro",
    interval: "yearly",
    badge: "Best value",
    title: "Pro · Max",
    price: "$120",
    cadence: "per year",
    features: [
      "Everything in Pro",
      "Save vs. monthly billing",
      "Priority support + early access",
    ],
  },
]

export function UpgradeButton({
  className,
  currentPlan = "free",
  label,
  variant = "secondary",
}: {
  className?: string
  /** Drives the default CTA label (Upgrade to Starter / Upgrade to Pro). */
  currentPlan?: PlanType
  label?: string
  variant?: "default" | "outline" | "secondary" | "ghost" | "link"
}) {
  const [open, setOpen] = useState(false)
  const [loadingKey, setLoadingKey] = useState<string>("")
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!open) return
    const handler = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false)
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open])

  async function startCheckout(plan: CheckoutPlan, interval: Interval) {
    const key = `${plan}:${interval}`
    setLoadingKey(key)
    setMessage("")

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, interval }),
      })
      const json = (await response.json()) as {
        ok?: boolean
        data?: { checkoutUrl?: string }
        error?: { code?: string; message?: string }
      }

      if (!response.ok || !json.ok || !json.data?.checkoutUrl) {
        if (json.error?.code === "stripe_not_configured") {
          throw new Error(
            "Payments are temporarily unavailable. Please try again later or contact support@hiretuner.com.",
          )
        }
        if (response.status === 401) {
          window.location.assign("/login")
          return
        }
        throw new Error(json.error?.message ?? "Checkout is not available.")
      }

      window.location.assign(json.data.checkoutUrl)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Checkout is not available.")
    } finally {
      setLoadingKey("")
    }
  }

  const ctaLabel =
    label ?? (currentPlan === "starter" ? "Upgrade to Pro" : "Upgrade")

  return (
    <div className={className}>
      <Button className="w-full" variant={variant} onClick={() => setOpen(true)}>
        {ctaLabel}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-start md:items-center justify-center p-4 overflow-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Choose a plan"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-surface dark:bg-surface-container-high rounded-2xl max-w-[960px] w-full my-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 p-stack-md border-b border-outline-variant/40">
              <div>
                <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Pick the plan that fits</h3>
                <p className="text-body-sm text-on-surface-variant mt-1">
                  Cancel anytime. All paid plans unlock PDF downloads.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-on-surface-variant hover:text-on-surface"
                aria-label="Close"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-stack-md grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-stack-md">
              {PLAN_OPTIONS.map((option) => {
                const key = `${option.plan}:${option.interval}`
                const busy = loadingKey === key
                const isCurrent =
                  (currentPlan as string) !== "free" && option.plan === currentPlan
                return (
                  <div
                    key={key}
                    className={`flex flex-col gap-stack-sm rounded-xl border p-stack-md ${
                      option.badge
                        ? "border-secondary/50 bg-secondary/5"
                        : "border-outline-variant/40 bg-surface-container-lowest"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-headline-sm text-headline-sm font-bold text-on-surface">{option.title}</h4>
                      {option.badge && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-on-secondary font-medium">
                          {option.badge}
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-on-surface">{option.price}</span>
                      <span className="text-body-sm text-on-surface-variant">{option.cadence}</span>
                    </div>
                    <ul className="text-body-sm text-on-surface-variant flex flex-col gap-1">
                      {option.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-1">
                          <span className="material-symbols-outlined text-secondary text-base leading-5">check</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="mt-auto w-full"
                      variant={option.badge ? "default" : "secondary"}
                      disabled={busy || isCurrent || loadingKey !== ""}
                      onClick={() => startCheckout(option.plan, option.interval)}
                    >
                      {isCurrent
                        ? "Current plan"
                        : busy
                          ? "Opening Stripe…"
                          : `Choose ${option.title}`}
                    </Button>
                  </div>
                )
              })}
            </div>

            {message && (
              <div className="px-stack-md pb-stack-md">
                <p className="text-body-sm text-error">{message}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
