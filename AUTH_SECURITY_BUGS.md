# HireTuner — Auth / Billing / Security Bugs

**Companion to:** `AUTH_SECURITY_AUDIT.md`
**Date:** 2026-06-18
**Source commit:** `2e75c4f` on `main`

Each entry: severity, location, repro, expected, actual, recommended fix. Severity scale is in the audit doc.

---

## C1 — Default `AUTH_SECRET` fallback in source code

**Severity:** Critical
**Location:** `src/lib/auth.ts:22-24`
```ts
function getAuthSecret() {
  return process.env.AUTH_SECRET || "replace-me-with-a-long-random-auth-secret"
}
```

**Reproduction.** Unset `AUTH_SECRET` in any environment (intentionally or via Railway misconfiguration). Sign a session ID with the public default string. Send that cookie to the server. The server's HMAC verification will accept it.
```js
// Forged cookie value for any session ID, when AUTH_SECRET is unset:
const sessionId = "some-existing-session-id-from-the-db"; // could be any id
const sig = require("crypto").createHmac("sha256", "replace-me-with-a-long-random-auth-secret").update(sessionId).digest("base64url")
const cookieValue = `${sessionId}.${sig}`
// Set Cookie: rolefit_session=${cookieValue}; → server accepts.
```

**Expected.** Application refuses to start if `AUTH_SECRET` is unset, missing, or matches the obvious placeholder string. Throw a fatal error during module init.

**Actual.** App quietly runs with a publicly-known HMAC secret. Any attacker who can read the open-source repo (or simply guess the obvious default) can forge session cookies for any session ID — total account takeover for any account with a known session ID in the JSON store.

**Recommended fix.**
```ts
function getAuthSecret() {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 32 || secret.includes("replace")) {
    throw new Error("AUTH_SECRET must be set to a 32+ char random value (no placeholder).")
  }
  return secret
}
```
Call `getAuthSecret()` once at module top-level so a misconfigured deploy fails fast at boot.

---

## C2 — Anonymous `/api/tools/*` calls bypass rate limiting entirely

**Severity:** Critical
**Location:** `src/lib/public-tool-storage.ts:28-48` (`enforceToolUsage`), `src/app/api/tools/ats-score/route.ts` (and 7 sibling routes)

**Reproduction.** Without any authentication header or cookie, hit:
```bash
for i in {1..1000}; do
  curl -s -X POST https://hiretuner.com/api/tools/ats-score \
    -H 'Content-Type: application/json' \
    -d '{"resumeText":"'"$(yes 'engineer python aws docker' | head -c 200 | tr '\n' ' ')"'","targetRole":"SWE"}' &
done
```
All 1000 requests succeed with HTTP 200. No 429, no 401, no quota counter.

**Expected.** At minimum, IP-based rate limiting (e.g. 20 requests / 15 minutes per IP) on every `/api/tools/*` endpoint when not authenticated.

**Actual.** `enforceToolUsage` returns `{ context: null, response: null }` when no session exists, and the route proceeds. `trackPublicTool` only increments usage when `input.userId` is set. Anonymous callers get unlimited free AI scoring.

**Impact.** (1) CPU burn on the server. (2) If the resume engine ever calls a paid AI API (OpenAI / Anthropic), unbounded bill liability. (3) Trivial DOS — flood the tool routes.

**Recommended fix.**
```ts
// Add an IP-based bucket before the auth check.
import { rateLimit } from "@/lib/rate-limit" // wraps upstash/ratelimit or in-memory

export async function enforceToolUsage(...) {
  const context = await getOptionalToolUserAsync(request)
  if (!context) {
    const ip = (request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim()
    const ok = await rateLimit(`tool:${ip}`, { limit: 20, windowSec: 900 })
    if (!ok) return { context: null, response: jsonError("Too many requests. Try again later.", 429, "rate_limited") }
  }
  ...
}
```

---

## C3 — No rate limiting / lockout on `/api/auth/login`

**Severity:** Critical
**Location:** `src/app/api/auth/login/route.ts`

**Reproduction.** Hit `POST /api/auth/login` repeatedly with the same email and different passwords. The server checks scrypt every time and returns 401 unconditionally. No 429, no lockout, no captcha.
```bash
for pwd in "password1" "Welcome2024" "Letmein!" "qwerty12"; do
  curl -X POST https://hiretuner.com/api/auth/login \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"victim@example.com\",\"password\":\"$pwd\"}"
done
```

