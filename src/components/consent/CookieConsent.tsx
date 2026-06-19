"use client"

import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { useConsent } from "./useConsent"

/**
 * Bottom-anchored cookie consent banner. Shows once, only until the viewer
 * makes a choice. Accepting unlocks the AdSense / analytics layer (see
 * AdsProvider); declining keeps non-essential cookies off. Essential cookies
 * (auth, the consent choice itself) are always allowed.
 */
export function CookieConsent() {
  const { consent, ready, accept, decline } = useConsent()

  // Stay hidden until we've read the stored choice, and once a choice exists.
  if (!ready || consent !== "unset") return null

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-50 px-stack-md pb-stack-md"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-stack-sm rounded-xl border border-outline-variant/40 bg-surface-container-lowest/95 p-stack-md shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          We use cookies to keep you signed in and, with your consent, to show
          ads that support this free tool. See our{" "}
          <Link
            href="/cookie-policy"
            className="text-secondary underline-offset-4 hover:underline"
          >
            Cookie Policy
          </Link>
          .
        </p>
        <div className="flex flex-shrink-0 gap-stack-sm">
          <Button variant="outline" size="sm" onClick={decline}>
            Decline
          </Button>
          <Button variant="default" size="sm" onClick={accept}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  )
}
