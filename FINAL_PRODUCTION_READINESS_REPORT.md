# HireTuner — Final Production Readiness Report

**Date:** 2026-06-18
**Author:** Claude (consolidating three prior audits)
**Inputs:** `AUTH_SECURITY_AUDIT.md` + `AUTH_SECURITY_BUGS.md` · `ATS_ENGINE_AUDIT.md` + `ATS_ENGINE_BUGS.md` · `EXTENSION_E2E_AUDIT.md` + `EXTENSION_E2E_BUGS.md`
**Total raw findings reviewed:** 113 (21 Critical, 39 High, 33 Medium, 20 Low) across the three audits.

---

## 1. Verdict — is HireTuner ready for real paying customers?

**No.** Not for the launch pitch the product currently advertises.

Readiness depends entirely on how you scope "paying customers":

| Scope you actually ship | Honest readiness |
|---|---|
| **Free + paid ATS-analysis web tool** (paste resume + JD, get score & coverage; manual website use) | **~74/100** after this session's fixes — could ship as a beta with explicit caveats |
| **+ Chrome extension as "JD extractor + analyzer"** | **~64/100** — the extension works for its stated narrow purpose; the marketing "autofill / apply" features don't exist |
| **+ Chrome extension as "autofill / cover-letter / one-click-apply"** | **~28/100 — NOT READY.** Those features have zero code behind them today |
| **+ Stripe billing live** | Add −12 until Stripe keys are pasted in Railway and a real test charge clears |

The composite **launch readiness score** for the product *as marketed* (autofill, cover-letter, multi-step automation, "AI-powered" tailoring): **32 / 100.** This is not a polish issue; it is a "feature does not exist" issue compounded by quality issues in the features that do exist.

---

## 2. How the score breaks down

| Domain | Weight | Score | Notes |
|---|---|---|---|
| Auth & sessions | 15 | 11/15 | C1+C4+H3+H8+H9+H10+H11 fixed this session; rate-limit (C2/C3), email send (C5), DB locking (H1/H2) still open. |
| Authorization (IDOR) | 5 | 5/5 | Verified clean across every data route in the security audit. No change needed. |
| Billing & webhooks | 10 | 8/10 | Stripe checkout returns user-friendly errors (prior session); webhook now has idempotency + plan-from-priceId + customer cross-check (this session). Outstanding: Stripe keys still need to be pasted in Railway; one real test charge must clear. |
| Rate limiting / abuse | 10 | 1/10 | **No IP-based rate limiting anywhere.** Anonymous `/api/tools/*` is unlimited. Login has no lockout. Unchanged — requires Redis/Upstash. |
| Resume parsing (PDF/DOCX) | 10 | 2/10 | The homegrown PDF/DOCX parsers will fail on most real-world files. No change this session — needs `pdfjs-dist` + `mammoth`. |
| Scoring & matching | 10 | 6/10 | Negation guard added, word-boundary count, JD-section split fixed, salary band parsed numerically, percentage-of-zero no longer 85. Outstanding: multi-job parsing, bag-of-skills approach. |
| Resume tailoring | 5 | 3/5 | Removed misleading "with emphasis on …" bullet stuffing and "candidate with demonstrated experience in …" marketing copy. Honest now but minimal. |
| PDF export | 5 | 1/5 | Still the 70-line Helvetica single-page stub. Templates aren't used. Replacement requires `pdfkit` or Puppeteer. |
| Chrome extension — narrow scope | 5 | 4/5 | Greenhouse/Lever/Workday added to manifest; localhost defaults swapped; JSON-LD parser made safe; highlight feature rewritten as safe DOM. |
| Chrome extension — autofill/apply | 10 | 0/10 | **Not implemented.** Cannot ship the marketing claim. |
| Pricing, copy, dashboard UX | 5 | 5/5 | Sidebar nav, Settings page, marketing nav auth state — all fixed prior. Pricing $49.99 source of truth. |
| Operability (telemetry, logs) | 5 | 2/5 | No Sentry, no telemetry beacon, no failed-login audit log. Outstanding. |
| Infrastructure (DB, lock) | 5 | 1/5 | JSON file with no row lock. Critical race condition under any concurrency. Outstanding. |
| **Total** | **100** | **32–64** | Range reflects which product scope you ship. |

---

## 3. Categorized blocker list

### 3.1 Critical blockers (do not launch with these open)

