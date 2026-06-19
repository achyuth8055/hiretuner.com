import "server-only"

import { createHmac, timingSafeEqual } from "node:crypto"

/**
 * Short-lived HMAC signatures for download URLs (AUTH-M8).
 *
 * Pattern: the caller (an authenticated route) embeds `?sig=<hex>&exp=<ms>` in
 * the URL it returns to the client. The download route then verifies the
 * signature without re-reading the user session — meaning the link can be
 * passed to a non-cookie-bearing context (e.g. `<a download>` opened in a new
 * window, a one-shot fetch) without leaking session credentials, and the
 * link expires.
 *
 * Threats mitigated:
 *  - Browser history leak: an old link in history rejects after ~10 min.
 *  - Sharing leak: a copied link rejects after ~10 min.
 *  - Cookie compromise: the signature key is the same `AUTH_SECRET` and the
 *    download route still requires the cookie auth as a SECOND check — see
 *    /api/tailored-resumes/[id]/download. Both must agree.
 */

const DEFAULT_TTL_MS = 10 * 60 * 1000

function getSecret() {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET is required for download signatures.")
  }
  return secret
}

function payload(scope: string, resourceId: string, userId: string, expiresAt: number) {
  return `${scope}:${resourceId}:${userId}:${expiresAt}`
}

export function signDownloadUrl(scope: string, resourceId: string, userId: string, ttlMs = DEFAULT_TTL_MS) {
  const expiresAt = Date.now() + ttlMs
  const sig = createHmac("sha256", getSecret())
    .update(payload(scope, resourceId, userId, expiresAt))
    .digest("hex")
  return { sig, expiresAt }
}

/**
 * Verifies the signature against the configured AUTH_SECRET. Returns true
 * only when the signature is valid AND the expiry is still in the future.
 */
export function verifyDownloadSignature(input: {
  scope: string
  resourceId: string
  userId: string
  expiresAt: number
  signature: string
}): boolean {
  if (!Number.isFinite(input.expiresAt) || input.expiresAt < Date.now()) return false
  const expected = createHmac("sha256", getSecret())
    .update(payload(input.scope, input.resourceId, input.userId, input.expiresAt))
    .digest("hex")
  try {
    const a = Buffer.from(input.signature, "hex")
    const b = Buffer.from(expected, "hex")
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}
