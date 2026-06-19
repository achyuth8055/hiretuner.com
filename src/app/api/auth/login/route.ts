import { authenticateEmailPassword, createSessionForUser, validateEmail } from "@/lib/auth"
import { csrfCheck } from "@/lib/csrf"
import { getSubscriptionForUser, upsertUsageForUser } from "@/lib/database"
import { jsonError, jsonOk, readJson } from "@/lib/http"
import { logger } from "@/lib/logger"
import { ipFromRequest, rateLimit, rateLimitedResponse } from "@/lib/rate-limit"

export const runtime = "nodejs"

// Brute-force defense. The IP bucket stops a single attacker; the email
// bucket stops a distributed attack against one account. Either trip ⇒ 429.
const LOGIN_PER_IP_LIMIT = 30 // generous for shared-NAT IPs
const LOGIN_PER_IP_WINDOW_SEC = 15 * 60
const LOGIN_PER_EMAIL_LIMIT = 5
const LOGIN_PER_EMAIL_WINDOW_SEC = 15 * 60

type LoginBody = {
  email?: string
  password?: string
}

export async function POST(request: Request) {
  // Block login-CSRF: an attacker forcing the victim's browser into the
  // attacker's account would gate any later "link card" / "save resume"
  // actions to the attacker's user record.
  const csrfFail = csrfCheck(request)
  if (csrfFail) return csrfFail

  const ip = ipFromRequest(request)
  const body = await readJson<LoginBody>(request)
  const email = body?.email?.trim().toLowerCase() ?? ""
  const password = body?.password ?? ""

  if (!validateEmail(email) || !password) {
    return jsonError("Enter your email and password.", 422, "validation_error")
  }

  // Per-IP gate first — protects against an attacker spraying email lists.
  const ipGate = rateLimit(`login:ip:${ip}`, LOGIN_PER_IP_LIMIT, LOGIN_PER_IP_WINDOW_SEC)
  if (!ipGate.ok) {
    logger.warn("api.auth.login", "Login rate limit hit (per IP)", { ip })
    return rateLimitedResponse(ipGate, "Too many login attempts. Try again in a few minutes.")
  }
  // Per-account gate second — protects a specific user from distributed
  // brute force on their password.
  const acctGate = rateLimit(`login:acct:${email}`, LOGIN_PER_EMAIL_LIMIT, LOGIN_PER_EMAIL_WINDOW_SEC)
  if (!acctGate.ok) {
    logger.warn("api.auth.login", "Login rate limit hit (per account)", { ip, email })
    return rateLimitedResponse(acctGate, "Too many login attempts on this account. Try again in a few minutes.")
  }

  const user = await authenticateEmailPassword(email, password)
  if (!user) {
    // Failed-login audit log (AUTH-M6). Useful for detecting attacks even
    // before we run them through a SIEM.
    logger.warn("api.auth.login", "Failed login attempt", {
      email,
      ip,
      userAgent: request.headers.get("user-agent")?.slice(0, 200) ?? "",
    })
    return jsonError("Invalid email or password.", 401, "invalid_credentials")
  }

  await createSessionForUser(user.id, {
    userAgent: request.headers.get("user-agent"),
    ip,
  })
  const subscription = getSubscriptionForUser(user.id)
  const usage = upsertUsageForUser(user.id)

  return jsonOk({
    user: { id: user.id, name: user.name, email: user.email },
    subscription,
    usage,
  })
}