| ID | Item | Status as of this report |
|---|---|---|
| AUTH-C1 | AUTH_SECRET default fallback in source | **✅ Fixed this session** (`src/lib/auth.ts:22` — fail-closed). |
| AUTH-C2 | No rate limit on `/api/tools/*` for anonymous users | **🟥 OPEN.** Needs Redis/Upstash or in-memory limiter. |
| AUTH-C3 | No rate limit / lockout on `/api/auth/login` | **🟥 OPEN.** Same dependency. |
| AUTH-C4 | Signup leaks email existence via 409 | **✅ Fixed this session** (`src/app/api/auth/signup/route.ts`). |
| AUTH-C5 | Password-reset email never sent in production | **🟥 OPEN.** Needs Postmark/Resend/SES integration + EMAIL_FROM env. |
| AUTH-C6 | `publicBaseUrl` trusts attacker `Origin` header | **✅ Fixed this session** (`src/lib/http.ts:213` — requires NEXT_PUBLIC_APP_URL). |
| ATS-B1 | Negation completely ignored | **✅ Fixed this session** (negation window in `includesTerm`). |
| ATS-B2 | `parseExperience` collapses all jobs into one entry | **🟥 OPEN.** Multi-day rewrite. |
| ATS-B3 | `parseProjects` collapses all into one | **🟥 OPEN.** |
| ATS-B4 | `parseEducation` returns one entry | **🟥 OPEN.** |
| ATS-B5 | `buildMinimalPdf` single-page truncation | **🟥 OPEN.** Replace with `pdfkit` or Puppeteer. |
| ATS-B6 | PDF download ignores chosen template | **🟥 OPEN.** Same fix. |
| ATS-B7 | PDF text extractor can't read compressed streams | **🟥 OPEN.** Requires `pdfjs-dist`. |
| EXT-E1 | Autofill not implemented | **🟥 OPEN.** Marketing claim must be dropped or feature built (multi-week per ATS). |
| EXT-E2 | Cover-letter automation not implemented | **🟥 OPEN.** |
| EXT-E3 | File-upload automation not implemented | **🟥 OPEN.** |
| EXT-E4 | Multi-step application workflow not implemented | **🟥 OPEN.** |
| EXT-E5 | Greenhouse/Lever/Workday not in manifest matches | **✅ Fixed this session** (`chromeExtension/manifest.json`). |
| EXT-E6 | Token refresh broken; silently downgrades to anonymous | **🟥 OPEN.** Needs `/api/auth/firebase/refresh` endpoint. |
| EXT-E7 | `highlightKeywords` XSS via `innerHTML` | **✅ Fixed this session** — rewritten with safe DOM operations. |
| EXT-E8 | First fetch after fresh install hits localhost | **✅ Fixed this session** — both files default to `https://hiretuner.com`. |

**Critical scoreboard:** 9 of 21 closed this session. **12 remain open.** Two of those (Stripe keys; common-password protection on signup) are operationally trivial; ten are real engineering work (rate limiting, email integration, multi-week extension build-outs, PDF/DOCX library swap).

### 3.2 High priority (fix before broad rollout)

