# HireTuner — Launch Roadmap

**Date:** 2026-06-18
**Author:** Claude, consolidating open items from `AUTH_SECURITY_BUGS.md`, `ATS_ENGINE_BUGS.md`, `EXTENSION_E2E_BUGS.md`, and the closed-vs-open accounting in `FINAL_PRODUCTION_READINESS_REPORT.md`.
**Scope:** only OPEN items as of this report. Issues already closed in prior sessions are excluded. Issue IDs match the source bug lists exactly so you can cross-reference.

This is the planning document. No new audit; no new code in this file. The output is a phased work plan, a marketing-language audit, and a launch recommendation.

---

## Executive snapshot

**What still has to happen before you have a defensible product to charge money for:**

| Phase | Items open | Engineering effort (focused work) | Decision needed |
|---|---|---|---|
| **Phase 1** — Before *any* public launch | 9 issues | ~5 days | None — these are unambiguous blockers |
| **Phase 2** — Before charging real money | 11 issues | ~14 days | Pick an email provider; pick a rate-limit backend |
| **Phase 3** — Before scale (>1k MAU) | 18 issues | ~25 days | Migrate to Postgres? Build telemetry? |
| **Phase 4** — Future features (apply automation, etc.) | 14 issues | ~12 weeks per ATS | Build, buy, or drop the claim |

**Total open issues:** ~52 (consolidated; some prior issues now partially closed and are listed only for the residual work).

---

## 1. What "launch" can mean — and what's actually viable

Four candidate framings. The roadmap lists which Phase-1 items each one requires.

### 1.1 ATS Resume Optimizer (anonymous + free tier)
**Promise:** "Paste your resume and a job description, get an ATS-style score and keyword gap analysis."
- Required Phase-1 issues: AUTH-C2, AUTH-C3 (rate limits), AUTH-C5 (password reset email), AUTH-H7 (CSRF / basic hardening), AUTH-L1 (devResetToken leak).
- **Verdict:** viable as a free / freemium beta after Phase 1. ~5 days.

### 1.2 Resume Tailoring Tool (paid)
**Promise:** "Generate a tailored resume that recruiters actually want to receive."
- Required Phase-1 + Phase-2 issues: everything above plus ATS-B2/B3/B4 (multi-experience parsing), ATS-B5/B6 (real PDF rendering with templates), ATS-B7/B8/B9 (real PDF text extraction), ATS-B10/B11/B12 (real DOCX extraction).
- **Verdict:** not viable until Phase 2 is done. Otherwise customers pay for a Helvetica plain-text PDF that doesn't match the preview. ~3-4 weeks.

### 1.3 JD Analyzer (web + free anonymous use)
**Promise:** "Paste a job description, get the keyword breakdown."
- Required Phase-1: AUTH-C2 only.
- **Verdict:** viable today (after Phase 1 rate-limit fix) — this is the lowest-friction product to ship. ~2 days to harden.

### 1.4 Chrome Extension for JD Extraction
**Promise:** "One-click extract the JD from any supported job site."
- Required Phase-1: EXT-E6 (token refresh) and drop all autofill/apply language.
- **Verdict:** viable after one focused day on EXT-E6 + marketing cleanup.

**The minimum viable launch is a *combination* of 1.3 + 1.4 (JD Analyzer + JD Extractor extension), with 1.1 layered on later.** Don't ship 1.2 until Phase 2.

---

## 2. Phase 1 — Must Fix Before *Any* Launch

These are the items where shipping anything to the public without fixing them creates security, compliance, or trust damage that cannot be walked back.

