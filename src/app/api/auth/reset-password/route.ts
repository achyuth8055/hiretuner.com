import { createHash, randomBytes } from "node:crypto"
import { csrfCheck } from "@/lib/csrf"
import { findUserByEmail, updateDatabase, createId, nowIso } from "@/lib/database"
import { sendPasswordResetEmail } from "@/lib/email"
import { jsonOk, readJson } from "@/lib/http"
import { logger } from "@/lib/logger"
import { ipFromRequest, rateLimit, rateLimitedResponse } from "@/lib/rate-limit"

export const runtime = "nodejs"

// Reset attempts are rare per legitimate user; cap them aggressively so an
// attacker can't enumerate accounts via timing or burn through token storage.
const RESET_PER_IP_LIMIT = 5
const RESET_PER_IP_WINDOW_SEC = 60 * 60

type ResetBody = {
  email?: string
}

export async function POST(request: Request) {
  const csrfFail = csrfCheck(request)
  if (csrfFail) return csrfFail

  const ip = ipFromRequest(request)
  const gate = rateLimit(`reset:${ip}`, RESET_PER_IP_LIMIT, RESET_PER_IP_WINDOW_SEC)
  if (!gate.ok) {
    logger.warn("api.auth.reset-password", "Reset rate limit hit", { ip })
    return rateLimitedResponse(gate, "Too many reset requests. Try again later.")
  }

  const body = await readJson<ResetBody>(request)
  const email = body?.email?.trim().toLowerCase() ?? ""
  const user = email ? findUserByEmail(email) : null
  let devResetToken: string | undefined

  if (user) {
    const token = randomBytes(32).toString("base64url")
    devResetToken = token
    const tokenHash = createHash("sha256").update(token).digest("hex")
    const timestamp = nowIso()

    updateDatabase((database) => {
      database.passwordResetTokens.push({
        id: createId(),
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
        usedAt: null,
        createdAt: timestamp,
      })
    })

    // Fire the email. Send happens after the token is stored so even a
    // network-flake email delivery doesn't leave the user without a valid
    // token. We don't surface the send result to the client — same generic
    // response either way (privacy: don't reveal whether email exists).
    void sendPasswordResetEmail(user.email, token).then((result) => {
      if (!result.ok) {
        logger.warn("api.auth.reset-password", "Reset email did not send", {
          userId: user.id,
          reason: result.error ?? "unknown",
        })
      } else {
        logger.info("api.auth.reset-password", "Reset email queued", { userId: user.id })
      }
    })
  }

  // Gate dev token echo behind an explicit opt-in env. Previously we echoed
  // whenever NODE_ENV !== "production" — that leaks the token on every
  // staging/preview environment. (AUTH-L1.)
  const allowDevEcho = process.env.HIRETUNER_DEV_RESET === "1"

  return jsonOk({
    message:
      "If an account exists for that email, password reset instructions will be emailed within a few minutes.",
    resetToken: allowDevEcho ? devResetToken : undefined,
  })
}
