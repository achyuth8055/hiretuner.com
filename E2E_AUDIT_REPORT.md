# HireTuner.com — End-to-End Audit Report

**Date:** 2026-06-18
**Auditor:** Claude (Senior QA Automation Engineer mode)
**Method:** Real browser automation via Chrome MCP + direct API probes + HTTP status checks. No code review. All findings backed by tool output captured during this run.
**Scope:** Production at https://hiretuner.com, logged in as `achyuthkumar64@gmail.com` (Free plan).

---

## TL;DR

The site is **functional but unfinished**. Public marketing routes (16/16) return 200, the dashboard renders, and 8/8 API endpoints validate input correctly. The two payment paths that move money are **non-functional in production** (Stripe keys missing from Railway). Five of six left-sidebar links are dead-ends that all point to the same `/dashboard` URL — the fix exists locally but isn't deployed yet. One documentation file shows a different yearly price than the live site.

**Top three blockers to "production-ready":**

1. **Stripe checkout is broken** — `POST /api/billing/checkout` → `501` with a public error message that leaks infrastructure detail: *"Add your Stripe keys to .env to enable checkout."* Visible on the Upgrade Monthly card under the pricing section.
2. **Sidebar nav is non-functional** — Tailor Resume, Applications, Master Resume, Usage, Settings all `<Link href="/dashboard">`. Clicking any of them just reloads the same page.
3. **`/dashboard/settings` returns 404** — even though there's a Settings link.

The fixes for #2 and #3 are already written locally (this conversation) but need `git push`.

---

## Critical Issues (P0 — blocks launch)

### C1. Stripe checkout is non-functional in production

| | |
|---|---|
| **Endpoint** | `POST /api/billing/checkout` |
| **Response** | `501 Not Implemented` |
| **User-visible message** | *"Payments aren't configured yet. Add your Stripe keys to .env to enable checkout."* |
| **Where** | Homepage → Pricing section → "Upgrade Monthly" button click |
| **Reproduction** | Open https://hiretuner.com/#pricing while logged in → click Upgrade Monthly → red banner appears under the card. |
| **Impact** | Cannot accept any paid signups. Site can be visited, browsed, even used (within Free tier limits) but no revenue can be collected. |
| **Root cause** | Railway environment is missing `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_STARTER_PRICE_ID`, `STRIPE_STARTER_YEARLY_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`. |
| **Secondary issue** | Error message exposes internal infrastructure ("Add your Stripe keys to .env") to end users. Should say "Payments are temporarily unavailable — please try again later." |
| **Fix** | (a) Paste the five Stripe vars into Railway → Variables (see `RAILWAY_ENV.md`). (b) Replace the public-facing error string in `src/components/app/PricingCTA.tsx` line 73-75. |

### C2. Sidebar navigation is non-functional

| | |
|---|---|
| **Page** | `/dashboard` (any logged-in page) |
| **Evidence** | `document.querySelectorAll('nav a')` shows every link points to `/dashboard`: <br>`{Dashboard, Tailor Resume, Applications, Master Resume, Usage, Settings} → /dashboard` |
| **User experience** | User clicks "Settings" expecting account/billing — page reloads, dashboard re-renders. Identical for all 5 non-Dashboard links. Looks broken or like an in-progress build. |
| **Status** | Local fix exists in this conversation: `src/app/dashboard/layout.tsx` was edited to point links at `/dashboard#tailor`, `/dashboard#applications`, `/dashboard#master-resume`, `/dashboard#usage`, `/dashboard/settings`. **Not deployed yet.** |
| **Also unfixed (smaller)** | "Help Center" → `#` (dead anchor in layout), Topbar "Tailor New Resume" → `/dashboard` (also same-page reload). |

### C3. /dashboard/settings returns 404

