# Sprint 2 — Changelog

Tag: `sprint-2` (pending push)
Date: 2026-06-19
Scope: per-site selectors, CSRF defense, DOCX swap to `mammoth`, PDF swap to `pdfjs-dist`, concurrency safety on `updateDatabase`, atomic check-and-increment for quotas (closes TOCTOU).

---

## Added

- **`src/lib/csrf.ts`** — Same-origin verification via `Sec-Fetch-Site` header + `Origin` allowlist. Bearer-token requests bypass the check (extension flow). `/api/billing/webhook`, `/api/telemetry`, `/api/auth/firebase`, `/api/auth/firebase/refresh` are explicitly exempt.
- **`reserveUsage` / `refundUsage` helpers in `src/lib/http.ts`** — Atomic check-and-increment for monthly quotas. Wraps the cap check and the counter write inside a single `updateDatabase` call so two concurrent requests can't both pass the cap.
- **Async PDF / DOCX extraction in `src/lib/resume-engine.ts`** — `extractTextFromPdfBufferAsync` and `extractTextFromDocxBufferAsync` dynamically import optional npm packages (`pdfjs-dist`, `mammoth`) at runtime. If a package is missing they fall through to the existing homegrown parser so the build keeps working before `npm install` runs on the host.

## Changed

- **`src/lib/http.ts`** —
  - CSRF check integrated into `requireApiUser` and `requireApiUserAsync`. Cross-site forgeries never reach the auth or session lookup.
  - `assertUsageAvailable` refactored to use shared `limitForField` / `denialMessage` helpers shared with `reserveUsage`. Same external contract.
- **`src/lib/database.ts`** — `updateDatabase` now opportunistically acquires `proper-lockfile.lockSync` around the read-mutate-write block. When the package is absent it remains race-free for a single Node process because JavaScript is single-threaded and the mutator never awaits.
- **`src/app/api/auth/login/route.ts`**, **`signup/route.ts`**, **`reset-password/route.ts`** — Each now runs `csrfCheck` at the top of `POST` (blocks login-CSRF in particular).
- **`src/app/api/job-descriptions/analyze/route.ts`** — Replaced `assertUsageAvailable + incrementUsage` (TOCTOU vulnerable) with `reserveUsage`. Added try/catch that calls `refundUsage` on caught exception.
- **`src/app/api/tailored-resumes/route.ts`** — Same atomic-reserve + refund pattern. `monthlyLimit` now reads from the reservation result.
- **`chromeExtension/src/content/content.ts`** —
  - Indeed extractor: replaced the polluted `#jobsearch-ViewjobPaneWrapper` fallback with the actual description containers (`[id^="jobDetailsSection"]`, `section[class*="jobsearch-JobComponent-description"]`).
  - Added site-specific blocks for Greenhouse (`#content` + fallbacks), Lever (`.posting-page` family), and Workday (`[data-automation-id="jobPostingDescription"]` family). Workable and Ashby continue to use the JSON-LD generic fallback (they emit it reliably).

## Optional deploy-time dependencies

- `mammoth` — DOCX parsing upgrade
- `pdfjs-dist` — PDF parsing upgrade
- `proper-lockfile` — multi-process safety on the JSON store

All three are dynamically imported with try/catch. The website builds and serves correctly without them — the engine falls back to the original parsers, and `updateDatabase` falls back to single-process semantics. Install once on the deploy host to unlock the upgrades:

```bash
npm install mammoth pdfjs-dist proper-lockfile
```

## Files modified

```
src/app/api/auth/login/route.ts
src/app/api/auth/reset-password/route.ts
src/app/api/auth/signup/route.ts
src/app/api/job-descriptions/analyze/route.ts
src/app/api/tailored-resumes/route.ts
src/lib/csrf.ts                           [NEW]
src/lib/database.ts
src/lib/http.ts
src/lib/resume-engine.ts
chromeExtension/src/content/content.ts
SPRINT2_CHANGELOG.md                      [NEW]
SPRINT2_COMPLETION_REPORT.md              [NEW]
outputs/hiretuner-extension-sprint2.zip   [NEW]
```