| ID | Severity | Description | Effort (hrs) | Depends on | Business impact | Implementation approach |
|---|---|---|---|---|---|---|
| **AUTH-C2** | Critical | No rate limit on `/api/tools/*` for anonymous users. Unlimited free AI/CPU use, trivial DOS, infinite cost if you ever wire OpenAI. | **6** | Pick a backend: in-memory (single instance), Redis (Upstash), or `@vercel/edge-rate-limit`. | Existential cost risk; abuse vector. | Add per-IP bucket (e.g. 20 / 15 min) inside `enforceToolUsage` before the work runs. Cheapest: in-memory `Map` in module scope (acceptable for a single-instance Railway deploy until Phase 3). |
| **AUTH-C3** | Critical | No rate limit / lockout on `/api/auth/login`. Brute force is unbounded. | **3** | Same backend. | Account takeover vector — combined with merely-OK password policy. | Per-(IP, email) tuple. 5 fails in 15 min → 429 with Retry-After. After 20 fails in 1h → lock 30 min + log. |
| **AUTH-C5** | Critical | Password reset email is never sent in production — silently broken recovery. | **8** | Pick provider: Resend (easiest), Postmark, SES. Add env: `EMAIL_FROM=support@hiretuner.com`, `EMAIL_PROVIDER_API_KEY=…`. | Locked-out users can never recover; permanent customer loss + support burden. | Drop-in: `await resend.emails.send({from, to, subject, html})` inside `/api/auth/reset-password`. ~2h of plumbing once the API key is in Railway. |
| **AUTH-H7** | High | No CSRF token. SameSite=Lax mitigates same-site POSTs but a subdomain XSS would bypass. | **4** | None. | Defense-in-depth; relevant if a `*.hiretuner.com` subdomain is added. | Double-submit cookie: set a non-httpOnly `csrf` cookie + require `X-CSRF-Token` header on POST/PATCH/DELETE. Wire in `requireApiUser`. |
| **AUTH-L1** | Low → upgraded to Phase 1 | `devResetToken` is returned in the response when `NODE_ENV !== "production"`. If anyone runs preview/staging with traffic, token leaks. | **0.5** | None. | Compliance & operational hygiene. | Hard gate: only echo if `process.env.HIRETUNER_DEV_RESET === "1"`. |
| **EXT-E6** | Critical | Extension token silently expires after 50 min and downgrades to anonymous. Paid users invisibly lose plan benefits. | **8** | Server-side: new `/api/auth/firebase/refresh` route OR signInWithCredential plumbing inside extension. | Paying customers think the extension stopped honoring their plan; they churn. | Server route accepts the still-valid cached ID token, re-mints. Client calls refresh between 50-58 min. ~6h server + ~2h client. |
| **EXT-E25** | Medium → upgraded to Phase 1 | No telemetry / error reporting anywhere in the extension. When LinkedIn changes their DOM, 100% of users break silently. | **3** | None. | Operational visibility = baseline launch requirement. | Tiny `POST /api/telemetry/error {kind, message, host, version}` route + 5 lines in content/popup catch blocks. No PII. |
| **EXT-E30** | Low → upgraded to Phase 1 | `console.log` statements emit in production extension. | **0.5** | None. | Looks unprofessional in users' devtools. | Wrap in `if (await getDebugFlag())`. |
| **MARKETING** | Critical | Marketing copy promises "autofill / cover letter / one-click apply / multi-step automation". The code implements none of it. | **8** (copy + design) | None. | Fraud risk: customers paid for features they don't get. Web Store reviews tank within hours of any traffic. | See §6 below — explicit list of strings to remove from product page, manifest description, screenshots, and Chrome Web Store listing. |

**Phase 1 total:** 9 issues. ~40 hours (~5 focused engineering days + 1 day marketing).

**Outcome after Phase 1:** rate-limited site that doesn't silently lose customers, working password reset, extension that doesn't silently degrade, accurate product messaging. **At this point you can defensibly run a free beta launch of the JD Analyzer + JD Extractor extension.**

---

## 3. Phase 2 — Must Fix Before Charging Real Money

Items that make the paid product worth paying for. Skipping any of these means a paying customer in their first session encounters something visibly broken or misleading.

