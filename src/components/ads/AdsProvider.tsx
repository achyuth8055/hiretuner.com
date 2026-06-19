"use client"

import Script from "next/script"
import { createContext, useContext, useEffect, useState } from "react"
import { ADSENSE_CLIENT_ID, ADSENSE_ENABLED, isAdFree } from "@/lib/ads"
import { useConsent } from "@/components/consent/useConsent"
import type { Subscription } from "@/lib/rolefit-types"

type AdsContextValue = {
  /** True when ads are configured AND the current viewer is not ad-free. */
  adsEnabled: boolean
  /** True once the viewer's subscription state has been resolved. */
  resolved: boolean
}

const AdsContext = createContext<AdsContextValue>({ adsEnabled: false, resolved: false })

export function useAds() {
  return useContext(AdsContext)
}

/**
 * Resolves whether the current viewer should see ads (anonymous + free + monthly)
 * or get an ad-free experience (yearly / plus), then loads the AdSense library
 * only for ad-supported viewers. Wrap marketing content with this provider.
 */
export function AdsProvider({ children }: { children: React.ReactNode }) {
  const { consent, ready: consentReady } = useConsent()
  // null until the subscription check completes; true/false once it resolves.
  const [subscriptionAdFree, setSubscriptionAdFree] = useState<boolean | null>(null)

  // Only look up the viewer's subscription once ads are configured AND the
  // viewer has explicitly accepted cookies. Until then no AdSense script loads.
  const shouldCheckSubscription = ADSENSE_ENABLED && consentReady && consent === "accepted"

  useEffect(() => {
    if (!shouldCheckSubscription) return

    let active = true

    fetch("/api/auth/me", { credentials: "include" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!active) return
        const subscription = payload?.data?.subscription as Subscription | null | undefined
        setSubscriptionAdFree(isAdFree(subscription))
      })
      .catch(() => {
        if (active) setSubscriptionAdFree(false)
      })

    return () => {
      active = false
    }
  }, [shouldCheckSubscription])

  // Resolved synchronously in every case except while the subscription check
  // is in flight, so AdSlots never flash before we know the viewer's state.
  const resolved = !shouldCheckSubscription || subscriptionAdFree !== null
  const adsEnabled = shouldCheckSubscription && subscriptionAdFree === false

  return (
    <AdsContext.Provider value={{ adsEnabled, resolved }}>
      {/* Load the AdSense library only after we confirm the viewer is ad-supported. */}
      {resolved && adsEnabled ? (
        <Script
          id="adsbygoogle-init"
          strategy="afterInteractive"
          async
          crossOrigin="anonymous"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
        />
      ) : null}
      {children}
    </AdsContext.Provider>
  )
}