**Expected.** After ~5 failures from one IP or against one email within a short window, reject with 429 or temporarily lock the account.

**Actual.** Unlimited login attempts. Combined with H9 (weak password policy allows `password1`), a 10k-attempt brute force completes in minutes.

**Recommended fix.** Rate-limit by `(ip, email)` tuple. Suggest: 5 failures in 15 minutes → 429 with `Retry-After`. After 20 failures against one account in 1 hour, lock for 30 minutes and send a notification email.

---

## C4 — Signup leaks which emails are registered (user enumeration)

**Severity:** Critical
**Location:** `src/app/api/auth/signup/route.ts:30`
```ts
if (findUserByEmail(email)) {
  return jsonError("An account with this email already exists.", 409, "email_exists")
}
```

**Reproduction.**
```bash
curl -X POST https://hiretuner.com/api/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"name":"x","email":"target@example.com","password":"Whatever123"}'
# → 409 if exists, 200 if new
```
No rate limit (C3 pattern), no captcha. Iterating any email list (LinkedIn export, password breach dump) reveals which addresses have HireTuner accounts.

**Expected.** Always return the same response (or the same error) regardless of whether the email is taken. If you want to tell the legitimate user, do so via email: send "account already exists, did you mean to log in?" to the registered email address.

**Actual.** Distinct 409 + `email_exists` code is a yes/no oracle.

**Recommended fix.**
```ts
if (findUserByEmail(email)) {
  // Optional: send "account exists, please log in" email to the address.
  // Always return the same response shape as a successful signup.
  return jsonOk({ message: "Signup received. Check your email." })
}
```
Subtle: this also requires the success response not to set a cookie or return user data — instead always require email verification before account is usable.

---

## C5 — Password reset email is never sent in production

**Severity:** Critical
**Location:** `src/app/api/auth/reset-password/route.ts`

**Reproduction.** In production, request a reset for a known email:
```bash
curl -X POST https://hiretuner.com/api/auth/reset-password \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com"}'
# → 200 OK, message "If an account exists..."
```
No email is dispatched. The user cannot recover their account.

**Expected.** Email containing the reset link arrives in inbox within 1 minute.

**Actual.** Token is generated, hashed, stored. `devResetToken` is only included in the response when `NODE_ENV !== "production"`. No `nodemailer`, `@sendgrid/mail`, Postmark, Resend, or SES integration anywhere in the codebase. The success message *says* mail will be sent ("password reset instructions will be sent") but production has no SMTP wiring.

**Recommended fix.** Wire an email provider (Resend / Postmark / SES). Add `EMAIL_PROVIDER_API_KEY` / `EMAIL_FROM` envs (already documented in `RAILWAY_ENV.md` lines 89-92 but unused). Send `https://hiretuner.com/reset-password?token=${token}` link. Use Postmark template or HTML inline.

---

## C6 — Open-redirect via attacker-controlled `Origin` header

**Severity:** Critical
**Location:** `src/lib/http.ts:213-220`
```ts
export function publicBaseUrl(request: Request) {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    request.headers.get("origin") ||                  // ← attacker-controlled
    new URL(request.url).origin ||
    "http://localhost:3000"
  )
}
```
Used in `src/app/api/billing/checkout/route.ts:48` and `src/app/api/billing/portal/route.ts:36` to build Stripe `success_url` / `cancel_url` / `return_url`.

**Reproduction.** If `NEXT_PUBLIC_APP_URL` is unset in any environment, an attacker who can manipulate the `Origin` header on the user's request (via an XSS payload elsewhere on the site, or via a malicious site initiating a fetch with `credentials:'include'` if SameSite=Lax allows it) makes:
```bash
curl -X POST https://hiretuner.com/api/billing/checkout \
  -H 'Origin: https://evil.com' \
  -H 'Cookie: rolefit_session=<victim_session>' \
  -H 'Content-Type: application/json' \
  -d '{"interval":"monthly"}'
# → returns checkoutUrl whose success_url is https://evil.com/dashboard?upgrade=success
```
Stripe redirects the user to `evil.com` after payment with a session_id query param. evil.com phishes / harvests.