| ID | Severity | Description | Effort (hrs) | Depends on | Business impact | Implementation approach |
|---|---|---|---|---|---|---|
| **AUTH-H1** | High | JSON store has no write lock. Concurrent writes lose data — including subscription updates, sessions, usage counters. | **6** | None. | Stripe webhook + concurrent user action = lost subscription. Refund risk. | Wrap `updateDatabase` in `proper-lockfile` mutex with retry. Postgres migration is the long-term fix — put it on Phase 3. |
| **AUTH-H2** | High | TOCTOU on quota check; N concurrent requests bypass cap by N×. | **2** (after H1) | AUTH-H1. | Paid customer at limit can bypass cap by parallel requests; free user at 1/1 can produce many tailored resumes. | Move the cap check inside the same `updateDatabase` mutation as the increment. |
| **AUTH-M3** | Medium → upgraded | `customer_email` round-trips through Stripe events; ties email to account in third-party logs. | **2** | None. | Privacy / GDPR. | Create Stripe customer at signup (or first upgrade) via `customers.create({email})`; pass only `customer` (not `customer_email`) to checkout. |
| **AUTH-M5** | Medium | `subscription.deleted` keeps stale `stripeSubscriptionId` after cancel. | **1** | None. | Re-subscription confusion. | One line: `record.stripeSubscriptionId = null` on `subscription.deleted`. |
| **AUTH-M6** | Medium → upgraded | No failed-login audit log. Brute-force not detectable. | **1** | AUTH-C3. | Detect attacks. | `logger.warn` with `{ip, email, ts, userAgent}` on every 401 from /api/auth/login. |
| **AUTH-M10** | Medium → upgraded | `incrementUsage` writes after work is done. Crash between → free request. | **2** | AUTH-H1. | Edge-case loophole but real. | Pre-decrement before work, refund on caught exception. |
| **ATS-B2** | Critical | `parseExperience` collapses every job into one entry. Tailoring loses all per-role detail. | **24** | None. | Tailored resume looks wrong; paid customers complain. | Detect job boundaries by date-range patterns + blank lines. Iterate, emit one ExperienceItem per block. |
| **ATS-B3** | Critical | `parseProjects` collapses every project into one. | **8** | None. | Same. | Same approach as B2 with project-name boundary detection. |
| **ATS-B4** | Critical | `parseEducation` returns one entry; multi-degree resumes lose later degrees. | **6** | None. | Misrepresents users with BS+MS or MBA+JD. | Block detection by date range or blank line. |
| **ATS-B5 + B6** | Critical (bundle) | `buildMinimalPdf` is a 70-line single-page Helvetica stub. Templates exist in `resume-templates/registry.ts` but the download path never uses them. **Customers download something that doesn't look like the preview they saw.** | **40** | None. | Direct refund driver. The single biggest hit to paid-user trust. | Render the chosen React template to HTML via `react-dom/server`, then HTML → PDF via Puppeteer (server-side) or `@react-pdf/renderer`. Persist `chosenTemplateId` on `TailoredResume`. |
| **ATS-B7 + B8 + B9** | Critical (bundle) | PDF text extractor reads raw `latin1` bytes and only matches uncompressed text streams. Real-world PDFs (Word, Google Docs, Canva) silently produce garbage. Two-column layouts scrambled. | **20** | None. | Most PDF uploads fail at parse step; customer experience is "upload broken". | Replace `extractTextFromPdfBuffer` with `pdfjs-dist` (`getTextContent()` exposes per-item x/y for reading-order reconstruction). |
| **ATS-B10 + B11 + B12** | Critical (bundle) | DOCX reader only handles `word/document.xml`; misses headers/footers/text-boxes. Decodes 5 HTML entities only. ZIP filenames decoded as UTF-8. | **8** | None. | DOCX uploads with name in a Word Header come through with no name. | Replace with `mammoth` (it's the standard answer here). |

**Phase 2 total:** 12 bundles, ~120 hours (~3 calendar weeks for one focused engineer).

**Outcome after Phase 2:** paid product works as advertised. PDFs parse correctly, downloads match the previewed template, billing is atomic and gives a refundable path on cancellation. **At this point you can charge $5.49/mo without expecting a refund storm.**

---

## 4. Phase 3 — Must Fix Before Scale (~1k+ MAU)

Items that don't matter until you have real load, abuse traffic, or revenue scale that justifies the work.

| ID | Severity | Description | Effort (hrs) | Depends on | Business impact at scale |
|---|---|---|---|---|---|
| **Postgres migration** | High (umbrella) | JSON file with `proper-lockfile` is a stopgap. Switch to Postgres/Supabase. Closes AUTH-H1, H2, M4 (write amplification), M10, AUTH-M8 (signed URLs become easy). | **40** | Phase 2 lockfile in place. | Concurrency safe, snapshot/restore, real analytics. |
| **AUTH-M1** | Medium | Sessions are 30-day fixed; no rolling refresh; no "active sessions" UI. | **8** | Postgres helps. | Stolen cookie valid 30 days; users can't revoke a lost device. |
| **AUTH-M2** | Medium | No email verification gate. | **4** | Phase 1 email provider. | Spammers create accounts; quota gaming. |
| **AUTH-M4** | Medium | `upsertUsageForUser` writes a DB row on every authenticated request. | **2** | Postgres or proper lockfile. | DB load multiplier ×10. |
| **AUTH-M7** | Medium | `firebase-admin` reuses cached app by name with no project-id check. | **0.5** | None. | Debug pain; dev/prod cross-contamination. |
| **AUTH-M8** | Medium | Tailored PDF download URL is session-authenticated but not signed/expiring. | **6** | Postgres helpful. | Browser-history / proxy-log leak path. |
| **AUTH-M9** | Medium | No app-level HSTS / nosniff / X-Frame-Options / Referrer-Policy. | **1** | None. | Trust-edge proxy is acceptable for small scale. |
| **AUTH-L2** | Low | Logger emits `userId` + `email` in JSON logs. | **2** | None. | GDPR / SOC-2 compliance. |
| **AUTH-L3** | Low | `/api/auth/me` not cached; full DB round-trip per nav. | **2** | Postgres. | Latency at scale. |
| **AUTH-L4** | Low | No app-level CSP. | **3** | None. | XSS defense-in-depth. |
| **AUTH-L5** | Low | `clearSessionCookie` doesn't pass explicit `path:"/"`. | **0.5** | None. | Edge bug. |
| **AUTH-L7** | Low | Webhook returns 500 on handler error → Stripe retries forever. | **1** | Phase 2 idempotency landed. | Combined with idempotency (already closed) this becomes safe; tighten the return code. |
| **ATS-B13** | High | `fullName` heuristic picks wrong line. | **4** | None. | Wrong name in tailored resumes. |
| **ATS-B16** | High | `inferRoleFromTitle` collapses everything to "Software Engineer". | **3** | None. | Role-category breakdown is meaningless for non-eng. |
| **ATS-B20 + B21** | High (bundle) | `experienceRelevance` is binary; `formattingCompleteness` doesn't measure formatting. | **8** | ATS-B2 done. | Honest scoring once we have multi-job data. |
| **ATS-B24** | High | Unknown skills dumped into `tools` category. | **2** | None. | Tailored resume mis-categorization. |
| **ATS-B30** | Medium | SKILL_CATALOG is ~90 entries; modern dev skills missing. | **6** | None. | Scoring blind spot. |
| **ATS-B33** | Medium | Scanned/image PDFs throw generic error. | **20** | None. | OCR via Tesseract or vision API. |
| **ATS-B36** | Medium | `keywordCoverage` computed from master resume only; "needs_confirmation" stays stale after user confirms. | **3** | None. | UX confusion in editor. |
| **ATS-B42** | Low | `extractResponsibilities` requires verb-prefix lines. | **2** | None. | Misses JDs in noun form. |
| **EXT-E9** | High | LinkedIn selectors are fragile and dated. | **4** | None. | Accept ongoing quarterly maintenance burden. |
| **EXT-E10** | High | Indeed selector targets a wrapper. | **2** | None. | Polluted extraction. |
| **EXT-E11** | High | Monster/Dice/careers.google/careers.microsoft have no site-specific selectors. | **8** | None. | Either add selectors or remove from matches. |
| **EXT-E12** | High | Generic fallback caps text at 12k chars. | **0.5** | None. | One-line fix; Workday JDs cleanly extract. |
| **EXT-E13** | High | Generic fallback regex is English-only. | **2** | None. | i18n. |
| **EXT-E16** | High | "Save resume" in extension doesn't sync to website master resume. | **4** | None. | Confusion between extension + website state. |
| **EXT-E17** | High | `firebaseUid` is set to email string. | **1** | None. | Local-state bug. |

**Phase 3 total:** ~25 calendar days of work depending on Postgres migration depth.

---

## 5. Phase 4 — Future Features (not on the launch critical path)

These are the items the original product page lists as features but for which **no code exists**. None of these should be on a "this version" roadmap; they're each multi-week, multi-ATS engineering projects.

| ID | Description | Effort estimate |
|---|---|---|
| **EXT-E1** | Autofill — read user profile from server, fill applicant fields on Greenhouse/Lever/Workday/Workable/Ashby forms. | ~3 days per ATS for first-pass; 5 ATSes = **3 weeks** |
| **EXT-E2** | Cover-letter automation — generate cover letter from master resume + JD, insert into application form's letter field. | New `/api/tools/cover-letter` endpoint (~5 days) + per-ATS field detection (~2 days each) = **~3 weeks** |
| **EXT-E3** | File-upload automation — programmatically attach the user's resume file to `<input type=file>`. Workday needs synthetic drag-drop. | ~2 days per ATS = **2 weeks** |
| **EXT-E4** | Multi-step application workflow — state machine to advance through Workday's 6-step forms. | ~5 days per ATS = **5 weeks** |
| Site coverage: Glassdoor / Monster / Dice specific selectors | Already in manifest matches but no site-specific extraction. | **5 days** |
| **EXT-E19 / E20 / E22 / E23 / E24 / E26-E36** | Polish & accessibility items in the extension popup/options. | **~8 days bundled** |
| **ATS-B22 / B23 — quality of the tailoring engine** | The current engine reorders bullets and produces a templated summary. Real "tailoring" requires NLP (LLM call). | **2 weeks** to wire OpenAI/Anthropic with anti-hallucination guards |
| **ATS-B25 / B26 — salary / phone international** | Currently US-only. | **3 days** |
| **ATS-B28 / B29** | Per-job currentRole detection; bullet cap configurable. | **1 day** |
| **ATS-B31 / B37** | Eliminate residual templated marketing copy in the summary; refactor "score lift" to separate real lift from inserted-keyword lift. | **2 days** |
| **ATS-B38 / B39 / B40 / B41** | PDF metadata (`/Info`), encoding, font-aware wrapping. | Covered by Phase 2 ATS-B5/B6 replacement. |

**Phase 4 total:** **~3 calendar months** of engineering if Option B (build) is chosen for the autofill stack. **~1 day** if Option A (drop the claim) is chosen.

---

## 6. Marketing language audit

Three columns: what to **remove now**, what to **keep**, what to **soften to "Coming Soon"**.

### 6.1 Remove from marketing immediately

These claims are not supported by any code path. Leaving them in the product page, manifest description, App Store listing, or paid ads constitutes misleading advertising. Strip before any public launch.

| Where it appears | String to remove |
|---|---|
| Chrome Web Store listing | "Auto-fill applications", "One-click apply", "Apply in seconds", "Automate your applications" |
| Homepage hero copy | Anything that says "apply", "submit", "fill your application" |
| Pricing tier features | "Apply to multiple jobs in minutes" / "Automated application workflows" |
| FAQ | Q&A entries about the apply / autofill flow |
| Blog posts | Posts that describe a workflow that includes auto-applying |
| Extension marketing copy | "Apply to any job in 3 clicks", "Workday autofill", "Greenhouse one-click", etc. |

### 6.2 Keep — these are real and working (after Phase 1)

| Feature | Notes |
|---|---|
| ATS-style score | Works. Score quality improves after Phase 2 (ATS-B7/B8). |
| Keyword gap analysis | Works after Phase 1 (negation guard already shipped this audit cycle). |
| AI bullet suggestions | Works for short rewrites. **Don't call it "AI"** unless you wire a real LLM (Phase 4); call it "keyword-aware suggestions". |
| Resume match score (resume vs JD) | Works. |
| Master resume storage | Works (text + structured). |
| JD extraction from supported job sites | Works on LinkedIn / Indeed / Glassdoor; works via JSON-LD on Greenhouse / Lever / Workday after Phase 1 (manifest fix already shipped). |
| Chrome extension popup analyze flow | Works. |
| Stripe checkout (Free → Starter) | Works once Stripe keys are in Railway and Phase 1 idempotency is in place (idempotency already shipped). |
| 100 tailored resumes / month on Starter | Works. |
| $5.49/mo, $49.99/yr pricing | Works and is now consistent across site + docs. |

### 6.3 Mark "Coming Soon" — claim if you must, but with the badge

| Feature | Recommended badge text |
|---|---|
| Resume templates other than the default | "30+ templates — currently in beta" (only the default template renders in the PDF) |
| Cover letter generation | "Coming soon" |
| Application autofill | "Coming soon" (or omit entirely until Phase 4) |
| Multi-step Workday / Greenhouse autofill | "Coming soon" |
| OCR for scanned PDFs | "Coming soon" — explicit fallback message in the upload UI |

### 6.4 Honest rewrite of the homepage hero (suggested)

Before (current copy):
> "Tailor your resume to any job description in minutes."

After (defensible at launch):
> "Get an instant ATS-style score and keyword gap analysis for any job. Tailor your resume around the skills you actually have."

Before:
> "HireTuner's AI analyzes the JD, identifies critical keyword gaps, and precision-rewrites your experience to maximize your match score."

After:
> "HireTuner reads the JD, surfaces the keywords your resume is missing, and helps you reorder your strongest bullets toward what matters — without inventing experience you don't have."

The second sentence is what the code actually does today (and is honest about not fabricating).

---

## 7. Final launch recommendation

### Decision

**Launch as Beta.** Specifically: **JD Analyzer (web) + JD Extractor (Chrome extension) on a Free tier first.** Paid tier opens later when Phase 2 closes.

### Why not Launch Now

The product as currently marketed promises features that don't exist. Shipping that to paid customers = refunds, 1-star Web Store reviews, and a credibility hit you can't unwind. Three Phase-1 items (rate limiting, working password reset, marketing cleanup) are also genuinely blocking — not in a "should fix" sense but in a "the first hostile user breaks production" sense.

### Why not Delay Launch (do nothing)

The free JD Analyzer + extension is a real, working, useful product. Sitting on it while you build autofill/apply costs you 3+ months of cohort building and feedback. Shipping the working subset gets you:
- a real user base to test parser fixes against (Phase 2 PDF/DOCX work needs real PDFs);
- early reviews and signal on which features people actually want;
- email list and waitlist for Starter when it's truly ready.

### The plan

| Week | Milestone |
|---|---|
| **Week 0** | Marketing cleanup (§6.1). Push the Phase-1 code (rate limit + password reset email + telemetry + token refresh). |
| **Week 1** | **Beta launch — Free tier only.** JD Analyzer + Chrome extension (extension lists as "JD Extractor + AI Analysis" in the Web Store; no autofill claims). |
| **Week 2-3** | Phase 2 starts — Postgres lockfile / Mammoth / pdfjs-dist. |
| **Week 4** | Phase 2 — template-driven PDF rendering (`@react-pdf/renderer`). |
| **Week 5** | Phase 2 — multi-experience parsing (ATS-B2). |
| **Week 6** | **Open Starter tier.** Real paid customers. |
| **Week 7-12** | Phase 3 hardening (Postgres migration, telemetry, audit logs, session management). |
| **Month 3+** | Phase 4 decision — build autofill (12+ weeks per ATS) or keep it off the roadmap. |

---

## 8. ROI-ordered backlog

Ordering: **business value per engineering hour**, descending. Use this to triage if you have less than the full Phase-1 budget.

| Rank | Issue | Effort (hr) | Business unlock | ROI score |
|---|---|---|---|---|
| 1 | Marketing cleanup (§6.1) | 8 | Removes legal/credibility risk; nothing else moves until this is done | ★★★★★ |
| 2 | AUTH-L1 (`devResetToken` gate) | 0.5 | Compliance hygiene; trivial | ★★★★★ |
| 3 | EXT-E12 (12k char cap) | 0.5 | Unlocks Workday JD extraction with a one-liner | ★★★★★ |
| 4 | AUTH-M5 (clear stale `stripeSubscriptionId`) | 1 | Avoids confusing re-subscribe edge case | ★★★★ |
| 5 | EXT-E30 (`console.log` cleanup) | 0.5 | Professionalism with a single grep | ★★★★ |
| 6 | AUTH-M6 (failed-login log) | 1 | Detect attacks; legal record | ★★★★ |
| 7 | EXT-E25 (extension telemetry) | 3 | Operational visibility once you have users | ★★★★ |
| 8 | AUTH-C2 (anonymous tools rate limit) | 6 | Stops the most likely abuse path | ★★★★ |
| 9 | AUTH-C3 (login rate limit) | 3 | Stops brute force | ★★★★ |
| 10 | AUTH-C5 (password reset email) | 8 | Recovers locked-out users; trust | ★★★★ |
| 11 | EXT-E6 (token refresh) | 8 | Paid extension users stop silently downgrading | ★★★★ |
| 12 | AUTH-H7 (CSRF token) | 4 | Defense-in-depth | ★★★ |
| 13 | AUTH-H1 (lockfile) | 6 | Concurrency safety | ★★★ |
| 14 | AUTH-H2 (atomic quota) | 2 | Stops quota bypass | ★★★ |
| 15 | ATS-B7+B8+B9 (PDF reader: pdfjs-dist) | 20 | Real PDFs parse correctly. Single biggest content-quality win. | ★★★ |
| 16 | ATS-B10+B11+B12 (DOCX: mammoth) | 8 | DOCX uploads stop losing the candidate's name | ★★★ |
| 17 | ATS-B2 (multi-job parsing) | 24 | Tailored resume actually represents the candidate's history | ★★★ |
| 18 | ATS-B5+B6 (template-driven PDF) | 40 | Paid customers download what they previewed | ★★★ |
| 19 | ATS-B3+B4 (projects + education multi-entry) | 14 | Same trust unlock as B2 | ★★★ |
| 20 | Postgres migration | 40 | Scale + better lockfile + analytics. Defer until paid traffic | ★★ |
| 21 | EXT-E16 (resume sync extension ↔ website) | 4 | Removes one of the top extension UX complaints | ★★ |
| 22 | AUTH-M2 (email verification) | 4 | Reduces spam accounts | ★★ |
| 23 | EXT-E9, E10, E11 (per-site selectors) | 14 | Better extraction reliability on Indeed/LinkedIn at scale | ★★ |
| 24 | All other M / L items | varies | Quality polish | ★ |
| 25 | EXT-E1-E4 (autofill / cover letter / upload / multi-step) | 480+ | New product; only do this if "apply automation" is the bet | depends |

---

## 9. Open decisions for the operator

These are not "fix this code" — they are decisions only you can make. The roadmap above branches on each.

1. **Email provider** — Resend, Postmark, SES? (Recommendation: Resend for fastest path.)
2. **Rate-limit backend** — in-memory `Map` for now, or Upstash Redis up front? (Recommendation: in-memory, switch later in Phase 3.)
3. **Database** — stay on JSON-with-lockfile through Phase 2, or migrate to Postgres before launch? (Recommendation: stay; migrate in Phase 3.)
4. **Autofill bet** — build it (3 months/ATS) or drop the claim (a day of marketing)? (Recommendation: drop; revisit in 3 months once you have signal from the JD Analyzer launch.)
5. **PDF rendering library** — `@react-pdf/renderer` (lighter; templates rewritten) or Puppeteer (uses your existing React templates as-is, but heavyweight container)? (Recommendation: `@react-pdf/renderer` for cost.)
6. **"AI" branding** — keep the marketing word and wire OpenAI/Anthropic in Phase 4, OR remove the word and ship as "rule-based optimizer"? (Recommendation: remove for launch, add in Phase 4 once you have an LLM budget and an anti-hallucination test harness.)

End of roadmap.
