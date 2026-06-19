"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"

/**
 * Opens the Stripe Customer Portal so paid users can update payment method,
 * change plan, view invoices, or cancel. Single click → redirected.
 */
export function ManageBillingButton({ className }: { className?: string }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  async function openPortal() {
    setLoading(true)
    setMessage("")
    try {
      const response = await fetch("/api/billing/portal", { method: "POST" })
      const json = (await response.json()) as {
        ok?: boolean
        data?: { portalUrl?: string }
        error?: { message?: string }
      }
      if (!response.ok || !json.ok || !json.data?.portalUrl) {
        throw new Error(json.error?.message ?? "Couldn't open billing portal.")
      }
      window.location.assign(json.data.portalUrl)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Couldn't open billing portal.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={className}>
      <Button className="w-full" variant="outline" onClick={openPortal} disabled={loading}>
        {loading ? "Opening…" : "Manage billing"}
      </Button>
      {message && <p className="text-xs text-on-surface-variant mt-2">{message}</p>}
    </div>
  )
}