**Expected.** `publicBaseUrl` returns the canonical site URL regardless of request headers. Origin header is only useful for explicit CORS responses, never for building redirect URLs.

**Actual.** Falls back to the attacker-controlled header.

**Recommended fix.**
```ts
export function publicBaseUrl(_request: Request) {
  const url = process.env.NEXT_PUBLIC_APP_URL
  if (!url) throw new Error("NEXT_PUBLIC_APP_URL is required.")
  return url
}
```
And confirm `NEXT_PUBLIC_APP_URL=https://hiretuner.com` is set in Railway production (per `RAILWAY_ENV.md` line 12 — currently set, but the fallback still creates risk if it's ever unset).

---

## H1 — JSON `updateDatabase` is read-modify-write without locking

**Severity:** High
**Location:** `src/lib/database.ts:88-93`
```ts
export function updateDatabase<T>(mutator: (database: RoleFitDatabase) => T): T {
  const database = readDatabase()
  const result = mutator(database)
  writeDatabase(database)
  return result
}
```

**Reproduction.** Run two simultaneous PATCH `/api/applications/[id]` calls modifying different fields of two different applications by the same user. Both processes read the same snapshot, each mutates their own copy, both write back. The second write silently overwrites the first.

**Expected.** Concurrent writes either serialize (lock) or use compare-and-swap with retry.

**Actual.** `writeDatabase` does an atomic rename, so the **file** stays consistent. But the **logical state** loses one of the two updates. Worse on the `sessions` array (session created in T1 lost when T2 writes), `usages` (counter increments lost), `subscriptions` (Stripe webhook update can be silently undone by a concurrent `incrementUsage`).

**Recommended fix.** Wrap `updateDatabase` in a per-process mutex with `proper-lockfile` (cross-process lock via file system) so concurrent updates from Next.js workers serialize:
```ts
import lockfile from "proper-lockfile"
export async function updateDatabase<T>(mutator: (db: RoleFitDatabase) => T): Promise<T> {
  const release = await lockfile.lock(DB_FILE, { retries: { retries: 10, minTimeout: 50 } })
  try {
    const database = readDatabase()
    const result = mutator(database)
    writeDatabase(database)
    return result
  } finally { await release() }
}
```
Long term: migrate to Postgres / SQLite-with-WAL.

---

## H2 — TOCTOU race in usage quota enforcement

**Severity:** High
**Location:** `src/lib/http.ts:112` (`assertUsageAvailable`) + `src/lib/http.ts:173` (`incrementUsage`) — called sequentially by every quota-guarded route.

**Reproduction.** While logged in as a free user with 0 used credits, fire N parallel `POST /api/job-descriptions/analyze` requests:
```js
const jd = "x".repeat(200);
const N = 10;
const results = await Promise.all(
  Array.from({length: N}, () => fetch('/api/job-descriptions/analyze', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({rawText: jd})
  }))
);
console.log(results.map(r => r.status));
// → All 10 return 200, all 10 burn credits.
//   Even though the free plan cap is 2.
```
All requests read `usage.jdScansUsed = 0`, all pass the `assertUsageAvailable` check, all increment. End state: 10 / 2 used.

**Expected.** Atomic check-and-increment. Once cap reached, subsequent concurrent requests get 402.

**Actual.** Read-then-increment is non-atomic. N concurrent requests can each pass the check, bypassing the cap by a factor of N.

**Recommended fix.** Move the cap check inside the same `updateDatabase` mutation as the increment, with lockfile (H1 fix covers this).
```ts
// Pseudocode
updateDatabase(db => {
  const usage = ensureUsageRow(db, userId)
  if (limit !== null && usage[field] >= limit) throw new UsageLimitError(...)
  usage[field] += 1
})
```

---

## H3 — Firebase ID token accepted without `email_verified` check

**Severity:** High (conditional on Firebase project config)
**Location:** `src/app/api/auth/firebase/route.ts:47-62`
```ts
const decoded = await verifyIdToken(idToken)
if (!decoded) return jsonError(..., 401, "invalid_token")
const email = decoded.email?.toLowerCase().trim() ?? ""
if (!email) return jsonError(...)
// NO check on decoded.email_verified
```
Then later `findUserByEmail(email)` — if a HireTuner account exists with this email, the attacker takes it over.

**Reproduction (conditional).** Requires Email/Password Firebase sign-in to be enabled on the `hiretuner` Firebase project. If yes:
1. Attacker creates a Firebase account with `victim@example.com` + any password (Firebase doesn't verify email by default).
2. Attacker calls Firebase `signInWithEmailAndPassword`, gets an ID token with `email: victim@example.com`, `email_verified: false`.
3. Attacker POSTs that ID token to `https://hiretuner.com/api/auth/firebase`.
4. Server's `verifyIdToken` succeeds (valid Firebase token from our project). Server matches `victim@example.com` to victim's existing HireTuner account. Server mints HireTuner session for victim.

**Expected.** Reject any decoded token where `decoded.email_verified === false` OR `decoded.firebase.sign_in_provider !== "google.com"` (since we only want Google sign-in through Firebase).

**Actual.** No check.

**Recommended fix.**
```ts
if (!decoded.email_verified) {
  return jsonError("Email is not verified by your auth provider.", 403, "email_not_verified")
}
const provider = decoded.firebase?.sign_in_provider
if (provider && provider !== "google.com") {
  return jsonError("Only Google sign-in is supported through this endpoint.", 403, "unsupported_provider")
}
```
Or disable Email/Password sign-in in the Firebase Console for the `hiretuner` project.

---

## H4 — No Stripe webhook idempotency

**Severity:** High
**Location:** `src/app/api/billing/webhook/route.ts:38-49`

**Reproduction.** Trigger any subscription event (e.g. `stripe trigger customer.subscription.updated --override subscription:metadata.userId=<uid>`). Then replay the same event manually:
```bash
curl -X POST https://hiretuner.com/api/billing/webhook \
  -H 'stripe-signature: <captured-signature>' \
  -d '<captured-payload>'
```
The handler processes the event twice. `applySubscriptionUpdate` runs twice — fine for idempotent set-operations on this code path, but if you add any +=, +1, or "send welcome email" side effect later, you'll double-fire.

More realistically: when Stripe's network retries the same event due to a transient 5xx, the same `event.id` arrives multiple times. `event.id` is currently ignored.

**Expected.** Persist processed `event.id`s for 24h. Skip duplicates with 200 + log.

**Actual.** No dedup.

**Recommended fix.**
```ts
// Inside the route, after constructEvent:
const seen = await wasEventProcessed(event.id)
if (seen) return jsonOk({ received: true, idempotent: true })
// ... handle event ...
await markEventProcessed(event.id, ttlSeconds: 86400)
```
Store the set in the JSON DB or (better) Redis with TTL.

---

## H5 — Webhook hardcodes `planType = "starter"` regardless of priceId

**Severity:** High
**Location:** `src/app/api/billing/webhook/route.ts:131`
```ts
record.planType = "starter" satisfies PlanType
```

**Reproduction.** Create a $0.50 / month "discount" price in Stripe for any reason (campaign, test, internal). Have a user check out with that price. The webhook flips `planType` to `starter` — same as the real $5.49 price. Without checking the priceId, you can't tell apart real subscribers from any other Stripe customer.

**Expected.** Derive `planType` from the priceId.

**Actual.** Hard-coded literal.

**Recommended fix.**
```ts
const priceId = subscription.items.data[0]?.price?.id
const planTypeByPrice: Record<string, PlanType> = {
  [process.env.STRIPE_STARTER_PRICE_ID ?? ""]: "starter",
  [process.env.STRIPE_STARTER_YEARLY_PRICE_ID ?? ""]: "starter",
  // future tiers...
}
const planType = planTypeByPrice[priceId ?? ""]
if (!planType) {
  logger.warn("api.billing.webhook", "Unknown priceId on subscription", { priceId })
  return  // don't grant anything for unrecognized prices
}
record.planType = planType
```

---

## H6 — Webhook trusts `metadata.userId` set on the Stripe object

**Severity:** High
**Location:** `src/app/api/billing/webhook/route.ts:56,78,90`

**Reproduction.** Anyone with Stripe Dashboard write access can edit a subscription's metadata. Setting `metadata.userId=<victim-uid>` and triggering an update event causes the webhook to grant starter access to the victim. Practically requires Dashboard access, but compromised employee credentials → instant fraud.

**Expected.** Verify the `userId` claim matches the user who owns the stripe customer in our DB. Cross-check `customer.id` against our `subscriptions.stripeCustomerId`.

**Actual.** Trusts metadata blindly when present (falls back to `customerId` only if `userId` absent).

**Recommended fix.**
```ts
const record = database.subscriptions.find(s => s.stripeCustomerId === customerId)
if (!record) {
  logger.warn("api.billing.webhook", "No local subscription for Stripe customer", { customerId })
  return
}
if (userId && userId !== record.userId) {
  logger.error("api.billing.webhook", "metadata.userId mismatch", { metadataUserId: userId, recordUserId: record.userId, customerId })
  return
}
```

---

## H7 — Cross-subdomain XSS bypass of SameSite=Lax cookie protection

**Severity:** High (latent — depends on future subdomain content)
**Location:** `src/lib/auth.ts:131` (`sameSite: "lax"`)

**Reproduction.** If `*.hiretuner.com` is ever added (blog, marketing site, status page, support portal) and that subdomain has an XSS or unmaintained vendor scripts, the attacker JS on the subdomain can fetch `https://hiretuner.com/api/*` with `credentials:'include'`. SameSite=Lax sends the cookie on same-site requests. Attacker has CSRF.

**Expected.** Defense in depth — CSRF token on state-changing requests.

**Actual.** No CSRF token. Relies entirely on cookie SameSite + (implicit) same-origin checks.

**Recommended fix.** Add a double-submit CSRF token: server sets a `csrf` cookie on first response (non-httpOnly), client reads it and sends as `X-CSRF-Token` header on every POST/PATCH/DELETE. Server compares. The cookie is same-site-restricted so an XSS on a subdomain can read the JS-visible cookie of the API origin only if `domain=.hiretuner.com` is set — keep the CSRF cookie scoped to `hiretuner.com` only.

---

## H8 — Login doesn't rotate old sessions

**Severity:** High
**Location:** `src/lib/auth.ts:143-153` (`createSessionForUser`)

**Reproduction.** Attacker steals victim's session cookie (via H7, malware, etc). Victim notices, logs in again hoping to "reset". `createSessionForUser` creates a NEW session record but **doesn't invalidate the old one** — line 146: `database.sessions = database.sessions.filter((item) => item.userId !== userId || new Date(item.expiresAt).getTime() > Date.now())` only filters EXPIRED sessions of the user, not all sessions. Stolen cookie still valid until natural 30-day expiry.

**Expected.** On login, invalidate all previous sessions for the user (or expose a "log me out everywhere" UI).

**Actual.** Multiple concurrent sessions accumulate; only natural expiry removes them.

**Recommended fix.**
```ts
export async function createSessionForUser(userId: string) {
  const session = createSessionRecord(userId)
  updateDatabase((database) => {
    // Drop ALL previous sessions for this user — single-session policy.
    database.sessions = database.sessions.filter((s) => s.userId !== userId)
    database.sessions.push(session)
  })
  await setSessionCookie(session)
  return session
}
```
Or add a "Sign me out everywhere else" toggle in the new `/dashboard/settings` page.

---

## H9 — Password validator allows trivially weak passwords

**Severity:** High
**Location:** `src/lib/auth.ts:71-79`
```ts
if (password.length < 8) ...
if (!/[A-Za-z]/.test(password)) ...
if (!/[0-9]/.test(password)) ...
```

**Reproduction.** Sign up with `password1` — passes all checks. So does `letmein1`, `welcome1`, `qwerty12`. All in the top 100 of every breach dump.

**Expected.** Reject passwords that appear in common breach lists.

**Actual.** Only structural checks.

**Recommended fix.** Integrate `@have-i-been-pwned/passwords` or `zxcvbn` for strength scoring. Reject score < 3 or any password in the top-10k list. Or use the HIBP k-anonymity API.

---

## H10 — Logout doesn't invalidate Firebase session

**Severity:** High
**Location:** `src/lib/auth.ts:266-278` (`destroyCurrentSession`)

**Reproduction.** User signs in with Google. Clicks Log Out. Server invalidates HireTuner session cookie. But the Firebase Web SDK in the browser still has the user authenticated. Next click on "Continue with Google" silently re-signs them in without a popup or password — looks like "I clicked Log Out but I'm still logged in".

**Expected.** Logout also calls Firebase `signOut(auth)` on the client side.

**Actual.** Only the HireTuner cookie is cleared.

**Recommended fix.** In `LogoutButton`, after the POST to `/api/auth/logout`, call:
```ts
import { getAuth, signOut } from "firebase/auth"
import { getFirebaseAuth } from "@/lib/firebase-client"
const auth = getFirebaseAuth()
if (auth) await signOut(auth)
window.location.href = "/login"
```

---

## H11 — Resume upload reads entire body before size check

**Severity:** High (DOS)
**Location:** `src/app/api/resumes/master/route.ts:32` then `src/lib/resume-engine.ts:178`

**Reproduction.** Send a 100 MB multipart body to `/api/resumes/master`. `request.formData()` reads it all into memory before the route can check `file.size`. The 5 MB guard fires *after* the spike.
```bash
dd if=/dev/zero bs=1M count=100 | curl -X POST https://hiretuner.com/api/resumes/master \
  -H 'Cookie: rolefit_session=...' \
  -F 'file=@-;filename=evil.pdf;type=application/pdf'
```
Concurrent requests each spike 100 MB. Easy to OOM the Node process.

**Expected.** Reject the request based on `Content-Length` header before parsing the body.

**Actual.** Body is fully parsed first.

**Recommended fix.** At route entry:
```ts
const contentLength = Number(request.headers.get("content-length") ?? 0)
if (contentLength > 6 * 1024 * 1024) {
  return jsonError("Resume file is too large (max 5 MB).", 413, "payload_too_large")
}
```
Plus enforce at the proxy layer (Railway has request size limits).

---

## M1 — Sessions are 30-day fixed, no rolling refresh, no concurrent-session view

**Severity:** Medium
**Location:** `src/lib/auth.ts:20` (`SESSION_MAX_AGE_SECONDS = 60*60*24*30`)

**Reproduction.** Sign in, stay signed in for 30 days, then session expires regardless of activity. No way for user to see their active sessions or revoke a specific one.

**Expected.** Sliding session window (extend on use), or refresh-token pattern. Settings page lists active sessions with device / IP / last seen, "Sign out this device" button.

**Actual.** Hard 30-day cap, no UI.

**Recommended fix.** On every authenticated request, if session's `expiresAt - now < 7 days`, issue a new session ID + cookie. Add `lastSeenAt` and `userAgent` columns. Surface in `/dashboard/settings`.

---

## M2 — No email verification before account is full member

**Severity:** Medium
**Location:** `src/app/api/auth/signup/route.ts`

**Reproduction.** Sign up with `random@email.invalid` (doesn't exist). Account is immediately logged in with full feature access. Free plan quota burned by spammer.

**Expected.** Send verification email. Lock account in "unverified" state until clicked. Limit feature access on unverified accounts.

**Actual.** No verification.

**Recommended fix.** Send a verification link on signup, add `emailVerified: boolean` to User model, require verified for paid features and tailored-resume generation.

---

## M3 — Stripe checkout exposes account-existence via `customer_email`

**Severity:** Medium
**Location:** `src/app/api/billing/checkout/route.ts:50`
```ts
customer_email: context.subscription?.stripeCustomerId ? undefined : context.user.email,
```
Visible in Stripe Dashboard / events / webhooks.

**Reproduction.** N/A — primarily a privacy concern. If Stripe events leak (compromised webhook endpoint, leaked log) the email-to-account mapping is exposed.

**Expected.** Use `customer.create` with email kept server-side, pass customer ID into checkout instead.

**Actual.** Email round-trips through Stripe events.

**Recommended fix.** Create a Stripe customer once on signup or first upgrade, store `stripeCustomerId`, never pass `customer_email` to Stripe.

---

## M4 — `upsertUsageForUser` writes to DB on every authenticated request

**Severity:** Medium
**Location:** `src/lib/http.ts:67,91` — called inside `requireApiUser` AND `requireApiUserAsync`.

**Reproduction.** Hit `GET /api/auth/me` 100 times. Each call writes a usage row. Same for every page load that hits any authenticated API.

**Expected.** Only mutate usage state when the user actually consumes a quota.

**Actual.** Every auth call triggers a write — amplifies H1/H2 race surface.

**Recommended fix.** Move `upsertUsageForUser` out of the auth path; call it only from routes that actually count usage. Auth path should only `read` usage when it's needed.

---

## M5 — `subscription.deleted` doesn't clear Stripe IDs

**Severity:** Medium
**Location:** `src/app/api/billing/webhook/route.ts:96-105`

**Reproduction.** Cancel a subscription in Stripe. Local record gets `planType="free", status="canceled"`, but `stripeCustomerId` and `stripeSubscriptionId` remain. Later, user re-subscribes — fresh `subscription.created` overrides them, OK, but interim window has stale IDs.

**Expected.** Clear `stripeSubscriptionId` on cancel; keep `stripeCustomerId` for future billing.

**Actual.** Both IDs persist.

**Recommended fix.**
```ts
record.stripeSubscriptionId = null
record.currentPeriodStart = null
record.currentPeriodEnd = null
```

---

## M6 — No structured failed-login audit log

**Severity:** Medium
**Location:** `src/app/api/auth/login/route.ts`

**Reproduction.** Brute-force an account; nothing is logged that you could later use to detect the pattern.

**Expected.** Every failed login emits a structured log: `{ ip, email, ts, userAgent }`. Aggregate in a SIEM / log search.

**Actual.** No log on failure.

**Recommended fix.**
```ts
logger.warn("api.auth.login", "Failed login attempt", {
  email,
  ip: request.headers.get("x-forwarded-for") ?? "unknown",
  userAgent: request.headers.get("user-agent"),
})
```

---

## M7 — `firebase-admin` reuses cached app by name silently

**Severity:** Medium
**Location:** `src/lib/firebase-admin.ts:44-67`

**Reproduction.** If two parts of the codebase init Firebase Admin with the name `hiretuner-admin`, the second wins (or loses, depending on race). Hard to debug in mixed test/prod environments.

**Expected.** Verify the cached app's project matches the configured project.

**Actual.** Returns whatever was created first under that name.

**Recommended fix.** Compare `existing.options.credential.projectId` to `getServiceAccount().projectId` before returning.

---

## M8 — Tailored resume PDF URL is session-authenticated but not signed

**Severity:** Medium
**Location:** `src/app/api/tailored-resumes/[id]/download/route.ts`

**Reproduction.** User downloads `/api/tailored-resumes/<id>/download`. URL ends up in browser history, sometimes in proxy / corporate-monitor logs. If their cookie is later compromised, attacker can re-fetch.

**Expected.** Signed, expiring URL: `/download?sig=...&expires=...`. Or stream to memory and skip the URL pattern.

**Actual.** Plain URL relies on session.

**Recommended fix.** Optional — generate a one-time download token tied to the user + resume + 60-second expiry.

---

## M9 — No app-level HSTS / strict transport headers

**Severity:** Medium
**Location:** `next.config.ts` (no `headers()` exporter)

**Reproduction.** If Railway / Cloudflare layer ever misconfigures TLS, app falls back to HTTP without warning.

**Expected.** App emits `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`.

**Actual.** None set at app level.

**Recommended fix.** Add a `headers()` block in `next.config.ts`.

---

## M10 — `incrementUsage` runs after the work is done

**Severity:** Medium
**Location:** `src/app/api/job-descriptions/analyze/route.ts:59` (and others)

**Reproduction.** Trigger an AI call that succeeds, then crash the Node process (SIGKILL, OOM, restart) before `incrementUsage` writes. Reboot. The usage counter wasn't incremented. User got a free request.

**Expected.** Increment quota inside the same DB transaction as the result write. Or pre-decrement before work, refund on failure.

**Actual.** Two non-atomic operations.

**Recommended fix.** Pre-increment, refund on caught exception:
```ts
incrementUsage(userId, "jdScansUsed")
try { /* work */ }
catch (e) { decrementUsage(userId, "jdScansUsed"); throw e }
```

---

## L1 — `devResetToken` returned in non-production responses

**Severity:** Low
**Location:** `src/app/api/auth/reset-password/route.ts:38-42`

If `NODE_ENV` is anything other than `"production"` (preview, staging, dev), the reset token is included in the response body, allowing anyone who hits the endpoint to reset anyone's password.

**Recommended fix.** Either drop the feature, gate behind `process.env.NEXT_PUBLIC_DEV_RESET_TOKEN === "1"`, or wire actual email everywhere.

---

## L2 — Logger emits userId + email

**Severity:** Low
**Location:** `src/lib/logger.ts` + every caller passing `{ userId, email }` in meta

PII / GDPR consideration. Logs typically end up in third-party providers (Railway logs, Sentry, etc.). Hashing or redacting these fields in production logs is the conservative choice.

**Recommended fix.** Add a redactor that strips email / userId from log payloads in production unless explicitly opted in.

---

## L3 — `/api/auth/me` not cached

**Severity:** Low
**Location:** `src/app/api/auth/me/route.ts`

Every page load hits the JSON DB twice (`getCurrentUser` reads users + sessions, then `getDashboardData` reads everything). Easy P2 perf win, no security implication.

---

## L4 — No app-level CSP

**Severity:** Low
**Location:** Next.js default headers

XSS payloads in resume text or display name would execute with no script-source restrictions.

**Recommended fix.** Strict CSP via `next.config.ts` headers — `default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com; ...`. Will require Stripe / Firebase / AdSense allowlisting.

---

## L5 — `clearSessionCookie` / `setSessionCookie` attribute mismatch

**Severity:** Low
**Location:** `src/lib/auth.ts:127-141`

`setSessionCookie` sets `path: "/"` etc. `clearSessionCookie` calls `cookieStore.delete(SESSION_COOKIE)` without specifying path — relies on Next.js defaults matching. If they ever diverge, the cookie won't be deleted properly.

**Recommended fix.** Pass `{ path: "/" }` explicitly to `delete()`.

---

## L6 — PDF generation reflects user input unsanitized

**Severity:** Low
**Location:** `src/lib/resume-engine.ts buildMinimalPdf`

A crafted resume string could exploit a vulnerability in a downstream PDF reader. Risk is low because the PDF is built from a constrained text representation, not raw user-controlled bytes.

**Recommended fix.** Strip control characters and any non-printable bytes before insertion. Limit length.

---

## L7 — Webhook returns 500 on handler error → Stripe retries

**Severity:** Low
**Location:** `src/app/api/billing/webhook/route.ts:46`

If the handler throws (e.g. JSON DB write fails), Stripe sees 500 and retries up to 3 days. Without idempotency (H4), retries could compound issues.

**Recommended fix.** Wrap each event handler in its own try/catch. Log the error, return 200 unless the error is transient and a retry would actually help. Combined with H4 (idempotency), retries become safe.

---

## Appendix — paths searched but found clean

These were inspected for the specific vulnerability class noted and **passed**:

| Class | Path | Status |
|---|---|---|
| IDOR | `/api/tailored-resumes/[id]/download` | ✅ `userId` filter present |
| IDOR | `/api/applications/[id]` (PATCH, DELETE) | ✅ `userId` filter present |
| IDOR | `/api/resumes/master` (PUT, DELETE) | ✅ `userId` filter present |
| IDOR | `/api/job-descriptions/[id]` | ✅ `userId` filter present |
| Webhook sig verification | `/api/billing/webhook` | ✅ `constructEvent` used correctly |
| Login enumeration | `/api/auth/login` | ✅ Generic "Invalid email or password" |
| Password hashing | `hashPassword` / `verifyPassword` | ✅ scrypt + 16B salt + timing-safe |
| Reset token storage | `/api/auth/reset-password` | ✅ Stored as sha256 hash, not plaintext |
| Reset token reuse | `/api/auth/reset-password/confirm` | ✅ `usedAt` single-use flag |
| Reset → session invalidation | confirm route | ✅ Filters all sessions for user |
| Cookie flags | `setSessionCookie` | ✅ httpOnly + sameSite + secure in prod |
| Auth on all data routes | `find . -name route.ts -exec grep -L requireApiUser` | ✅ Only auth endpoints lack it (correctly) |
| HMAC length check | `verifySessionToken` | ✅ Pre-check before `timingSafeEqual` |

End of report.
