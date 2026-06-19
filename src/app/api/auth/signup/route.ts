import { createSessionRecord, createUserRecord, hashPassword, setSessionCookie, validateEmail, validatePassword } from "@/lib/auth"
import { csrfCheck } from "@/lib/csrf"
import { findUserByEmail, insertUser, upsertUsageForUser } from "@/lib/database"
import { issueVerificationEmail } from "@/lib/email-verification"
import { jsonError, jsonOk, readJson } from "@/lib/http"
import { logger } from "@/lib/logger"
import { ipFromRequest, rateLimit, rateLimitedResponse } from "@/lib/rate-limit"

// Stop drive-by signup spam. 10 signups per IP per hour is generous for
// shared-NAT corporate offices, draconian for a single attacker scripting
// account creation.
const SIGNUP_PER_IP_LIMIT = 10
const SIGNUP_PER_IP_WINDOW_SEC = 60 * 60

export const runtime = "nodejs"

type SignupBody = {
  name?: string
  email?: string
  password?: string
}

export async function POST(request: Request) {
  const csrfFail = csrfCheck(request)
  if (csrfFail) return csrfFail

  const ip = ipFromRequest(request)
  const gate = rateLimit(`signup:${ip}`, SIGNUP_PER_IP_LIMIT, SIGNUP_PER_IP_WINDOW_SEC)
  if (!gate.ok) {
    logger.warn("api.auth.signup", "Signup rate limit hit", { ip })
    return rateLimitedResponse(gate, "Too many signups from this address. Please try again later.")
  }

  const body = await readJson<SignupBody>(request)
  const name = body?.name?.trim() ?? ""
  const email = body?.email?.trim().toLowerCase() ?? ""
  const password = body?.password ?? ""

  if (name.length < 2) return jsonError("Name must be at least 2 characters.", 422, "validation_error")
  if (!validateEmail(email)) return jsonError("Enter a valid email address.", 422, "validation_error")

  const passwordErrors = validatePassword(password)
  if (passwordErrors.length > 0) {
    return jsonError("Password does not meet requirements.", 422, "validation_error", passwordErrors)
  }

  // Don't leak which emails are registered: respond identically whether or
  // not the email is taken. When taken, no session is minted; a future email
  // verification flow can notify the real owner. (Audit AUTH C4.)
  if (findUserByEmail(email)) {
    return jsonOk({ pendingVerification: true })
  }

  const passwordHash = await hashPassword(password)
  const { user, subscription } = createUserRecord({ name, email, passwordHash })
  const session = createSessionRecord(user.id)

  insertUser(user, subscription, session)
  upsertUsageForUser(user.id)
  await setSessionCookie(session)

  // Fire-and-forget verification email. Free-tier features remain accessible
  // immediately; paid checkout will gate on `emailVerifiedAt`.
  issueVerificationEmail(user.id, user.email, user.name)
  logger.info("api.auth.signup", "Signup ok, verification email queued", { userId: user.id })

  return jsonOk({
    user: { id: user.id, name: user.name, email: user.email },
    subscription,
    pendingVerification: false,
    emailVerificationPending: true,
  })
}
