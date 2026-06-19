import "server-only"

import type { NextRequest } from "next/server"
import { jsonError } from "@/lib/http"
import { logger } from "@/lib/logger"

/**
 * CSRF defense using browser-issued `Sec-Fetch-Site` plus Origin allowlist.
 *
 * Strategy (no token round-trip required — works with no client changes):
 *  1. Requests bearing `Authorization: Bearer <token>` are NOT considered
 *     CSRF-exposed: the browser never sets that header automatically, so an
 *     attacker cannot forge it from a victim's session. Stripe webhooks use
 *     their own signature; we exempt the webhook path explicitly.
 *  2. Safe HTTP methods (GET, HEAD, OPTIONS) are always allowed.
 *  3. For state-changing methods (POST, PUT, PATCH, DELETE):
 *     • Allow if `Sec-Fetch-Site` is `same-origin` or `same-site` (every
 *       modern browser sets this).
 *     • Allow if `Origin` matches the configured app URL.
 *     • Otherwise reject 403.
 *
 * This is the "defense" half of the SameSite=Lax cookie protection — they
 * stack. SameSite=Lax already blocks cross-site POSTs from being able to
 * include our session cookie. This check additionally rejects any cross-site
 * state-changing call before the route handler sees it, so even if a future
 * cookie change weakens SameSite, the API is still safe.
 *
 * Routes that legitimately need cross-origin access (extension's Bearer flow,
 * Stripe webhook, telemetry beacon) opt out via `EXEMPT_PATHS` below.
 */

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"])

// Paths that legitimately receive cross-origin POSTs from non-browser callers.
const EXEMPT_PATHS = [
  "/api/billing/webhook",     // Stripe (signature-verified)
  "/api/telemetry",           // Anonymous beacon (rate-limited; no auth side effects)
  "/api/auth/firebase",       // Extension bridge exchange (Bearer-token verified)
  "/api/auth/firebase/refresh", // Extension token refresh (Bearer-token verified)
]

function allowedOrigins() {
  const configured = (process.env.NEXT_PUBLIC_APP_URL ?? "https://hiretuner.com").replace(/\/$/, "")
  // Allow the configured origin and (in dev) localhost variants.
  const set = new Set<string>([configured])
  if (process.env.NODE_ENV !== "production") {
    set.add("http://localhost:3000")
    set.add("http://localhost:3055")
  }
  return set
}

function isExemptPath(pathname: string) {
  return EXEMPT_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

/**
 * Returns null when the request passes the CSRF gate. Returns a Response
 * (403) when it should be rejected.
 */
export function csrfCheck(request: NextRequest | Request): Response | null {
  const method = request.method.toUpperCase()
  if (SAFE_METHODS.has(method)) return null

  // Bearer-token requests are not CSRF-exposed.
  const authHeader = request.headers.get("authorization") ?? ""
  if (authHeader.startsWith("Bearer ")) return null

  let pathname = ""
  try {
    pathname = new URL(request.url).pathname
  } catch {
    /* invalid URL — fall through to reject */
  }
  if (pathname && isExemptPath(pathname)) return null

  // Same-site fast path via Sec-Fetch-Site.
  const fetchSite = request.headers.get("sec-fetch-site")
  if (fetchSite === "same-origin" || fetchSite === "same-site") return null

  // Origin allowlist as a backstop for browsers that don't send Sec-Fetch-Site
  // (very rare in 2026 — covers older Safari, some embedded WebViews).
  const origin = (request.headers.get("origin") ?? "").replace(/\/$/, "")
  if (origin && allowedOrigins().has(origin)) return null

  // No positive proof of same-origin → reject. We do this BEFORE auth so a
  // cross-site forgery never even reads the user's session.
  logger.warn("lib.csrf", "Rejected cross-site state-changing request", {
    method,
    pathname,
    fetchSite: fetchSite ?? "",
    origin: origin ?? "",
  })
  return jsonError(
    "Cross-site request rejected.",
    403,
    "csrf_rejected",
    { hint: "If you are calling the API from a browser extension, include an Authorization: Bearer header." },
  )
}
