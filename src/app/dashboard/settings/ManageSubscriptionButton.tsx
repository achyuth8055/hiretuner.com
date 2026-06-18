"use client"

import { useState } from "react"

export function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function openPortal() {
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/billing/portal", { method: "POST" })
      const json = (await response.json()) as {
        ok?: boolean
        data?: { portalUrl?: string }
        error?: { message?: string }
      }
      if (!response.ok || !json.ok || !json.data?.portalUrl) {
        throw new Error(json.error?.message ?? "Unable to open the billing portal.")
      }
      window.location.href = json.data.portalUrl
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
      setLoading(false)
    }
  }

  return (
    <div className="text-right">
      <button
        onClick={openPortal}
        disabled={loading}
        className="bg-secondary text-on-secondary px-4 py-2 rounded-full font-body-sm text-body-sm hover:bg-secondary/90 transition-colors disabled:opacity-50"
      >
        {loading ? "Opening…" : "Manage subscription"}
      </button>
      {error && <div className="text-xs text-error mt-1">{error}</div>}
    </div>
  )
}
