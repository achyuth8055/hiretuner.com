import "server-only"

import type { NextRequest } from "next/server"
import { logger } from "@/lib/logger"

/**
 * Minimal in-process rate limiter.
 *
 * Works for a single Railway instance, no external dependencies. When you
 * scale to multiple instances OR a multi-region edge runtime, migrate this to
 * Upstash Redis (see LAUNCH_ROADMAP.md Phase 3) — the surface (rateLimit / ipFromRequest)
 * is intentionally stable so the swap is mechanical.
 *
 * Buckets are stored in a Map keyed by `${kind}:${identifier}`. Each bucket
 * holds a hit count + an absolute reset timestamp. When the bucket expires we
 * recreate it; we also opportunistically prune ~1% of expired buckets per
 * lookup so the Map doesn't grow without bound.
 */

type Bucket = { hits: number; resetAt: number }
const store = new Map<string, Bucket>()

let lastPruneAt = 0
const PRUNE_INTERVAL_MS = 60_000

function maybePrune(now: number) {
  if (now - lastPruneAt < PRUNE_INTERVAL_MS) return
  lastPruneAt = now
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key)
  }
}

export type RateLimitResult =
  | { ok: true; remaining: number; resetAt: number }
  | { ok: false; remaining: 0; retryAfterSeconds: number; resetAt: number }

/**
 * @param key  A stable identifier — `tool:1.2.3.4`, `login:1.2.3.4:user@x.com`, etc.
 * @param limit  Max hits within the window.
 * @param windowSeconds  How long the window is.
 */
export function rateLimit(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now()
  maybePrune(now)

  const bucket = store.get(key)
  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + windowSeconds * 1000
    store.set(key, { hits: 1, resetAt })
    return { ok: true, remaining: limit - 1, resetAt }
  }

  bucket.hits += 1
  if (bucket.hits > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
      resetAt: bucket.resetAt,
    }
  }
  return { ok: true, remaining: Math.max(0, limit - bucket.hits), resetAt: bucket.resetAt }
}

/**
 * Read the client IP from forwarding headers Railway/Cloudflare set.
 * Falls back to `"unknown"` so rate limiting still applies under tests.
 */
export function ipFromRequest(request: NextRequest | Request): string {
  const xff = request.headers.get("x-forwarded-for")
  if (xff) return xff.split(",")[0].trim()
  const cfIp = request.headers.get("cf-connecting-ip")
  if (cfIp) return cfIp.trim()
  const xRealIp = request.headers.get("x-real-ip")
  if (xRealIp) return xRealIp.trim()
  return "unknown"
}

/**
 * Build a JSON 429 response with `Retry-After` set. Use this from any route
 * handler that wants to surface a rate-limit hit consistently.
 */
export function rateLimitedResponse(
  result: Extract<RateLimitResult, { ok: false }>,
  message = "Too many requests. Please try again later.",
) {
  return Response.json(
    {
      ok: false,
      error: {
        code: "rate_limited",
        message,
        details: { retryAfterSeconds: result.retryAfterSeconds },
      },
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
      },
    },
  )
}

/**
 * Helper used by the test suite and dev tools to reset bucket state.
 * Not exported to production callers.
 */
export function __resetRateLimitForTests() {
  store.clear()
  lastPruneAt = 0
}

// Tiny startup log so an operator can see this limiter is active.
logger.info("lib.rate-limit", "In-memory rate limiter initialized")
