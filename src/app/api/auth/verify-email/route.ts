import { csrfCheck } from "@/lib/csrf"
import { consumeVerificationToken } from "@/lib/email-verification"
import { jsonError, jsonOk, readJson } from "@/lib/http"
import { logger } from "@/lib/logger"
import { ipFromRequest, rateLimit, rateLimitedResponse } from "@/lib/rate-limit"

export const runtime = "nodejs"

// Aggressive cap — token submission is rare per legitimate user but useful
// for brute-force of the 256-bit token space (which is computationally
// infeasible already, but rate limiting closes side channels just in case).
const VERIFY_PER_IP_LIMIT = 20
const VERIFY_PER_IP_WINDOW_SEC = 60 * 60

type ConfirmBody = {
  token?: string
}

export async function POST(request: Request) {
  const csrfFail = csrfCheck(request)
  if (csrfFail) return csrfFail

  const ip = ipFromRequest(request)
  const gate = rateLimit(`verify:${ip}`, VERIFY_PER_IP_LIMIT, VERIFY_PER_IP_WINDOW_SEC)
  if (!gate.ok) return rateLimitedResponse(gate, "Too many verification attempts.")

  const body = await readJson<ConfirmBody>(request)
  const token = body?.token?.trim() ?? ""
  if (!token) {
    return jsonError("Verification token is required.", 422, "validation_error")
  }

  const result = consumeVerificationToken(token)
  if (!result.ok) {
    return jsonError(
      "Verification link is invalid or expired. Request a fresh one from your account settings.",
      400,
      "invalid_verification_token",
    )
  }

  logger.info("api.auth.verify-email", "Email verified", { userId: result.userId })
  return jsonOk({ verified: true })
}
