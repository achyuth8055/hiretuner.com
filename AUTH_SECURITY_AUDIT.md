# HireTuner — Auth, Billing & Security Audit

**Date:** 2026-06-18
**Auditor:** Claude (Senior QA / Security Auditor mode)
**Scope:** authentication, authorization, sessions, password reset, Firebase OAuth bridge, Stripe checkout / portal / webhook, premium gating, rate limiting, abuse prevention.
**Method:** Source-level review of `src/lib/auth.ts`, `src/lib/http.ts`, `src/lib/database.ts`, `src/lib/firebase-admin.ts`, `src/lib/public-tool-storage.ts`, every route under `src/app/api/auth/*`, `src/app/api/billing/*`, `src/app/api/resumes/*`, `src/app/api/tailored-resumes/*`, `src/app/api/applications/*`, `src/app/api/tools/*`, `src/app/api/usage/*`, plus live black-box probes via Chrome MCP on https://hiretuner.com during the prior E2E run. No fixes were applied.

---

## TL;DR

**The site has six critical issues and eleven high-severity issues.** The most urgent: a **default `AUTH_SECRET` fallback string in the source code** (forge any session if the env var ever drops), **no rate limiting on `/api/tools/*` for anonymous users** (unlimited CPU + AI cost burn), **no rate limiting on `/api/auth/login`** (brute force), **signup leaks which emails are registered** (enumeration), and **password reset email is never sent in production** (password recovery broken). Stripe checkout/webhook flow has correct signature verification but **hardcodes `planType=starter` regardless of priceId** and has **no event idempotency**. Authorization on data routes (IDOR) is correctly implemented across `tailored-resumes`, `applications`, `master-resume`. The JSON-file user store has a fundamental race condition on `updateDatabase` that affects every concurrent write (usage counters, sessions, subscriptions).

**Total findings:** 6 Critical, 11 High, 10 Medium, 7 Low.

The companion file `AUTH_SECURITY_BUGS.md` contains each finding with exact repro, expected vs actual behavior, and recommended fix.

---

## What works correctly (don't break these)

- **Authorization (IDOR)** — `/api/tailored-resumes/[id]/download`, `/api/applications/[id]`, `/api/resumes/master`, `/api/job-descriptions/*` all filter by `resource.userId === context.user.id`. I could not find a single data route that returns another user's data given a known ID.
- **HMAC session signing** — `signSessionId` uses sha256 HMAC, `timingSafeEqual` compares signatures. Length pre-check prevents the `RangeError` that `timingSafeEqual` throws on mismatched buffers.
- **scrypt password hashing** — 16-byte salt, 64-byte derived key, constant-time compare. Salt stored per-user. Standard, defensible.
- **Stripe webhook signature verification** — `stripe.webhooks.constructEvent(payload, signature, webhookSecret)` is used correctly. Missing `stripe-signature` header → 400. Bad signature → 400 + log.
- **Login error message is generic** — "Invalid email or password" doesn't distinguish unknown user vs wrong password (no enumeration on this path).
- **Password reset confirm** — token is sha256-hashed at rest, single-use (`usedAt` flag), 30-minute expiry, **invalidates all existing sessions** on successful reset.
- **Cookie flags** — `httpOnly: true`, `sameSite: "lax"`, `secure: NODE_ENV==='production'`, `path: "/"`, 30-day `maxAge`. No JS access; cross-site POST blocked by SameSite=Lax.

---

## Architecture snapshot

```
[browser]         [Next.js app]              [JSON store]    [Stripe]    [Firebase]
   |                  |                          |              |            |
   | -- /signup ----> | hashPassword(scrypt)     |              |            |
   |                  | createUserRecord ------> insertUser     |            |
   |                  | createSessionRecord ---> sessions table |            |
   |                  | setSessionCookie ------> Set-Cookie     |            |
   |                  |                                                       |
   | -- POST /api/* > | requireApiUser → getCurrentUserFromRequest            |
   |                  |   → verifySessionToken (HMAC) → DB session lookup     |
   |                  | (OR Authorization: Bearer <firebase-id-token>         |
   |                  |   → verifyIdToken → match user by email)              |
   |                  |                                                       |
   | -- Upgrade ----> | POST /api/billing/checkout                            |
   |                  | → Stripe Checkout Session created                     |
   |                  | → redirect user to session.url ───────────────────>   |
   |                                                                          |
   |          Stripe -------- POST /api/billing/webhook (signed) ─────────────|
   |                  | constructEvent(payload, sig, secret) → handle event   |
   |                  | → updateDatabase(record.planType = "starter")         |
   |                                                                          |
```

