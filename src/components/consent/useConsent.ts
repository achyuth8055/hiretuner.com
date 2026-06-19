"use client"

import { useSyncExternalStore } from "react"

export type ConsentState = "unset" | "accepted" | "declined"

const COOKIE_NAME = "ht_cookie_consent"
// Re-prompt after ~6 months, matching the cookie-policy retention statement.
const COOKIE_MAX_AGE = 60 * 60 * 24 * 180

/**
 * Cookie-consent state, backed by a module-level external store so the banner
 * and the ad layer always read the same value without a wrapping provider.
 * AdSense (and any other non-essential script) must stay dormant until the
 * viewer explicitly accepts — see AdsProvider.
 */
const listeners = new Set<() => void>()

function readConsentCookie(): ConsentState {
  if (typeof document === "undefined") return "unset"
  const match = document.cookie.match(/(?:^|;\s*)ht_cookie_consent=(accepted|declined)/)
  return (match?.[1] as ConsentState) ?? "unset"
}

function subscribe(callback: () => void) {
  listeners.add(callback)
  return () => {
    listeners.delete(callback)
  }
}

function setConsent(value: "accepted" | "declined") {
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`
  listeners.forEach((listener) => listener())
}

// `false` during SSR and the first client render, then `true` — lets the banner
// avoid a hydration flash without a setState-in-effect.
const subscribeNoop = () => () => {}

export function useConsent() {
  const consent = useSyncExternalStore(subscribe, readConsentCookie, () => "unset" as ConsentState)
  const ready = useSyncExternalStore(subscribeNoop, () => true, () => false)

  return {
    consent,
    ready,
    accept: () => setConsent("accepted"),
    decline: () => setConsent("declined"),
  }
}
