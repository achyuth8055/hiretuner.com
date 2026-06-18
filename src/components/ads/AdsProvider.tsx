"use client"

import Script from "next/script"
import { createContext, useContext, useEffect, useState } from "react"
import { ADSENSE_CLIENT_ID, ADSENSE_ENABLED, isAdFree } from "@/lib/ads"
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
  const [adFree, setAdFree] = useState(false)
  // When ads are unconfigured we are already "resolved" (nothing to fetch).
  const [resolved, setResolved] = useState(!ADSENSE_ENABLED)

  useEffect(() => {
    // No client id => ads are off entirely; skip the network call.
    if (!ADSENSE_ENABLED) return

    let active = true

    fetch("/api/auth/me", { credentials: "include" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!active) return
        const subscription = payload?.data?.subscription as Subscription | null | undefined
        setAdFree(isAdFree(subscription))
        setResolved(true)
      })
      .catch(() => {
        if (active) setResolved(true)
      })

    return () => {
      active = false
    }
  }, [])

  const adsEnabled = ADSENSE_ENABLED && !adFree

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
