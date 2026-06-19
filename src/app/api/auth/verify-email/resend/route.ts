import { getCurrentUser } from "@/lib/auth"
import { csrfCheck } from "@/lib/csrf"
import { issueVerificationEmail } from "@/lib/email-verification"
import { jsonError, jsonOk } from "@/lib/http"
import { ipFromRequest, rateLimit, rateLimitedResponse } from "@/lib/rate-limit"

export const runtime = "nodejs"

const RESEND_PER_IP_LIMIT = 5
const RESEND_PER_IP_WINDOW_SEC = 60 * 60

export async function POST(request: Request) {
  const csrfFail = csrfCheck(request)
  if (csrfFail) return csrfFail

  const ip = ipFromRequest(request)
  const gate = rateLimit(`verify-resend:${ip}`, RESEND_PER_IP_LIMIT, RESEND_PER_IP_WINDOW_SEC)
  if (!gate.ok) return rateLimitedResponse(gate, "Too many resend requests. Try again later.")

  const auth = await getCurrentUser()
  if (!auth) return jsonError("Authentication is required.", 401, "unauthorized")

  // Already verified — nothing to do, no leakage either.
  if (auth.user.emailVerifiedAt) {
    return jsonOk({ alreadyVerified: true })
  }

  issueVerificationEmail(auth.user.id, auth.user.email, auth.user.name)
  return jsonOk({ resent: true })
}