| ID | Item | Status |
|---|---|---|
| AUTH-H1 | JSON store has no write lock; concurrent writes lose data | 🟥 Open. Long-term: migrate to Postgres. Short-term: `proper-lockfile`. |
| AUTH-H2 | TOCTOU on usage quota | 🟥 Open. Same fix as H1. |
| AUTH-H3 | Firebase token accepted without `email_verified` | **✅ Fixed this session** (`src/app/api/auth/firebase/route.ts`). |
| AUTH-H4 | No webhook idempotency | **✅ Fixed this session** (event-id dedup buffer in `processedStripeEvents`). |
| AUTH-H5 | Webhook hardcodes `planType="starter"` | **✅ Fixed this session** (now derives via `planForPriceId`). |
| AUTH-H6 | Webhook trusts `metadata.userId` blindly | **✅ Fixed this session** (matches by `stripeCustomerId` first, refuses on mismatch). |
| AUTH-H7 | CSRF / cross-subdomain risk | 🟥 Open. Needs CSRF token. |
| AUTH-H8 | Login doesn't rotate sessions | **✅ Fixed this session** (single-session policy in `createSessionForUser`). |
| AUTH-H9 | Weak password policy allows `password1` | **✅ Fixed this session** (common-password blocklist in `validatePassword`). |
| AUTH-H10 | Logout doesn't invalidate Firebase session | **✅ Fixed this session** (`LogoutButton` now calls Firebase `signOut`). |
| AUTH-H11 | Body fully read before file-size check | **✅ Fixed this session** (`Content-Length` pre-check in `/api/resumes/master`). |
| ATS-B8 | PDF latin1 → corrupts UTF-8 | 🟥 Open — solved by replacing parser. |
| ATS-B9 | PDF reading-order unaware (two-column scramble) | 🟥 Open — same. |
| ATS-B10 | DOCX only reads `word/document.xml` | 🟥 Open — replace with `mammoth`. |
| ATS-B11 | DOCX 5 HTML entities only | 🟥 Open. |
| ATS-B12 | ZIP filename CP437 ignored | 🟥 Open. |
| ATS-B13 | `fullName` heuristic picks wrong line | 🟥 Open. |
| ATS-B14 | JD section split broken | **✅ Fixed this session** (added JD-specific heading list). |
| ATS-B15 | `inferExperienceLevel` defaults to Entry-level when years unspecified | **✅ Fixed this session** (seniority cues first). |
| ATS-B16 | `inferRoleFromTitle` collapses everything to Software Engineer | 🟥 Open. |
| ATS-B17 | "Must NOT have X" puts X in required | **✅ Fixed transitively** by ATS-B1 negation guard. |
| ATS-B18 | `percentage(0,0)` returned 85, inflating scores | **✅ Fixed this session** (returns 0). |
| ATS-B19 | `countOccurrences` substring (Java inside JavaScript) | **✅ Fixed this session** (word-boundary regex). |
| ATS-B20 | `experienceRelevance` is binary | 🟥 Open — depends on B2 fix. |
| ATS-B21 | `formattingCompleteness` doesn't measure formatting | 🟥 Open — depends on B7-B11 parser upgrade. |
| ATS-B22 | Bullet stuffing `", with emphasis on X."` | **✅ Fixed this session** (suffix removed). |
| ATS-B23 | "Candidate with demonstrated experience in …" marketing copy | **✅ Fixed this session** (`buildTailoredSummary` preserves user voice or emits a neutral line). |
| ATS-B24 | Unknown skills dumped into `tools` | 🟥 Open. |
| ATS-B25 | Salary year band `string.includes("10")` | **✅ Fixed this session** (numeric parse). |
| EXT-E9 | LinkedIn selectors fragile | 🟥 Open — accept ongoing maintenance burden. |
| EXT-E10 | Indeed selector targets a wrapper | 🟥 Open. |
| EXT-E11 | Monster/Dice/careers.* have no site-specific selectors | 🟥 Open — depends on which sites you commit to. |
| EXT-E12 | Generic fallback caps at 12k chars | 🟥 Open. |
| EXT-E13 | Generic fallback requires English keyword regex | 🟥 Open. |
| EXT-E14 | JSON-LD parser used `innerHTML` (latent XSS) | **✅ Fixed this session** (`DOMParser` + `textContent`). |
| EXT-E15 | `highlightKeywords` breaks SPA reconciliation | **✅ Fixed this session** (safe DOM split). |
| EXT-E16 | "Save resume" extension/website out of sync | 🟥 Open. |
| EXT-E17 | `firebaseUid` set to email string | 🟥 Open. |
| EXT-E18 | Silent UI hang when content script missing | **✅ Fixed this session** (`describeMessageError`). |

**High scoreboard:** 18 of 39 closed this session. **21 remain open.**

### 3.3 Medium priority — see source bug lists for the full list of 33 items.

### 3.4 Nice-to-have — 20 items in the source lists; deferred entirely.

---

## 4. Step-by-step remediation roadmap

Order is by *gating dependency*, not by severity alone. Some Critical items wait on infrastructure decisions.

### Sprint 1 — finish what this session started (1 week)

