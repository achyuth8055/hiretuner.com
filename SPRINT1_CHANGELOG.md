# Sprint 1 — Changelog

Tag: `sprint-1` (pending push)
Date: 2026-06-19
Scope: marketing cleanup, rate limiting, login protection, signup protection, password reset email integration, extension token refresh, telemetry beacon, console-log gating, quick wins (12k cap, devResetToken gate, stale Stripe ID verification), pre-existing lint fix in `ExtensionAuthBridge.tsx`.

---

## Added

- **`src/lib/rate-limit.ts`** — In-memory per-key rate limiter with `Map`-based bucket store, automatic pruning, and 429-with-Retry-After helper. Stable surface so a swap to Upstash Redis in Sprint 4 is mechanical.
- **`src/lib/email.ts`** — Resend-backed email send wrapper with graceful no-op when `RESEND_API_KEY` is missing or the npm package isn't installed. Currently exports `sendPasswordResetEmail()`.
- **`src/app/api/telemetry/route.ts`** — Anonymous, rate-limited POST endpoint that the extension and the website error boundary call to report `extraction_failed`, `api_error`, `unhandled`, `navigation_error`. CORS-enabled for the extension origin.
- **`src/app/api/auth/firebase/refresh/route.ts`** — Accepts a still-valid Firebase ID token, verifies it, and mints a custom token so the extension can sign back in silently without re-running the user-visible bridge flow.
- **`chromeExtension/src/common/debug.ts`** — Single source of truth for debug-gated logging in the extension. Reads `chrome.storage.sync.debug` with a 10-second cache.
- **`chromeExtension/src/common/telemetry.ts`** — Best-effort fire-and-forget client beacon that the extension calls on extraction failures, API errors, and unhandled exceptions.

## Changed

- **`src/lib/site.ts`** — Replaced "AI Resume Tailoring Tool" / "safe AI suggestions" claims with honest description focused on keyword gap analysis and bullet reordering.
- **`src/app/(marketing)/page.tsx`**:
  - Hero subhead rewritten ("HireTuner reads the JD, surfaces the keywords your resume is missing, and helps you reorder your strongest bullets…").
  - Added "Beta — Free during launch" pill above the H1.
  - "Advanced AI Rewriting Engine" → "Resume Tailoring Engine" in both Starter cards and the FAQ entry.
  - Chrome extension promo paragraph rewritten to accurately describe extract-and-analyze (not "instantly generate tailored resumes directly from LinkedIn").
  - Fabricated `aggregateRating: 4.8 / 1200 reviewCount` removed from the SoftwareApplication JSON-LD with a comment explaining why.
- **`CHROME_STORE_LISTING.md`** — Detailed description and single-purpose blurb rewritten to drop "AI-powered" / "Advanced AI rewriting engine"; added an explicit *"Note: HireTuner does NOT autofill or auto-submit applications"* line for store-review accuracy.
- **`src/app/api/auth/login/route.ts`** — Two-tier rate limit (per-IP and per-account), failed-login audit log, generic 401 message preserved. AUTH-C3 + AUTH-M6 closed.
- **`src/app/api/auth/signup/route.ts`** — Added per-IP signup throttle (10/hour). AUTH-C2 supporting fix.
- **`src/app/api/auth/reset-password/route.ts`** — Added per-IP throttle (5/hour), wired to `sendPasswordResetEmail`, and dev-token echo now requires `HIRETUNER_DEV_RESET=1` instead of any non-prod env. AUTH-C5 + AUTH-L1 closed.
- **`src/lib/public-tool-storage.ts`** — Anonymous calls into `/api/tools/*` now hit a 20 req / 15 min per-IP bucket before they reach the handler. AUTH-C2 closed for anonymous traffic.
- **`chromeExtension/manifest.json`** — Content script matches now include all the ATS-driven boards added in Sprint 0 (Greenhouse, Lever, Workday, Workable, Ashby). No further changes this sprint.
- **`chromeExtension/src/content/content.ts`**:
  - Generic fallback upper-bound raised 12k → 100k characters (EXT-E12).
  - Added telemetry beacon on JD-extraction failure.
  - Init log gated through `dlog()`.
- **`chromeExtension/src/background/service-worker.ts`** — All `console.log` → `dlog('Background', …)`. Silent in production.
- **`chromeExtension/src/popup/popup.ts`** — Init log gated through `dlog('Popup', …)`.
- **`chromeExtension/src/common/api.ts`** — Added telemetry beacon on fetch throws and on unexpected (≠ 422/402/429) API errors.
- **`chromeExtension/src/common/auth.ts`**:
  - Token refresh in the 50–58-minute window now calls `/api/auth/firebase/refresh` and uses `signInWithCustomToken` to re-establish the Firebase client session. EXT-E6 closed.
  - Removed unused `signInWithCredential` and `GoogleAuthProvider` imports.
- **`src/app/extension-auth/ExtensionAuthBridge.tsx`** — Refactored initial-state derivation out of `useEffect` to fix `react-hooks/set-state-in-effect` lint error that was blocking the production build.

## Documentation

- Updated `CHROME_STORE_LISTING.md` for review-accuracy.
- This file plus `SPRINT1_COMPLETION_REPORT.md`.

## Removed

- Unused `signInWithCredential` / `GoogleAuthProvider` imports in extension auth.
- Fabricated review-count claim in homepage JSON-LD.

## Files modified

Website (10):
```
src/app/(marketing)/page.tsx
src/app/api/auth/login/route.ts
src/app/api/auth/signup/route.ts
src/app/api/auth/reset-password/route.ts
src/app/api/telemetry/route.ts                       (new)
src/app/api/auth/firebase/refresh/route.ts           (new)
src/app/extension-auth/ExtensionAuthBridge.tsx
src/lib/email.ts                                     (new)
src/lib/rate-limit.ts                                (new)
src/lib/public-tool-storage.ts
src/lib/site.ts
```

Extension (7):
```
chromeExtension/manifest.json (already updated in Sprint 0; unchanged here)
chromeExtension/src/background/service-worker.ts
chromeExtension/src/common/api.ts
chromeExtension/src/common/auth.ts
chromeExtension/src/common/debug.ts                  (new)
chromeExtension/src/common/telemetry.ts              (new)
chromeExtension/src/content/content.ts
chromeExtension/src/popup/popup.ts
```

Docs:
```
CHROME_STORE_LISTING.md
SPRINT1_COMPLETION_REPORT.md                         (new)
SPRINT1_CHANGELOG.md                                 (new — this file)
```

## Build artifacts

```
outputs/hiretuner-extension-sprint1.zip              (58 KB — Web Store upload)
```

## Required env variables (Railway)

New since prior sprint:
```
RESEND_API_KEY=re_...                # Required for password reset emails
EMAIL_FROM=HireTuner <support@hiretuner.com>   # Optional override (default shown)
HIRETUNER_DEV_RESET=0                # Set to "1" ONLY in non-prod local dev to echo reset tokens
```

Unchanged but still required:
```
NEXT_PUBLIC_APP_URL=https://hiretuner.com
AUTH_SECRET=<32+ random chars, see Sprint 0>
FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY
STRIPE_SECRET_KEY / NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY / STRIPE_STARTER_PRICE_ID /
  STRIPE_STARTER_YEARLY_PRICE_ID / STRIPE_WEBHOOK_SECRET
```

## Required `npm install` on deploy host

```
npm install resend
```

The website builds and serves cleanly without `resend` installed — `sendPasswordResetEmail` logs a warning and skips the send. Install it once before turning the email path on.
