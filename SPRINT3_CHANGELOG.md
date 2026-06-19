# Sprint 3 — Changelog

Tag: `sprint-3` (pending push)
Date: 2026-06-19
Scope: multi-experience / multi-project / multi-education resume parsing, smarter scoring, template-driven PDF rendering, email verification flow, expanded role taxonomy.

---

## Added

- **`src/lib/pdf-renderer.ts`** — Template-driven PDF generation via `@react-pdf/renderer` (dynamic-imported). Three layout palettes (`classic`, `modern`, `compact`); falls back to `buildMinimalPdf` when the package isn't installed.
- **`src/lib/email-verification.ts`** — Token mint / consume / send helpers. SHA-256 hash at rest, single-use, 48-hour TTL. `isEmailVerified()` includes a Sprint-3-cutoff grandfather clause so legacy accounts aren't locked out.
- **`src/app/api/auth/verify-email/route.ts`** — POST endpoint that consumes a verification token. Rate-limited.
- **`src/app/api/auth/verify-email/resend/route.ts`** — POST endpoint for an authenticated user to request a fresh token. Rate-limited.
- **`src/app/(marketing)/verify-email/page.tsx` + `VerifyEmailClient.tsx`** — Public landing page for the verification link. Auto-submits the token and shows success / error UI.
- **`sendVerificationEmail()`** in `src/lib/email.ts` — Resend-backed template for the verification email; graceful no-op when `RESEND_API_KEY` is missing.

## Changed

### Resume engine (`src/lib/resume-engine.ts`)
- **Multi-experience parsing** — `parseExperience` now emits one `ExperienceItem` per role. Job boundaries detected by date range patterns (`Jan 2020 – Present`, `2018–2024`) or title-token + length heuristic. Two-line headers (`Title\nCompany — 2020-2022`) are coalesced into one entry. Per-role `startDate`, `endDate`, `currentRole` populated.
- **Multi-project parsing** — `parseProjects` emits one project per detected header (numbered, title-cased, or `Name — description`). Per-project technology detection scans only that project's text.
- **Multi-education parsing** — `parseEducation` groups lines into degree blocks. New school OR degree token opens a new block. Up to 4 entries.
- **`extractFullName`** — Replaced the loose "first short line without @ or 3 digits" heuristic with a contact-anchored walk-up algorithm: find the email/phone line, walk up to 4 lines looking for a title-cased 2-4-word name. Rejects lines containing role/header tokens. Falls back to the prior loose rule on miss.
- **`inferRoleFromTitle`** — Expanded from 7 → 23 categories. Now covers iOS, Android, Mobile, Frontend, Backend, Fullstack, SRE, DevOps, Platform, Security, ML, Data Engineer, Data Scientist, Data Analyst, QA, Business Analyst, Product Manager, Product Owner, Project Manager, Designer, Content/Writer, Marketer, Sales Engineer, Customer Success, plus language-specific (Java / Python / Go).
- **`scoreResumeAgainstJob` — experience relevance** — Now scales with `estimateTotalYears()` of work history (binary 78/45 collapsed). 0 entries → 45; entries without parsed dates → 72; otherwise `60 + min(years, 12) × 2`.
- **`scoreResumeAgainstJob` — formatting completeness** — Now weighs total bullet count + entry count (proxy for "the resume parsed cleanly"). Base 55 + section signals + experience entries (capped 5) × 3 + bullets (capped 20).
- **`computeTitleRelevance`** — Replaces the 55-or-85 binary. Full title match → 90, ≥66% token overlap → 78, ≥34% → 64, role-category fallback → 56, otherwise 48.

### Auth + billing
- **`src/app/api/auth/signup/route.ts`** — Issues a verification email immediately after the new user is created.
- **`src/app/api/auth/firebase/route.ts`** — New users created via Google sign-in are marked `emailVerifiedAt = now` (Google already verified). Existing email/password users who later sign in with Google get auto-verified at first Google login.
- **`src/app/api/billing/checkout/route.ts`** — Gated on `isEmailVerified(user)`. Unverified users get `403 email_not_verified` with a friendly message.

### Tailored resume download
- **`src/app/api/tailored-resumes/[id]/download/route.ts`** — Renders `renderTailoredResumePdf(tailoredResume)` instead of the legacy `buildMinimalPdf`. Atomic `reserveUsage` / `refundUsage` for the PDF-downloads quota. Filename rebranded `hiretuner-resume-vN.pdf`.

### Data model
- **`src/lib/rolefit-types.ts`** —
  - New `User.emailVerifiedAt?: string | null`.
  - New `EmailVerificationToken` type.
  - New `ResumeTemplateId` union and `TailoredResume.chosenTemplateId?`.
  - New `RoleFitDatabase.emailVerificationTokens?` collection.
- **`src/lib/database.ts`** — `emptyDatabase()` and `readDatabase()` both include the new `emailVerificationTokens` array.

## Optional deploy-time dependency (new this sprint)

```bash
npm install @react-pdf/renderer
```

Without it, the download path falls back to `buildMinimalPdf` (Sprint-0 behavior). With it, the user gets a real multi-page styled PDF that respects their chosen template.

## Files modified

```
NEW   src/app/(marketing)/verify-email/VerifyEmailClient.tsx
NEW   src/app/(marketing)/verify-email/page.tsx
NEW   src/app/api/auth/verify-email/resend/route.ts
NEW   src/app/api/auth/verify-email/route.ts
NEW   src/lib/email-verification.ts
NEW   src/lib/pdf-renderer.ts
NEW   SPRINT3_CHANGELOG.md
NEW   SPRINT3_COMPLETION_REPORT.md
       src/app/api/auth/firebase/route.ts
       src/app/api/auth/signup/route.ts
       src/app/api/billing/checkout/route.ts
       src/app/api/tailored-resumes/[id]/download/route.ts
       src/lib/database.ts
       src/lib/email.ts
       src/lib/resume-engine.ts
       src/lib/rolefit-types.ts
```