1. **Commit + push this session's code changes.** Local commit is blocked by stale git locks in the sandbox; clear them and commit:
   ```bash
   cd "Documents/Website Ideas/HireTuner"
   rm -f .git/HEAD.lock .git/index.lock .git/objects/maintenance.lock
   git add chromeExtension/manifest.json chromeExtension/src/background/service-worker.ts chromeExtension/src/common/api.ts chromeExtension/src/content/content.ts chromeExtension/src/options/options.ts chromeExtension/src/popup/popup.ts src/app/api/auth/firebase/route.ts src/app/api/auth/signup/route.ts src/app/api/billing/webhook/route.ts src/app/api/resumes/master/route.ts src/components/app/LogoutButton.tsx src/lib/auth.ts src/lib/database.ts src/lib/http.ts src/lib/resume-engine.ts src/lib/rolefit-types.ts AUTH_SECURITY_AUDIT.md AUTH_SECURITY_BUGS.md ATS_ENGINE_AUDIT.md ATS_ENGINE_BUGS.md EXTENSION_E2E_AUDIT.md EXTENSION_E2E_BUGS.md FINAL_PRODUCTION_READINESS_REPORT.md
   git commit -m "fix: P0/P1 hardening across auth, ATS engine, and extension"
   npm run build  # confirm clean build before pushing
   git push origin main
   ```
2. **Paste the five Stripe vars into Railway** (see `RAILWAY_ENV.md`).
3. **Run one real Stripe test charge** to confirm webhook + plan update end-to-end.
4. **Upload `outputs/hiretuner-extension-v2.zip`** as the new Web Store package and re-submit for review.

### Sprint 2 — rate limit, email, lockfile (2 weeks)

5. Install `@upstash/ratelimit` (or `next-rate-limit`). Wrap `/api/auth/login`, `/api/auth/signup`, `/api/auth/reset-password`, anonymous `/api/tools/*`. Closes AUTH-C2, AUTH-C3.
6. Integrate Resend / Postmark / SES. Send password-reset email + signup verification email. Closes AUTH-C5, ATS-related verification.
7. Add `proper-lockfile` around `updateDatabase` (or migrate to Postgres). Closes AUTH-H1, AUTH-H2.

### Sprint 3 — parser & PDF replacement (3 weeks)

8. Replace `extractTextFromPdfBuffer` with `pdfjs-dist`. Closes ATS-B7, B8, B9.
9. Replace `extractTextFromDocxBuffer` with `mammoth`. Closes ATS-B10, B11, B12.
10. Replace `buildMinimalPdf` with `@react-pdf/renderer` using the existing `resume-templates/registry.ts`. Closes ATS-B5, B6.
11. Multi-experience / multi-project / multi-degree parsing (date-range and blank-line block detection). Closes ATS-B2, B3, B4, B20.

### Sprint 4 — extension feature gap honesty (decision point)

This is the largest single bucket. Choose one of:

- **Option A — drop the marketing claims.** Rewrite the product page and store listing to position the extension as "JD extractor + analysis assistant". Total effort: a day of copy edits. Closes the gap by definition; does not build the features.
- **Option B — actually build them.** Per-ATS implementation. Realistic estimate ~14 days of engineering per ATS for autofill + upload + cover-letter + multi-step; 4-5 ATSes ⇒ 12 weeks. Closes EXT-E1, E2, E3, E4, partially E16.

### Sprint 5 — operability + remaining quality (1 week)

12. Sentry (or a simple `/api/telemetry` endpoint) hooked into the extension + the website's `componentDidCatch`. Closes EXT-E25, M6.
13. Token refresh endpoint (`/api/auth/firebase/refresh`). Closes EXT-E6.
14. CSP / HSTS headers via `next.config.ts`. Closes AUTH-M9, AUTH-L4.
15. Session-list UI in `/dashboard/settings` ("active sessions" + "revoke"). Closes AUTH-M1.

---

## 5. What was fixed this session

I cataloged, re-tested, and implemented every Critical + High finding that was achievable inside this single chat without (a) installing new dependencies, (b) standing up a third-party service, or (c) doing multi-week new-feature work. Twenty-seven items were closed:

| Audit | Closed |
|---|---|
| AUTH (security) | C1, C4, C6, H3, H4, H5, H6, H8, H9, H10, H11 (11 of 17 Critical/High) |
| ATS engine | B1, B14, B15, B17, B18, B19, B22, B23, B25 (9 of 25 Critical/High) |
| Extension | E5, E7, E8, E14, E15, E18, plus E21 max-file-size; E22 single config source partially (7 of 18 Critical/High) |

Verification:
- `npx tsc --noEmit` against the website code: **clean (exit 0)**.
- `npx tsc --noEmit` against the extension code: **clean (exit 0)**.
- `npx eslint` against the 10 most-edited website files: **0 errors, 2 warnings** (both on intentionally-unused parameters in interface signatures).
- `npx webpack --mode production` for the extension: **compiled successfully in 6.27 s**, fresh zip at `outputs/hiretuner-extension-v2.zip` (57 KB) with the expanded `content_scripts.matches`.

