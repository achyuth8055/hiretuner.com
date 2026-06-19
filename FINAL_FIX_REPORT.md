# HireTuner — Final Fix Report

**Date:** 2026-06-18
**Engineer:** Claude (Senior Software Engineer mode)
**Commit:** `2e75c4f` on `main` (local, not pushed yet)
**Files changed:** 18 (`668 insertions(+), 205 deletions(-)`)
**Build status:** `npx tsc --noEmit` ✅ clean. `npx eslint` on touched files ✅ clean. `next build --webpack` not runnable from the sandbox (segfaults on bind-mounted node_modules — a known harness limit, not a code issue). The user should run `npm run build` locally before pushing.

---

## P0-1 — Stripe checkout returns 501 with infrastructure-leaking error

**Issue.** `POST /api/billing/checkout` returns `501 stripe_not_configured` with a public-facing error string *"Add your Stripe keys to .env to enable checkout."* visible to end users on the Upgrade Monthly card. The 501 itself is correct (keys aren't on Railway), but the message exposes internal mechanics and the client surfaced it verbatim.

**Root cause.**
1. Production Railway env is missing `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_STARTER_PRICE_ID`, `STRIPE_STARTER_YEARLY_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`. The server correctly short-circuits when these are absent.
2. Both server and client error strings reference `.env` — implementation detail leaking into the UI.

**Fix applied.**
- `src/app/api/billing/checkout/route.ts` — both `stripe_not_configured` and `stripe_price_missing` branches now return the user-friendly `"Payments are temporarily unavailable. Please try again later."` while logging the actionable diagnostic (`STRIPE_SECRET_KEY missing`, `requiredVar: STRIPE_STARTER_YEARLY_PRICE_ID`) server-side via `logger.warn` so the developer still sees what's wrong.
- `src/app/api/billing/portal/route.ts` — same pattern: user sees *"Billing management is temporarily unavailable. Please try again later."*, the missing env var name is logged server-side.
- `src/components/app/PricingCTA.tsx` and `src/components/app/UpgradeButton.tsx` — client-side fallback for `stripe_not_configured` rewritten to *"Payments are temporarily unavailable. Please try again later or contact support@hiretuner.com."* Removed all `.env` mentions from user-visible strings.

**Required environment variables (for the user to set in Railway).** All five are documented in `RAILWAY_ENV.md` lines 60-67:
```
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE_ID=price_...     # monthly $5.49 price ID
STRIPE_STARTER_YEARLY_PRICE_ID=price_...  # yearly $49.99 price ID
```

**Verification evidence.**
- `grep -rn "Add your Stripe keys\|Payments aren't configured" src/` → no matches. All four files have the new message.
- `npx tsc --noEmit` → ✅ no type errors.
- Chrome MCP re-verification deferred until `git push` lands the commit (production still serves old code right now).

**Remaining risks.**
- The 501 will still surface to users (with the new message) until Stripe keys are pasted in Railway. **Action required by user:** paste the five env vars; Railway will redeploy automatically.
- After keys are set, end-to-end paid checkout flow has never been exercised on production. Recommend a single test transaction (`4242 4242 4242 4242`) immediately after keys land.

---

## P0-2 — Sidebar navigation: all 5 non-Dashboard links point to `/dashboard`

**Issue.** Tailor Resume / Applications / Master Resume / Usage / Settings all routed to `/dashboard`, producing a same-page reload instead of taking the user anywhere.

**Root cause.** `src/app/dashboard/layout.tsx` hard-coded `<Link href="/dashboard">` on every entry. The DashboardWorkspace component is a single-page workspace with separate sections; the nav was never wired to anchor or route to those sections.

**Fix applied.**
- `src/app/dashboard/layout.tsx` — each nav `Link` now points to its real target:
  - Tailor Resume → `/dashboard#tailor`
  - Applications → `/dashboard#applications`
  - Master Resume → `/dashboard#master-resume`
  - Usage → `/dashboard#usage`
  - Settings → `/dashboard/settings` (new route, see P0-3)
  - Help Center → `/contact` (was `#`, dead anchor)
- `src/components/app/DashboardWorkspace.tsx` — added `id="tailor"`, `id="applications"`, `id="master-resume"`, `id="usage"` to the four corresponding sections plus `scroll-mt-24` so the sticky topbar doesn't cover them when the user jumps.

**Verification evidence.**
- Inspected file diffs: each Link href matches the section ID exactly.
- `npx tsc --noEmit` ✅ clean.
- Chrome MCP smoke test inside this session against pre-push production confirmed the bug. Post-push, run:
  ```js
  // At /dashboard:
  [...document.querySelectorAll('nav a')].map(a => a.getAttribute('href'))
  // Expected: ["/dashboard", "/dashboard#tailor", "/dashboard#applications",
  //            "/dashboard#master-resume", "/dashboard#usage",
  //            "/dashboard/settings", "/contact"]
  ```

**Remaining risks.**
- Anchor jumping only works if the user is on `/dashboard`. From other routes (e.g. `/editor`), clicking the sidebar still works because the link is `/dashboard#anchor` and Next.js handles the hash on full navigation.
- "Applications", "Master Resume", "Usage" are still sections of the single dashboard page, not standalone routes. If product wants discrete routes with their own URLs later, that's a separate refactor — out of scope for this audit-fix pass.

---

## P0-3 — `/dashboard/settings` returns 404

**Issue.** `curl -I https://hiretuner.com/dashboard/settings` → `HTTP/2 404`. Yet the sidebar has a Settings link.

**Root cause.** Route did not exist.

**Fix applied.**
- `src/app/dashboard/settings/page.tsx` — new server component with sections: Profile (name/email/member-since), Subscription (current plan + Manage Subscription button → opens Stripe billing portal via existing `/api/billing/portal`), Security (change password link → existing `/reset-password`, plus LogoutButton), Danger Zone (account deletion via support email).
- `src/app/dashboard/settings/ManageSubscriptionButton.tsx` — client component that calls `POST /api/billing/portal` and redirects to the returned `portalUrl`, gracefully degrades if billing isn't configured.

**Verification evidence.**
- File exists, imports resolve, `tsc --noEmit` ✅.
- Post-push verification:
  ```
  curl -I https://hiretuner.com/dashboard/settings
  # Expected: HTTP/2 200 (or 307 redirect to /login if logged out)
  ```

**Remaining risks.**
- The "Manage Subscription" button only works for users who have a `stripeCustomerId` in the database — i.e., users who have actually paid. Free users see an "Upgrade" link instead, which routes to `/#pricing`. That's the intended behavior, documented in the page's conditional.

---

## P1-1 — Quota check fires before validation

**Issue.** `POST /api/job-descriptions/analyze` ran `assertUsageAvailable` *before* validating the request body. A typo / accidental empty submit could burn a credit. Same pattern in `POST /api/tailored-resumes`.

**Root cause.** Order of operations: usage gate was the first thing inside `POST(request)`, before `readJson` and the field check.

**Fix applied.**
- `src/app/api/job-descriptions/analyze/route.ts` — moved `readJson` + `rawText.length < 80` check above the `assertUsageAvailable` call. Added a comment explaining the rationale.
- `src/app/api/tailored-resumes/route.ts` — same reorder. `readJson` + `requireString("jobDescriptionId")` + `optionalStringArray("confirmedSkills")` validation now runs before the quota check.

**Verification evidence.**
- Diff in both routes shows validation block hoisted above usage check.
- `npx tsc --noEmit` ✅ clean.
- Post-push verification:
  ```js
  // While logged in with 0 used credits, send empty body — should 422, not 402:
  fetch('/api/job-descriptions/analyze', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({rawText:''})}).then(r => r.status)
  // Expected: 422
  ```

**Remaining risks.**
- Other API routes (the 8 `/api/tools/*` endpoints) already validate before any quota counter; they were already correct. Verified by spot-check during the audit.

---

## P1-2 — `POST /api/resumes/master` returns 500 for non-multipart bodies

**Issue.** Sending `application/json` to `/api/resumes/master` returned `500 Internal Server Error` (the `request.formData()` call threw uncaught).

**Root cause.** `await request.formData()` throws when the body is not `multipart/form-data`. No try/catch around it, so the exception became a 500 with a leaky stack trace.

**Fix applied.** `src/app/api/resumes/master/route.ts` — wrapped `request.formData()` in try/catch. JSON or otherwise non-multipart bodies now return `422 validation_error` with message `"Upload a PDF, DOCX, or TXT resume file using multipart/form-data."`

**Verification evidence.**
- Diff: try/catch block visible.
- `npx tsc --noEmit` ✅ clean.
- Post-push verification:
  ```js
  fetch('/api/resumes/master', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({parsedText:'x'})}).then(r => r.status)
  // Expected: 422 (was 500)
  ```

**Remaining risks.** None expected — the dashboard form always sends multipart, so the happy path is unaffected.

---

## P1-3 — Yearly price inconsistency

**Issue.** Live site says **$49.99/yr** (in pricing card, FAQ, JSON-LD, Terms). Three docs said **$54.99/yr** (`CHROME_STORE_LISTING.md`, `HIRETUNER_SETUP.md`, `RAILWAY_ENV.md`).

**Root cause.** Stale docs from an earlier draft. Live site and code-derived strings were correct; only the docs drifted.

**Fix applied.** Replaced $54.99 → $49.99 in all three doc files:
- `CHROME_STORE_LISTING.md` line referencing Starter pricing in the detailed description.
- `HIRETUNER_SETUP.md` line 31 (Stripe product setup).
- `RAILWAY_ENV.md` line 74 (Stripe price creation instructions).

**Source of truth (declared).** **`$5.49 / month`** and **`$49.99 / year`** as defined in `src/app/(marketing)/page.tsx` lines 56-57 (JSON-LD `Offer` entries) and the visible pricing card text. All future documentation, Stripe product configuration, and Chrome Store listing copy must match these.

**Verification evidence.** `grep -rn "54\.99" makemyresume/ --include="*.md" --include="*.tsx" --include="*.ts" --include="*.json"` → only the audit report references it (as historical context). No code/config references remain.

**Remaining risks.**
- **If you've already submitted the Chrome Web Store listing** with the old $54.99 string in the detailed description, you must edit the listing in the Chrome dev console and resubmit. The store rejects listings whose claims contradict the published site.
- The actual Stripe price IDs in Railway need to point at a $49.99 recurring price (not $54.99). When you create the product in Stripe, ensure the yearly price is set to **$49.99**.

---

## P1-4 — Logged-in users see "Sign In" / "Get Started" in marketing header

**Issue.** The `<Navbar>` rendered the same auth buttons regardless of session state. Logged-in users had no way to get back to `/dashboard` from `/` or any marketing tool page.

**Root cause.** `Navbar` was a static React component that didn't read auth state.

**Fix applied.** `src/components/layout/Navbar.tsx`:
- Converted to `async function Navbar()`.
- Calls `getCurrentUser()` from `@/lib/auth` server-side.
- When authenticated, renders a single **"Open Dashboard"** button → `/dashboard`. When unauthenticated, renders the existing "Sign In" link + "Get Started" button.
- Wrapped the auth check in try/catch so a transient auth backend failure can never break the marketing nav.

**Verification evidence.**
- `npx eslint src/components/layout/Navbar.tsx` ✅ clean.
- `npx tsc --noEmit` ✅ no type errors.
- Post-push verification:
  ```bash
  # As anonymous (no cookie):
  curl -s https://hiretuner.com/ | grep -E "Sign In|Get Started" | head
  # Expected: both present.

  # As authenticated (need session cookie):
  curl -s -H "Cookie: rolefit_session=..." https://hiretuner.com/ | grep -E "Sign In|Get Started|Open Dashboard"
  # Expected: only "Open Dashboard" present.
  ```

**Remaining risks.**
- The marketing layout (`src/app/(marketing)/layout.tsx`) renders Navbar inside `<AdsProvider>`. The Navbar becoming async doesn't change AdsProvider behavior since it's a server component too. No issue expected.
- `getCurrentUser` reads cookies via `next/headers`. If the route is statically rendered, this forces dynamic rendering. The marketing pages already use dynamic data (JSON-LD with current date, etc.) so this isn't a new constraint, but page-rendering perf may take a small hit for the cookie read. Acceptable trade-off.

---

## Build / lint / test status

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ Clean (no errors) |
| `npx eslint` on all 18 touched files | ✅ Clean after fixing one `'` → `&apos;` in Settings page |
| `npm run build` | ⚠ Couldn't run in sandbox (segfault on bind-mounted node_modules) — **user must run locally before pushing** |
| Unit tests | ⚠ No test suite exists in the repo (`package.json` has no `test` script). Not in scope to add. |

---

## Commit & deployment checklist

### What's already done (this session)
- [x] All P0 and P1 code fixes applied
- [x] Pricing docs aligned to $49.99/yr source of truth
- [x] `git commit 2e75c4f` on local `main` with 18 files

### What the user must do (in this exact order)

**1. Verify locally** *(30 seconds)*
```bash
cd "Documents/Website Ideas/makemyresume"
npm run build  # confirm the build succeeds end-to-end
```
If the build fails, paste the error and I'll fix it. Don't proceed until this is clean.

**2. Push** *(30 seconds)*
```bash
git push origin main
```
Railway auto-redeploys. Wait ~90 seconds.

**3. Paste Stripe keys into Railway** *(5 minutes)*
Go to Railway → service → Variables tab → Raw Editor. Add the five vars listed under P0-1. After save, Railway redeploys automatically.

**4. Configure Stripe** *(in Stripe Dashboard, 5 minutes)*
- Products → Add `HireTuner Starter` with **$5.49/mo** and **$49.99/yr** prices. Copy each `price_...` into the matching env var.
- Webhooks → Add endpoint `https://hiretuner.com/api/billing/webhook` listening to `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`. Copy signing secret into `STRIPE_WEBHOOK_SECRET`.

**5. Smoke test in production** *(2 minutes)*
```js
// Open https://hiretuner.com while signed in, paste in console:
const tests = [
  fetch('/dashboard/settings').then(r => ['settings page', r.status]),
  fetch('/api/billing/checkout', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({interval:'monthly'})}).then(r => ['checkout', r.status]),
  fetch('/api/job-descriptions/analyze', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({rawText:''})}).then(r => ['empty JD', r.status]),
  fetch('/api/resumes/master', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({x:1})}).then(r => ['JSON to master', r.status]),
];
Promise.all(tests).then(results => console.table(results));
// Expected after deploy + Stripe keys:
//   settings page → 200
//   checkout → 303 (redirects to Stripe) or 200 with checkoutUrl
//   empty JD → 422 (was 402)
//   JSON to master → 422 (was 500)
```

**6. Verify sidebar in the dashboard UI**
Open `/dashboard`, click each sidebar item, confirm each one moves the viewport to its section (or for Settings, navigates to the new page).

**7. Verify marketing header**
- Anonymous tab → `/` shows "Sign In" + "Get Started".
- Logged-in tab → `/` shows "Open Dashboard" only.

### Unblocked-by-credentials items

The Chrome MCP cannot drive `chrome.google.com/webstore/devconsole` (blocked by Google as documented earlier in this session). If the Chrome Web Store listing was already submitted with the old $54.99 string, edit it directly in the dev console.

---

## Status summary

| ID | Item | Status |
|---|---|---|
| P0-1 | Stripe error UX + env documentation | ✅ Fixed (deploy + paste keys to fully unblock) |
| P0-2 | Sidebar navigation | ✅ Fixed (deploy to land) |
| P0-3 | `/dashboard/settings` 404 | ✅ Fixed (deploy to land) |
| P1-1 | Validation before quota | ✅ Fixed (deploy to land) |
| P1-2 | Resume master 500 → 422 | ✅ Fixed (deploy to land) |
| P1-3 | Pricing consistency | ✅ Fixed |
| P1-4 | Logged-in header state | ✅ Fixed (deploy to land) |
| Build | `next build` | ⚠ User must verify locally (sandbox limit) |
| Push | `git push` | 🟡 Awaiting user action |
| Stripe keys in Railway | env var paste | 🟡 Awaiting user action (cannot do for them — financial-site safety rule) |
| Chrome MCP production re-verification | post-push only | 🟡 Awaiting deploy |
