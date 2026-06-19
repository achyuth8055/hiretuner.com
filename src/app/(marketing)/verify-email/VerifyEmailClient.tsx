"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"

type Phase = "verifying" | "success" | "error"

export function VerifyEmailClient({ token }: { token: string }) {
  const [phase, setPhase] = useState<Phase>("verifying")
  const [message, setMessage] = useState("")
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    void (async () => {
      try {
        const response = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        })
        const json = (await response.json().catch(() => ({}))) as {
          ok?: boolean
          error?: { message?: string }
        }
        if (response.ok && json.ok) {
          setPhase("success")
          setMessage("Email verified. You can now upgrade to a paid plan.")
        } else {
          setPhase("error")
          setMessage(json.error?.message ?? "Verification link is invalid or expired.")
        }
      } catch {
        setPhase("error")
        setMessage("Verification request failed. Please try again.")
      }
    })()
  }, [token])

  if (phase === "verifying") {
    return (
      <p className="font-body-sm text-body-sm text-on-surface-variant">
        Verifying your email…
      </p>
    )
  }
  if (phase === "success") {
    return (
      <div>
        <p className="font-body-sm text-body-sm text-primary mb-stack-md">{message}</p>
        <Link
          href="/dashboard"
          className="inline-block bg-primary text-on-primary px-4 py-2 rounded font-body-sm text-body-sm"
        >
          Go to dashboard
        </Link>
      </div>
    )
  }
  return (
    <div>
      <p className="font-body-sm text-body-sm text-error mb-stack-md">{message}</p>
      <Link
        href="/dashboard/settings"
        className="inline-block bg-primary text-on-primary px-4 py-2 rounded font-body-sm text-body-sm"
      >
        Request a new link
      </Link>
    </div>
  )
}