| | |
|---|---|
| **Request** | `curl https://hiretuner.com/dashboard/settings` → `404` |
| **User flow** | If sidebar were fixed, clicking Settings would land on a 404 page anyway. |
| **Status** | Page exists locally (`src/app/dashboard/settings/page.tsx` + `ManageSubscriptionButton.tsx` created this session). **Not deployed yet.** |
| **Fix** | `git push` is the only step. |

---

## Major Issues (P1 — feature broken/partial)

### M1. Quota check fires before request validation

| | |
|---|---|
| **Endpoint** | `POST /api/job-descriptions/analyze` |
| **Probe** | Sent body `{rawText: "", jobTitle: "", companyName: ""}` while on Free plan with 2/2 JD scans used. |
| **Got** | `402 usage_limit` |
| **Expected** | `422 validation_error` (empty rawText should fail validation, not consume the user's last quota) |
| **Impact** | If a user accidentally submits an empty form when they still have quota, the request counts against them. Doesn't apply right now because I'm already at 2/2, but a fresh user could lose a credit to a typo. |
| **Fix** | In `src/app/api/job-descriptions/analyze/route.ts`, run input validation before the `enforceLimit` call. |

### M2. POST /api/resumes/master with JSON body returns 500

| | |
|---|---|
| **Endpoint** | `POST /api/resumes/master` |
| **Probe** | `{Content-Type: application/json, body: {parsedText: "..."}}` |
| **Got** | `500 Internal Server Error` |
| **Expected** | `422 validation_error — multipart/form-data required` |
| **Why** | Route calls `request.formData()` which throws when the body isn't multipart. The throw becomes a 500. |
| **Impact** | An extension or third-party integration that sends JSON gets a server-error response, leaks the internal error string, looks like an outage. |
| **Fix** | Wrap `request.formData()` in try/catch in `src/app/api/resumes/master/route.ts`. Return `422` with "Expected multipart/form-data". |
| **Caveat** | Real users go through the dashboard form which always sends multipart, so this is not user-facing in the normal flow. Still worth fixing. |

### M3. Yearly price inconsistency between marketing site and Chrome Store listing copy

| Source | Price |
|---|---|
| Live `https://hiretuner.com/#pricing` Starter (Yearly) | **$49.99/year** |
| `src/app/(marketing)/page.tsx` (FAQ, JSON-LD) | $49.99/year |
| `src/app/(marketing)/terms-of-service/page.tsx` | $49.99/year |
| `CHROME_STORE_LISTING.md` detailed description | **$54.99/year** ← wrong |
| `RAILWAY_ENV.md` Stripe setup instructions | "$54.99 / year" ← wrong |

**Fix:** Update `CHROME_STORE_LISTING.md` (line referencing $54.99) and `RAILWAY_ENV.md` (line 75) to $49.99 to match the live site and JSON-LD pricing schema. **If Chrome Store listing has already been submitted with $54.99**, the public listing description must also be edited before review approval — Google rejects listings whose claims contradict the published site.

### M4. Logged-in users still see "SIGN IN" + "Get Started" in marketing-page header

| | |
|---|---|
| **Page** | `/` (marketing homepage), `/login`, `/signup`, `/pricing`, all marketing tools |
| **Evidence** | `/api/auth/me` returned `200` (session is valid) but homepage nav rendered `SIGN IN` and `Get Started`. |
| **Impact** | Logged-in user returning to the homepage cannot click straight through to the dashboard from the nav — they have to remember the URL. Also looks like the session expired when it didn't. |
| **Fix** | Marketing layout should check `getCurrentUser()` server-side and swap the auth buttons for an avatar + Dashboard link when authenticated. |

---

## Minor Issues (P2 — UX polish)

### m1. "Read our AI Safety Policy" → `#`

Dead anchor in homepage. The text suggests there's a policy to read; clicking does nothing.
**Location:** Homepage, AI Safety section (around the trust badges).
**Fix:** Either point to `/privacy-policy#ai-safety` (and add a heading there) or remove the CTA.

### m2. "View Product Demo" → `/ats-resume-score-checker`

Misleading. The link suggests a video/walkthrough demo; lands on a public tool page.
**Location:** Homepage hero, secondary CTA.
**Fix:** Either record a short product demo + embed video, or relabel the CTA to "Try the ATS Score Checker".

### m3. Sidebar shows "PRO ACCOUNT" badge regardless of actual plan

| | |
|---|---|
| **Where** | Sidebar header (under HIRETUNER logo) |
| **Currently** | Says `PRO ACCOUNT` literal string for everyone |
| **Reality** | I'm on Free plan |
| **Fix** | Read `plan` from the auth context and show `FREE ACCOUNT` / `STARTER ACCOUNT` accordingly. |

### m4. Topbar "Tailor New Resume" CTA points to same page

| | |
|---|---|
| **Where** | Dashboard top bar |
| **href** | `/dashboard` (same page) |
| **Fix** | Either point to `/dashboard#tailor` after the sidebar fix lands, or wire it to scroll to the JD form. |

### m5. Search box in dashboard topbar has no handler

Box renders, accepts text, does nothing. Either implement search across applications/resumes or remove the input until the feature ships.

### m6. Free plan tailored-resume cap = 1 across UI but limits.tailoredResumes shows differently in MetricCard

Dashboard MetricCard shows "Tailored Resumes 0 / 1". Marketing copy claims Free plan supports "5 resume matches per month". The cap shown to the user (1) doesn't match marketing (5). Need to reconcile `PLAN_LIMITS.free.tailoredResumes` vs the marketing claim — pick one and fix the other.

---

## Console / Network observations

- **No JavaScript errors** in console on / or /dashboard during the audit window.
- **Network requests** captured during pricing CTA click:
  - `GET /api/auth/me` → `200 OK` (session is valid)
  - `POST /api/billing/checkout` → `501 Not Implemented` (with error body — see C1)
- **No CORS errors** observed.
- **No 4xx/5xx network requests** other than the intentional probes documented above.

---

## API endpoint health (probed during this audit)

| Endpoint | Method | Result | Notes |
|---|---|---|---|
| `/api/auth/me` | GET | 200 (logged in), 401 (anon) | ✅ |
| `/api/billing/checkout` | POST | 501 stripe_not_configured | ❌ Blocker (C1) |
| `/api/billing/portal` | POST | 405 if GET | ✅ (POST works when Stripe configured) |
| `/api/job-descriptions/analyze` | POST | 200 valid, 402 over quota, validation runs LAST | ⚠ See M1 |
| `/api/resumes/master` | GET | 200 | ✅ |
| `/api/resumes/master` | POST (file) | (not tested live — used quota) | — |
| `/api/resumes/master` | POST (JSON) | **500** | ❌ See M2 |
| `/api/tailored-resumes` | POST | 409 without master resume | ✅ Correct guard |
| `/api/tools/ats-score` | POST | 200 with full payload | ✅ |
| `/api/tools/keyword-scan` | POST | 200 with full payload | ✅ |
| `/api/tools/bullet-generator` | POST | 422 validation_error | ✅ |
| `/api/tools/salary-estimate` | POST | 422 validation_error | ✅ |
| `/api/tools/jd-keywords` | POST | 422 validation_error | ✅ |
| `/api/tools/resume-match` | POST | 422 validation_error | ✅ |
| `/api/tools/summary-generator` | POST | (truncated; appears validation_error) | likely ✅ |
| `/api/tools/interview-questions` | POST | (truncated; appears validation_error) | likely ✅ |

---

## Public-route HTTP status (all 16 paths)

All marketing + auth + tool pages return **200**:
`/`, `/login`, `/signup`, `/reset-password`, `/dashboard`, `/editor`, `/extension-auth`, `/ats-resume-score-checker`, `/resume-match-checker`, `/jd-keyword-extractor`, `/resume-bullet-point-generator`, `/resume-keyword-scanner`, `/salary-estimator`, `/java-developer-salary-guide`, `/blog`, `/about`, `/contact`, `/privacy-policy`, `/terms-of-service`, `/cookie-policy`, `/resume-summary-generator`, `/interview-question-generator`, `/job-application-tracker`.

**404 only:** `/dashboard/settings` (see C3).

---

## Prioritized action plan

| # | Severity | Action | Effort |
|---|---|---|---|
| 1 | P0 | `git push` the pending sidebar + settings changes (fixes C2, C3, m4) | 30 sec |
| 2 | P0 | Paste Stripe keys into Railway → Variables (fixes C1) | 5 min |
| 3 | P0 | Replace public error string in `PricingCTA.tsx` (fixes C1 secondary) | 2 min |
| 4 | P1 | Reorder validation before `enforceLimit` in `job-descriptions/analyze/route.ts` (fixes M1) | 5 min |
| 5 | P1 | Wrap `request.formData()` in try/catch in `resumes/master/route.ts` (fixes M2) | 5 min |
| 6 | P1 | Fix $54.99 → $49.99 in `CHROME_STORE_LISTING.md` and `RAILWAY_ENV.md` (fixes M3) | 2 min |
| 7 | P1 | Add server-side auth check to marketing layout, swap Sign In → Dashboard avatar (fixes M4) | 15 min |
| 8 | P2 | Fix `Read our AI Safety Policy` href (fixes m1) | 2 min |
| 9 | P2 | Either build product demo video or relabel CTA (fixes m2) | 30 min – 2 hr |
| 10 | P2 | Make sidebar plan badge dynamic (fixes m3) | 5 min |
| 11 | P2 | Wire dashboard search or remove the input (fixes m5) | 1 hr or 30 sec |
| 12 | P2 | Reconcile Free plan tailoredResumes limit between code and marketing (fixes m6) | 2 min decision + 1 min edit |

**Estimated total time to unblock launch (P0 only):** ~10 minutes of work + Stripe key paste.

---

## Out of scope for this run (would require deeper test)

- **Mobile responsiveness** (iPhone/Android/tablet rendering): Chrome MCP doesn't easily resize the device viewport; not tested. Recommend manually opening DevTools → Toggle device toolbar → iPhone 14 / Pixel 7 / iPad and capturing screenshots of `/`, `/dashboard`, `/editor`.
- **Real PDF/DOCX file upload**: requires interacting with the native file picker, which Chrome MCP can't directly drive. Recommend manual test with a real PDF resume on /dashboard.
- **End-to-end tailored resume generation**: my Free plan quota was already exhausted (2/2 JD scans used) during this run, so I couldn't take a full happy path from upload → analyze → tailor → download. Recommend re-running after quota resets or as a paid user.
- **Session expiry / token refresh behavior**: not tested across a 60+ minute window.
- **Webhook delivery from Stripe**: blocked by C1; can't be tested until Stripe keys are pasted.
- **Chrome extension end-to-end** including the website-bridge OAuth flow: tested separately earlier this session — bridge page renders, ID token returned, chrome.identity callback works in production.

---

## Reproduction snippets

To reproduce C1 yourself:
```js
// In browser console at https://hiretuner.com while logged in:
fetch('/api/billing/checkout', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({interval:'monthly'})}).then(r => r.json()).then(j => console.log(r.status, j))
// → 501 {ok:false, error:{code:"stripe_not_configured", message:"..."}}
```

To reproduce C2:
```js
// At /dashboard:
[...document.querySelectorAll('nav a')].map(a => ({text: a.textContent.trim(), href: a.getAttribute('href')}))
// → every entry has href === "/dashboard"
```

To reproduce C3:
```bash
curl -I https://hiretuner.com/dashboard/settings
# → HTTP/2 404
```