**Storage:** a single `.data/rolefit-db.json` file on disk. Each write reads the whole file, mutates the in-memory snapshot, then renames a temp file over it. No row-level locks, no transactions.

**Auth tokens:** HMAC-signed session ID (NOT a JWT — the cookie carries only an opaque session ID + signature; the actual session record lives in the JSON store).

**Two auth paths:**
1. Cookie session (web)
2. `Authorization: Bearer <firebase-id-token>` → Firebase Admin verifies → match user by email (extension)

---

## Severity legend

- **Critical** — directly enables account takeover, fraud, large-scale resource abuse, or data loss. Fix this week.
- **High** — degrades the security posture significantly; requires meaningful attacker effort but is realistic. Fix this sprint.
- **Medium** — limited impact, hardening rather than a vulnerability. Fix this month.
- **Low** — defense-in-depth or compliance polish. Fix when convenient.

---

## Coverage / out of scope

Tested or reviewed:
- ✅ User signup, login, logout, session cookie format, password hashing, password validation rules
- ✅ Password reset request + confirm + token storage
- ✅ Firebase ID-token exchange path (extension auth)
- ✅ `Authorization: Bearer` header handling in `getCurrentUserFromRequestAsync`
- ✅ Stripe checkout creation, portal session, webhook signature verification, event handling, plan switching on subscription.created/updated/deleted
- ✅ Authorization checks on every `/api/*` data route (IDOR sweep)
- ✅ Quota / rate limit logic in `assertUsageAvailable` + `enforceToolUsage`
- ✅ JSON-file storage write semantics + race conditions
- ✅ Reset/confirm token entropy + storage
- ✅ Cookie flags (httpOnly, sameSite, secure, path)
- ✅ Marketing pages auth-aware nav (server-side check after this session's fix)

Not in scope this run:
- ⛔ Real penetration testing (active exploitation, fuzzing, payload generation)
- ⛔ Static dependency audit (`npm audit` / Snyk)
- ⛔ Network/transport security (TLS configuration on Railway / Cloudflare in front)
- ⛔ Frontend XSS (no live attempt — would require manual probing of every input)
- ⛔ Firebase Console settings review (whether Email/Password sign-in is enabled; auditor doesn't have access)
- ⛔ Stripe Dashboard configuration review (webhook events list, price config)

---

## Prioritized fix list (one-line summary, full detail in AUTH_SECURITY_BUGS.md)

### Critical (6)
- **C1** — Default `AUTH_SECRET` fallback string in source code; missing env var = forge any session.
- **C2** — Anonymous `/api/tools/*` calls bypass rate limiting entirely; unlimited AI/CPU burn.
- **C3** — No rate limit / lockout on `/api/auth/login`; brute force attacks unbounded.
- **C4** — Signup returns distinct 409 `email_exists` error → user enumeration via signup.
- **C5** — Password reset email is never sent in production; recovery is broken.
- **C6** — `publicBaseUrl` falls back to attacker-controlled `Origin` header → Stripe success_url open redirect.

### High (11)
- **H1** — JSON `updateDatabase` is read-modify-write without lock; concurrent writes lose data.
- **H2** — TOCTOU on usage quotas (`assertUsageAvailable` + later `incrementUsage`); N concurrent requests bypass cap.
- **H3** — Firebase ID-token exchange doesn't require `email_verified`; account takeover if Email/Password Firebase sign-in is enabled.
- **H4** — Stripe webhook has no `event.id` idempotency; retried events apply twice.
- **H5** — Webhook hardcodes `planType = "starter"` regardless of which priceId was paid.
- **H6** — Webhook trusts `metadata.userId` set by whoever created the checkout/subscription; Stripe Dashboard compromise → grant any user starter.
- **H7** — Cross-subdomain XSS (e.g. on a hypothetical `blog.hiretuner.com`) bypasses SameSite=Lax for cookie-authenticated state changes.
- **H8** — Login does not rotate or invalidate previous sessions; stolen session valid for 30 days regardless of subsequent logins.
- **H9** — `validatePassword` allows `password1` style passwords (8 chars + letter + number); no common-password blacklist.
- **H10** — Logout only clears the HireTuner cookie; Firebase session in browser persists, popup may auto-complete next sign-in.
- **H11** — Resume `extractResumeTextFromFile` size check happens after `request.formData()` reads the whole body into memory; 100MB body spikes memory before the 5MB check fires.

### Medium (10)
- **M1** — Sessions are 30-day fixed, never rolled, no concurrent-session view / revoke UI.
- **M2** — No email verification before account is treated as full member.
- **M3** — Stripe `customer_email` exposed in events; combined with login error, gives weak enumeration.
- **M4** — `upsertUsageForUser` runs a DB write on every authenticated request (even `GET /api/auth/me`); contention + amplification.
- **M5** — `subscription.deleted` webhook keeps `stripeSubscriptionId` / `stripeCustomerId` populated after cancel; re-subscribe path uses stale ID.
- **M6** — No structured failed-login log; IP / pattern detection impossible.
- **M7** — `firebase-admin` reuses cached app by name; if a different SDK init runs in same process, it silently picks up wrong credentials.
- **M8** — `tailored-resumes/[id]/download` URL is session-authenticated but URL is not signed/expiring; browser-history leak possible.
- **M9** — No app-level HSTS or strict transport headers; trusts edge proxy.
- **M10** — `incrementUsage` writes after the work is done; if AI call succeeds but DB write fails (disk full, restart), the user gets a free request.

### Low (7)
- **L1** — `devResetToken` echoed in non-production responses; leak risk on staging/preview.
- **L2** — Logger emits `userId` + `email` in structured logs; PII / compliance flag.
- **L3** — `/api/auth/me` not cached; full DB round-trip per nav.
- **L4** — No app-level CSP beyond defaults; XSS payloads unrestricted in user-rendered text.
- **L5** — `clearSessionCookie()` and `setSessionCookie` use slightly different cookie attribute sets (no explicit attribute overlap check).
- **L6** — `buildMinimalPdf(tailoredResume.resumeText)` reflects user input into PDF without sanitization; malformed input could trigger viewer-specific bugs.
- **L7** — Stripe webhook returns `500` on handler errors; Stripe will retry. Often safer to return `200` + log if the error is non-transient.

---

## Recommendations roadmap (chronological, not by severity)

**Sprint 1 — emergency**
1. Replace the default `AUTH_SECRET` fallback with a hard refuse-to-start. Audit Railway env to confirm `AUTH_SECRET` is set.
2. Add IP-based rate limiting to `/api/auth/login`, `/api/auth/signup`, `/api/auth/reset-password`, and `/api/tools/*` for anonymous callers. Recommend `upstash/ratelimit` or `@vercel/edge-rate-limit`.
3. Make `/api/auth/signup` return the same generic response whether the email exists or not. Drop the 409 distinction.
4. Wire an actual email provider (Postmark, Resend, SES) to `/api/auth/reset-password` so reset links actually arrive.
5. Stop falling back to the `Origin` header in `publicBaseUrl`. Require `NEXT_PUBLIC_APP_URL` to be set.

**Sprint 2 — high-priority hardening**
6. Migrate the JSON-file store to a real database with row-level locking, OR wrap `updateDatabase` in a `proper-lockfile` mutex with retry. Same fix solves H1 and H2.
7. Add webhook idempotency: persist processed `event.id` for 24 h, skip duplicates.
8. Require `decoded.email_verified === true` in `/api/auth/firebase`.
9. Add a "previous sessions" invalidation flag on the user record + check on every session lookup; flip it on every successful login.
10. Add a common-password blacklist to `validatePassword` (top 10k from haveibeenpwned).

**Sprint 3 — defense in depth**
11. Email verification gate before access to paid features.
12. Webhook should derive `planType` from the priceId, not from a hardcoded literal.
13. CSP header via middleware.
14. Move file-size guard to `Content-Length` pre-check at the route handler entry.
15. Cache `/api/auth/me` per-request with `cache: "no-store"` removed.

Each item is mapped to a specific bug ID in `AUTH_SECURITY_BUGS.md`.

---

## Statement of confidence

Code-reading findings (C1-C6, H1-H11, most M's) are based on **direct source inspection** of the exact files cited above, on the `main` branch as of commit `2e75c4f`. They are reproducible from the source code regardless of deploy state.

Network-observed findings during the prior E2E run (rate-limit absence, signup enumeration) were confirmed by **live HTTP probes** against `https://hiretuner.com` in the same browser session.

Findings about Firebase Console settings (H3 specifically depends on whether Email/Password Firebase sign-in is enabled) require dashboard access to confirm; the audit flags this as "high if condition holds, low if not" and leaves verification to the operator.