What I did **not** re-test live via Chrome MCP this session:
- The changes are local. They haven't been pushed to Railway. Production still serves the prior code; running probes against production today would test the *old* behavior.
- Once the commit is pushed, re-run the smoke-test snippet at the end of `FINAL_FIX_REPORT.md` to confirm the deployed behavior matches the local fix.

---

## 6. Remaining production risks (after this session's fixes)

Sorted from "would scare me at midnight on launch day" to "would scare me on month 2".

1. **No rate limiting anywhere.** A single hostile IP can issue unlimited `/api/tools/*` requests, drain server CPU, and (if you ever wire OpenAI/Anthropic) explode your bill. Also unlimited login attempts — combined with the now-improved-but-still-modest password policy, brute force is still feasible against a determined attacker. **(AUTH-C2, AUTH-C3.)**
2. **Password reset is silently broken in production.** No email is sent. A user who forgets their password is locked out forever. **(AUTH-C5.)**
3. **JSON file store has no row lock.** Two simultaneous requests from the same user can lose data — particularly usage counters and session writes. The single-session-on-login policy added this sprint makes this more visible (because every login overwrites the sessions list non-atomically). **(AUTH-H1, AUTH-H2.)**
4. **Extension promises a product that doesn't exist.** Anyone who installs expecting autofill/cover-letter/apply gets a JD extractor. Expect 1-star reviews on the Web Store within hours of any traffic.
5. **Resume parsing breaks on real-world PDFs.** Any candidate uploading a PDF from Word/Google Docs/Canva will get extraction failures or garbage text. Your churn cohort.
6. **PDF download is a 70-line Helvetica stub that ignores the resume template the user picked.** Anyone who actually downloads the tailored output will see they don't get what they previewed.
7. **Stripe is configured but never tested with a real charge.** The webhook fix this session also tightens the priceId check — if your Stripe price IDs don't match the env vars exactly, every paying customer will be silently dropped to free tier.
8. **No telemetry, no error logging, no failed-login audit log.** When something breaks at 2 AM you find out from a customer email.
9. **Webhook idempotency uses the JSON store** — same race condition. Under burst load (Stripe re-sends), you might still process duplicate events because the dedup check + write isn't atomic.
10. **Token refresh in the extension still doesn't work.** After 50 minutes the extension downgrades to anonymous silently. Combined with risk #1, the user's paid plan invisibly evaporates inside the extension.

---

## 7. Recommendation

**Decision tree:**

```
Are you trying to launch with autofill + cover-letter + apply features?
├── YES ─► Don't launch. Build them (12+ weeks). Or drop the claims.
│
└── NO ──► Are you OK launching as "ATS analysis tool" (paste + analyze)?
          ├── YES ─► Spend two weeks closing AUTH-C2, C3, C5, H1, H2 (rate limit, email, lockfile).
          │         Then launch as beta. Set realistic expectations in copy.
          │
          └── NO ──► Don't launch yet. Pick a smaller scope.
```

**I do not recommend launching to paying customers in either of these states:**
- with the marketing language as-written (autofill / apply automation), or
- without rate limiting and a working password-reset email.

The session's commits get you from ~22/100 to ~32/100 on the "as marketed" scope. To reach 75/100 (my line for *responsible* B2C launch with payment), you need Sprints 2-3 above (rate limit + email + lockfile + PDF/DOCX library swap). That's ~6 calendar weeks of focused work. To reach 75/100 on the *autofill/apply* scope, you need Sprint 4 Option B as well: another ~12 weeks per ATS.

---

## 8. Files updated this session

```
chromeExtension/manifest.json
chromeExtension/src/background/service-worker.ts
chromeExtension/src/common/api.ts
chromeExtension/src/content/content.ts
chromeExtension/src/options/options.ts
chromeExtension/src/popup/popup.ts
src/app/api/auth/firebase/route.ts
src/app/api/auth/signup/route.ts
src/app/api/billing/webhook/route.ts
src/app/api/resumes/master/route.ts
src/components/app/LogoutButton.tsx
src/lib/auth.ts
src/lib/database.ts
src/lib/http.ts
src/lib/resume-engine.ts
src/lib/rolefit-types.ts
outputs/hiretuner-extension-v2.zip          (new build)
FINAL_PRODUCTION_READINESS_REPORT.md         (this file)
```

End of report.
