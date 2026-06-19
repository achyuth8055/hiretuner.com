"use client"

import { useEffect, useRef } from "react"
import { ADSENSE_CLIENT_ID, AD_SLOTS, type AdSlotName } from "@/lib/ads"
import { useAds } from "./AdsProvider"
import { cn } from "@/lib/utils"

type AdSlotProps = {
  /** Named slot from AD_SLOTS (preferred) or a raw AdSense slot id. */
  slot: AdSlotName | string
  /** AdSense ad format. "auto" responds to the container width. */
  format?: "auto" | "fluid" | "rectangle" | "horizontal" | "vertical"
  /** Show the small "Advertisement" label required for clear ad disclosure. */
  label?: boolean
  className?: string
}

declare global {
  interface Window {
    adsbygoogle?: unknown[]
  }
}

/**
 * A single responsive AdSense unit. Renders nothing until the viewer is
 * confirmed ad-supported, so yearly/plus subscribers and unconfigured
 * environments never see an ad placeholder (avoids layout shift + policy risk).
 */
export function AdSlot({ slot, format = "auto", label = true, className }: AdSlotProps) {
  const { adsEnabled, resolved } = useAds()
  const pushed = useRef(false)

  const adSlot = slot in AD_SLOTS ? AD_SLOTS[slot as AdSlotName] : slot

  useEffect(() => {
    if (!resolved || !adsEnabled || !adSlot || pushed.current) return
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
      pushed.current = true
    } catch {
      // adsbygoogle not ready yet; it will retry on next mount.
    }
  }, [resolved, adsEnabled, adSlot])

  // Render nothing until a real slot id is configured, so the site never shows
  // an empty "Advertisement" placeholder while a unit is unset or pending.
  if (!resolved || !adsEnabled || !ADSENSE_CLIENT_ID || !adSlot) return null

  return (
    <aside
      aria-label="Advertisement"
      className={cn("my-stack-lg w-full flex flex-col items-center text-center", className)}
    >
      {label ? (
        <span className="font-label-uppercase text-label-uppercase text-on-surface-variant/60 mb-1 tracking-widest text-[10px]">
          Advertisement
        </span>
      ) : null}
      <ins
        className="adsbygoogle block w-full"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={adSlot || undefined}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </aside>
  )
}
