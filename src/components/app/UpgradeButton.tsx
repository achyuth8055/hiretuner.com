"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"

type Interval = "monthly" | "yearly"

export function UpgradeButton({
  className,
  interval = "monthly",
  label,
  variant = "secondary",
}: {
  className?: string
  interval?: Interval
  label?: string
  variant?: "default" | "outline" | "secondary" | "ghost" | "link"
}) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  async function startCheckout() {
    setLoading(true)
    setMessage("")

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval }),
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
          window.location.href = "/login"
          return
        }
        throw new Error(json.error?.message ?? "Checkout is not available.")
      }

      window.location.href = json.data.checkoutUrl
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Checkout is not available.")
    } finally {
      setLoading(false)
    }
  }

  const buttonLabel = label ?? (interval === "yearly" ? "Upgrade Yearly" : "Upgrade to Starter")

  return (
    <div className={className}>
      <Button className="w-full" variant={variant} onClick={startCheckout} disabled={loading}>
        {loading ? "Opening..." : buttonLabel}
      </Button>
      {message && <p className="text-xs text-on-surface-variant mt-2">{message}</p>}
    </div>
  )
}
