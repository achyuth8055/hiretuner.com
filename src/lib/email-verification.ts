import "server-only"

import { createHash, randomBytes } from "node:crypto"
import { createId, nowIso, updateDatabase } from "@/lib/database"
import { sendVerificationEmail } from "@/lib/email"
import { logger } from "@/lib/logger"

// 48-hour expiry on verification tokens.
const VERIFICATION_TTL_MS = 1000 * 60 * 60 * 48

/**
 * Mint a verification token, store its sha256 hash, and email the user the
 * raw token via a /verify-email?token=... link. Fire-and-forget: callers do
 * not await the email send so a slow SMTP doesn't stall signup.
 */
export function issueVerificationEmail(userId: string, email: string, name: string) {
  const token = randomBytes(32).toString("base64url")
  const tokenHash = createHash("sha256").update(token).digest("hex")
  const timestamp = nowIso()

  updateDatabase((database) => {
    if (!database.emailVerificationTokens) database.emailVerificationTokens = []
    // Invalidate any older outstanding token for this user.
    database.emailVerificationTokens = database.emailVerificationTokens.filter(
      (item) => item.userId !== userId || item.usedAt !== null,
    )
    database.emailVerificationTokens.push({
      id: createId(),
      userId,
      email,
      tokenHash,
      expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS).toISOString(),
      usedAt: null,
      createdAt: timestamp,
    })
  })

  void sendVerificationEmail(email, name, token).then((result) => {
    if (!result.ok) {
      logger.warn("lib.email-verification", "Verification email did not send", {
        userId,
        reason: result.error,
      })
    }
  })
}

/**
 * Mark a user's email as verified at signup time when the auth provider
 * already verified it (Google sign-in). Bypass the email round-trip.
 */
export function markEmailVerifiedNow(userId: string) {
  updateDatabase((database) => {
    const user = database.users.find((item) => item.id === userId)
    if (!user || user.emailVerifiedAt) return
    user.emailVerifiedAt = nowIso()
    user.updatedAt = nowIso()
  })
}

/**
 * Consume a verification token (sha256 hash lookup, single-use, TTL-bounded).
 * Returns true on success, false on missing/expired/already-used token.
 */
export function consumeVerificationToken(rawToken: string): { ok: boolean; userId?: string } {
  const tokenHash = createHash("sha256").update(rawToken).digest("hex")
  return updateDatabase((database) => {
    const tokens = database.emailVerificationTokens ?? []
    const record = tokens.find(
      (item) =>
        item.tokenHash === tokenHash &&
        !item.usedAt &&
        new Date(item.expiresAt).getTime() > Date.now(),
    )
    if (!record) return { ok: false as const }
    const user = database.users.find((item) => item.id === record.userId)
    if (!user) return { ok: false as const }
    record.usedAt = nowIso()
    user.emailVerifiedAt = nowIso()
    user.updatedAt = nowIso()
    return { ok: true as const, userId: user.id }
  })
}

/**
 * For routes that gate paid features behind verification. Legacy users
 * (created before this field existed) are treated as verified — we only
 * enforce on accounts created after the feature shipped.
 */
export function isEmailVerified(user: {
  emailVerifiedAt?: string | null
  createdAt: string
}): boolean {
  if (user.emailVerifiedAt) return true
  // Cut-off: anyone created before Sprint 3 ships is grandfathered.
  const ENFORCEMENT_AFTER = new Date("2026-06-19T00:00:00Z").getTime()
  return new Date(user.createdAt).getTime() < ENFORCEMENT_AFTER
}
