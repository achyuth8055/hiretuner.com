# HireTuner — Implementation Sprints

**Source:** `LAUNCH_ROADMAP.md`. This document turns the phased roadmap into a calendar plan a solo developer can execute task-by-task.
**Assumptions:** one developer, limited cash (~$50/month in services), goal is paid revenue ASAP.
**Calendar:** 3 days → free beta live · +1 week → infra hardened · +2 weeks → **paid Starter tier opens (≈ Day 24)**.

```
Day 1───3       Sprint 1 — Marketing cleanup + Phase-1 critical fixes
Day 4───10      Sprint 2 — Real PDF/DOCX parsing + extension token refresh
Day 11──24      Sprint 3 — Multi-job parsing + template-driven PDF → PAID TIER OPENS
Day 25──∞       Sprint 4 — Scale, Postgres, autofill decision, polish
```

Each task lists: ID, hours, files touched, deps, what success looks like, and how each milestone moves the launch needle.

---

## Sprint 1 — "Ship the truth" (3 days · 24 working hours)

**Outcome of this sprint:** the marketing matches what the product actually does, anonymous abuse is blocked, password reset works for real users, the Chrome extension stops silently downgrading after 50 minutes, the free JD-Analyzer beta is live on `hiretuner.com`. **Revenue still gated on Sprint 3.**

### Day 1 (8h) — Stop the bleeding

**T1.1 — Marketing cleanup (3h)** · Roadmap item: *MARKETING (Phase 1)* · ROI ★★★★★

Strip every reference to autofill, "one-click apply", "automate your applications", "Workday autofill", cover-letter automation, and multi-step workflows. The features don't exist; advertising them is misleading.

Files:
- `src/app/(marketing)/page.tsx` — hero, feature grid, FAQ
- `src/app/(marketing)/job-application-tracker/page.tsx` — landing copy
- `chromeExtension/manifest.json` (`description` field) — confirm only ATS analysis claims
- `CHROME_STORE_LISTING.md` — already aligned; verify
- `outputs/hiretuner-extension-v2.zip` — rebuild after manifest is final

Replacement copy (from `LAUNCH_ROADMAP.md` §6.4):
- Hero: *"Get an instant ATS-style score and keyword gap analysis for any job. Tailor your resume around the skills you actually have."*
- Subhead: *"HireTuner reads the JD, surfaces the keywords your resume is missing, and helps you reorder your strongest bullets toward what matters — without inventing experience you don't have."*

For ambiguous-but-real features (resume tailoring, the editor), add a small **Beta** badge instead of removing.

**Verification:** `grep -rni "autofill\|auto-fill\|one-click apply\|automate.*application" src/app chromeExtension` → no marketing-page matches.

---

**T1.2 — In-memory rate limiting (4h)** · AUTH-C2, AUTH-C3 · ROI ★★★★

Use a tiny in-memory bucket. Single Railway instance → no Redis needed yet. Migrate to Upstash in Sprint 4 if traffic grows.

New file: `src/lib/rate-limit.ts`
```ts
// Sketch only — actual implementation in T1.2.
type Bucket = { hits: number; resetAt: number }
const store = new Map<string, Bucket>()
export function rateLimit(key: string, limit: number, windowSec: number) {
  const now = Date.now()
  const b = store.get(key)
  if (!b || b.resetAt < now) {
    store.set(key, { hits: 1, resetAt: now + windowSec * 1000 })
    return { ok: true, remaining: limit - 1 }
  }
  b.hits += 1
  if (b.hits > limit) return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) }
  return { ok: true, remaining: limit - b.hits }
}
function ipFromRequest(r: Request) {
  return (r.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim()
}
export { ipFromRequest }
```

Wire into:
- `src/lib/public-tool-storage.ts` `enforceToolUsage` — anonymous branch: `rateLimit("tool:" + ip, 20, 900)` (20 per 15 min)
- `src/app/api/auth/login/route.ts` — `rateLimit("login:" + ip + ":" + email, 5, 900)` (5 per 15 min)
- `src/app/api/auth/signup/route.ts` — `rateLimit("signup:" + ip, 10, 3600)`
- `src/app/api/auth/reset-password/route.ts` — `rateLimit("reset:" + ip, 5, 3600)`

Files: `src/lib/rate-limit.ts` (new), the 4 routes above, `src/lib/public-tool-storage.ts`.
Deps: none. (Defer `@upstash/ratelimit` to Sprint 4.)
**Verification:** 21 anonymous `POST /api/tools/ats-score` calls in 15 min → 21st returns `429`.

---

**T1.3 — Quick wins bundle (1h)** · ROI ★★★★★ (cumulative)

Four one-liners or near:
- **EXT-E12 (0.1h)** — `chromeExtension/src/content/content.ts:76`: remove the `text.length < 12000` cap; replace with `text.length < 100000` (long Workday JDs now extract).
- **AUTH-L1 (0.1h)** — `src/app/api/auth/reset-password/route.ts`: change `process.env.NODE_ENV === "production" ? undefined : devResetToken` to `process.env.HIRETUNER_DEV_RESET === "1" ? devResetToken : undefined`. Document the new env in `RAILWAY_ENV.md`.
- **AUTH-M5 (0.1h)** — already partially done in Sprint 0 (`subscription.deleted` now nulls IDs). Verify the fix is intact in `src/app/api/billing/webhook/route.ts:144`.
- **EXT-E30 (0.5h)** — gate `console.log` calls in `chromeExtension/src/background/service-worker.ts:9,99` and `chromeExtension/src/content/content.ts:163` behind `chrome.storage.sync.get(['debug'])`.

Files: as listed.
**Verification:** `grep -rn "console.log\b" chromeExtension/src/ | grep -v "/debug"` → zero unconditional matches.

---

### Day 2 (8h) — Visibility and durability

**T1.4 — Failed-login audit log (1h)** · AUTH-M6 · ROI ★★★★

Add structured warn log in `src/app/api/auth/login/route.ts` on every 401:
```ts
logger.warn("api.auth.login", "Failed login attempt", {
  email,
  ip: ipFromRequest(request),
  userAgent: request.headers.get("user-agent")?.slice(0, 200) ?? "",
})
```
Files: `src/app/api/auth/login/route.ts`.
**Verification:** `tail -f` Railway logs while running 3 wrong-password attempts; 3 structured `Failed login attempt` entries appear.

---

**T1.5 — Telemetry beacon (3h)** · EXT-E25 · ROI ★★★★

New route `src/app/api/telemetry/route.ts`:
- POST only, anonymous, rate-limited (`rateLimit("telemetry:" + ip, 60, 60)`)
- Accepts `{ source: "extension"|"web", kind: "extraction_failed"|"api_error"|"unhandled", host?: string, message?: string, version?: string }`
- `logger.info("telemetry", "client", body)`

Client wiring:
- `chromeExtension/src/common/api.ts` — emit on `!response.ok` or thrown error
- `chromeExtension/src/content/content.ts` — emit when `getCurrentJobDescription()` returns null on a supported domain
- `src/app/error.tsx` (Next.js error boundary) — emit on uncaught

Files: `src/app/api/telemetry/route.ts` (new), `chromeExtension/src/common/api.ts`, `chromeExtension/src/content/content.ts`, `src/app/error.tsx` (new if missing).
**Verification:** open extension on `https://example.com`, click Extract; backend logs receive `telemetry kind=extraction_failed host=example.com`.

---

**T1.6 — Extension token refresh (4h)** · EXT-E6 · ROI ★★★★

Server: new route `src/app/api/auth/firebase/refresh/route.ts`. Accepts `{ idToken }`. Calls Firebase Admin `auth.verifyIdToken(idToken, /*checkRevoked*/ true)`. If valid, calls `auth.createCustomToken(decoded.uid)` and returns it. Client then `signInWithCustomToken` and `getIdToken()` to mint a fresh one.

Cheaper alternative the user can choose if calling `createCustomToken` is overkill: extend the extension's storage-based cache to allow the bridge flow to be re-run non-interactively (`interactive: false`) when the cached token is between 50–58 minutes old. If silent re-bridge fails, fall through to interactive.

Client: `chromeExtension/src/common/auth.ts` `getCurrentIdToken`:
- When `ageMinutes ≥ 50 && ageMinutes < 60`: try silent refresh path. On success, write new token + timestamp.
- Otherwise (`≥ 60`): require user-visible bridge again.

Files: `src/app/api/auth/firebase/refresh/route.ts` (new), `chromeExtension/src/common/auth.ts`.
**Verification:** in the extension popup, console-log `getCurrentIdToken()` at T=0 and T=51min. Both return non-null tokens; the second is a fresh JWT (different `iat`).

---

### Day 3 (8h) — Email + beta launch

**T1.7 — Password reset email (4h)** · AUTH-C5 · ROI ★★★★

Recommended provider: **Resend** (free tier 3k/month / 100/day; one-day onboarding; React Email support).

Setup:
1. Create Resend account → API key.
2. Add to Railway: `RESEND_API_KEY=re_...`, `EMAIL_FROM=support@hiretuner.com`.
3. `npm install resend` (extension build excluded — install only at the website root).
4. Create `src/lib/email.ts`:
```ts
import { Resend } from "resend"
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
export async function sendResetEmail(to: string, token: string) {
  if (!resend) {
    console.warn("[email] Resend not configured; reset link not sent")
    return
  }
  const link = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`
  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject: "Reset your HireTuner password",
    html: `<p>Click to reset your password: <a href="${link}">${link}</a></p><p>Link expires in 30 minutes.</p>`,
  })
}
```
5. Call from `src/app/api/auth/reset-password/route.ts` after the token is stored.

Files: `src/lib/email.ts` (new), `src/app/api/auth/reset-password/route.ts`, `package.json` (add `resend`).
Dependency: `resend` npm package.
**Verification:** request reset for a real test inbox; email arrives within 60 seconds with a working link.

---

**T1.8 — Push, deploy, Stripe finalization (2h)**

1. Clear stale git locks: `rm -f .git/HEAD.lock .git/index.lock` (host only, sandbox can't).
2. `git add` the Sprint 1 changes; `git commit -m "feat: sprint 1 — marketing cleanup + rate limits + email + token refresh"`.
3. `npm run build` → confirm clean.
4. `git push origin main`.
5. Wait ~90s for Railway redeploy.
6. Paste Stripe keys into Railway (the 5 vars in `RAILWAY_ENV.md`) **if you intend to test paid flow now**; otherwise defer to Sprint 3.

**Verification:** the smoke-test snippet from `FINAL_FIX_REPORT.md` §5 — checkout, empty-JD, JSON-to-master, settings page — runs clean in production console.

---

**T1.9 — Soft beta launch (2h)**

Action items:
- Add a "Beta" badge to the homepage hero (small pill near the H1).
- Add a footer notice: *"Free during beta. Starter paid tier opens later this month."*
- Submit the rebuilt `hiretuner-extension-v2.zip` to the Chrome Web Store (it's a version-only upload; description already cleaned in T1.1).
- Post a short launch announcement somewhere with low stakes — Indie Hackers / X / a relevant subreddit — to start a waitlist for the Starter tier.

**Outcome:** the free product is live, abuse-resistant, and honest. Users can sign up, paste a JD, get a real analysis. The extension extracts JDs from LinkedIn / Indeed / Glassdoor / Greenhouse / Lever / Workday / Workable / Ashby. **Nobody is paying you yet — that's Sprint 3.**

---

## Sprint 2 — "Make uploads work" (1 week · 40 working hours)

**Outcome of this sprint:** real-world PDFs and DOCX files parse correctly (today most of them silently fail or produce garbage). The JSON store stops losing concurrent writes. CSRF defense is in place. **Still no paid tier — this is the prerequisite for it.**

### Tasks

**T2.1 — DOCX parser swap to `mammoth` (8h)** · ATS-B10, B11, B12 · ROI ★★★

Replace `extractTextFromDocxBuffer` in `src/lib/resume-engine.ts:252-269` with mammoth's text extractor.

```bash
npm install mammoth
```

New code (sketch):
```ts
import mammoth from "mammoth"
async function extractTextFromDocxBufferMammoth(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer })
  return normalizeText(result.value)
}
```

Update `extractResumeTextFromFile` to call the new async function.

Also delete the now-unused `readZipFile` helper (`:271-313`) if nothing else uses it.

Files: `src/lib/resume-engine.ts`, `package.json`.
**Verification:** test fixture set — DOCX with name in a header, DOCX with em-dashes, DOCX with tables. All produce readable text including the header. Compare to TXT equivalent.

---

**T2.2 — PDF parser swap to `pdfjs-dist` (16h)** · ATS-B7, B8, B9 · ROI ★★★

This is the single biggest content-quality fix. After this, real-world PDFs from Word / Google Docs / Canva actually parse.

```bash
npm install pdfjs-dist
```

Replace `extractTextFromPdfBuffer` in `src/lib/resume-engine.ts:211-240`. Sketch:
```ts
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs"

async function extractTextFromPdfBufferPdfJs(buffer: Buffer): Promise<string> {
  const doc = await getDocument({ data: new Uint8Array(buffer), useSystemFonts: true }).promise
  const pageTexts: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    // Reading order: sort by y descending then x ascending. Group items with
    // similar y into the same line; concatenate with space.
    const items = content.items
      .filter((it): it is { str: string; transform: number[] } => "str" in it)
      .map((it) => ({ str: it.str, x: it.transform[4], y: it.transform[5] }))
      .sort((a, b) => b.y - a.y || a.x - b.x)
    // Coalesce items on the same baseline (±2 pt) into a single line.
    let currentY: number | null = null
    let line: string[] = []
    const lines: string[] = []
    for (const it of items) {
      if (currentY === null || Math.abs(currentY - it.y) > 2) {
        if (line.length) lines.push(line.join(" "))
        line = [it.str]
        currentY = it.y
      } else {
        line.push(it.str)
      }
    }
    if (line.length) lines.push(line.join(" "))
    pageTexts.push(lines.join("\n"))
  }
  return normalizeText(pageTexts.join("\n\n"))
}
```

Update `extractResumeTextFromFile` to call this async function. Both extract functions are now async; ensure all upstream callers `await`.

Files: `src/lib/resume-engine.ts`, `package.json`, `src/app/api/resumes/master/route.ts` (it already awaits, no change needed).
Watch-out: `pdfjs-dist` ships an ESM build for modern Node; if Next/Webpack complains, use `pdfjs-dist/legacy/build/pdf.mjs` as shown.
**Verification:** upload 5 real PDF resumes (Word export, Google Docs export, Canva export, a two-column LaTeX template, a scanned PDF). The first 4 produce readable text including emoji-free Unicode; the scanned one fails with the existing "scanned or image-only" error (OCR is Sprint 4).

---

**T2.3 — Concurrency safety (`proper-lockfile` around `updateDatabase`) (6h)** · AUTH-H1, AUTH-H2 · ROI ★★★

```bash
npm install proper-lockfile
```

Convert `src/lib/database.ts` `updateDatabase` to async with a file lock:
```ts
import lockfile from "proper-lockfile"
export async function updateDatabase<T>(mutator: (db: RoleFitDatabase) => T): Promise<T> {
  ensureDatabaseFile()
  const release = await lockfile.lock(DB_FILE, {
    retries: { retries: 10, minTimeout: 50, maxTimeout: 200 },
  })
  try {
    const database = readDatabase()
    const result = mutator(database)
    writeDatabase(database)
    return result
  } finally {
    await release()
  }
}
```

**Ripple effect:** every caller of `updateDatabase` becomes `await updateDatabase(...)`. There are ~25 such call sites. Use grep to find them all:
```bash
grep -rn "updateDatabase(" src/ | grep -v ".d.ts"
```
Wrap each in `await`. TypeScript will surface non-async callers as errors — fix until `tsc --noEmit` is clean.

Bonus from doing this: AUTH-H2 (TOCTOU) is solved for free because the cap check + increment now run inside the same locked mutation.

Files: `src/lib/database.ts`, every route that calls `updateDatabase`, `package.json`.
**Verification:** parallel test — open two terminals, run `for i in {1..20}; do curl -X POST .../api/job-descriptions/analyze ... & done`. Free user at quota cap ends at exactly the cap, not cap×20.

---

**T2.4 — CSRF token defense (4h)** · AUTH-H7 · ROI ★★★

Double-submit cookie pattern:

1. New file `src/lib/csrf.ts`: generates a 32-byte hex token, sets a non-httpOnly `csrf` cookie on first non-mutating response.
2. `src/lib/http.ts` `requireApiUser`: on POST/PATCH/DELETE/PUT, compare `request.headers.get("x-csrf-token")` against the cookie. On mismatch → 403.
3. Client: `src/lib/api-client.ts` (or wherever fetches are wrapped) reads the cookie and adds the header on every state-changing request.

Files: `src/lib/csrf.ts` (new), `src/lib/http.ts`, the small set of client fetch wrappers in `src/components/app/*` and `src/app/(marketing)/*`.
Watch-out: external Stripe webhook is exempt (it has its own signature). Add an allow-list.
**Verification:** in DevTools console, run `await fetch('/api/job-descriptions/analyze', {method:'POST', body:'{}', headers:{'Content-Type':'application/json'}})` without sending the header → 403. With it → normal response.

---

**T2.5 — Per-site selector fixes (extension) (4h)** · EXT-E10, EXT-E11 partial · ROI ★★★

- EXT-E10: in `chromeExtension/src/content/content.ts`, replace the Indeed `#jobsearch-ViewjobPaneWrapper` fallback with `[id^="jobDetailsSection"], section[class*="jobsearch-JobComponent-description"]` (current Indeed DOM).
- Add Glassdoor selectors that work today.
- Add Greenhouse, Lever, Workable site-specific selectors that the JSON-LD fallback might miss.

Files: `chromeExtension/src/content/content.ts`. Rebuild zip.
**Verification:** load the unpacked extension against a live posting on each platform; extracted text length > 1000 chars and matches the visible JD body.

---

**T2.6 — Push + verify (2h)**

`git add`, commit, push, deploy. Smoke test:
- Upload a Word-export PDF → parses with proper Unicode.
- Upload a DOCX with name in the header → name appears in the parsed profile.
- Concurrent quota test passes (T2.3 verification).
- CSRF header required for state-changing requests.

**Outcome:** the foundation that paid tier needs. **Still no paid traffic** because the tailored PDF still doesn't use the chosen template — that's Sprint 3.

---

## Sprint 3 — "Make the paid tier worth paying for" (2 weeks · 80 working hours)

**Outcome of this sprint:** multi-job resumes parse into multiple `ExperienceItem`s, the tailored PDF renders the actual template the user picked, the scoring breakdown reflects real experience rather than a 78-or-45 binary. **You open Starter at $5.49/mo and Yearly at $49.99/yr. Revenue begins.**

### Week 1

**T3.1 — Multi-experience parsing (16h)** · ATS-B2 · ROI ★★★

Replace `parseExperience` in `src/lib/resume-engine.ts:437-468`. Detect job entries by:
- a date-range pattern (`\b\d{4}\s*[-–—]\s*(present|\d{4})\b`)
- OR a line that looks like `Title — Company` / `Company | Title`
- OR an explicit blank line separating role blocks

Algorithm sketch:
```ts
function parseExperience(text: string): ExperienceItem[] {
  const section = extractSection(text, ["experience", "work experience", "professional experience"]) || text
  const lines = section.split("\n").map(l => l.trim())
  const jobs: ExperienceItem[] = []
  let current: ExperienceItem | null = null
  for (const line of lines) {
    const dateMatch = line.match(/\b(\w+ \d{4}|\d{4})\s*[-–—]\s*(present|\w+ \d{4}|\d{4})\b/i)
    const titleLike = /\b(engineer|developer|analyst|manager|consultant|specialist|architect|intern|designer|lead)\b/i.test(line)
    if (dateMatch || (titleLike && line.length < 120)) {
      if (current) jobs.push(current)
      current = {
        id: createId(),
        jobTitle: extractTitle(line),
        company: extractCompany(line),
        location: "",
        startDate: dateMatch?.[1] ?? "",
        endDate: dateMatch?.[2] ?? "",
        currentRole: /present|current/i.test(dateMatch?.[2] ?? ""),
        bullets: [],
      }
    } else if (current && (/^[-*•]/.test(line) || /\b(developed|built|led|managed|created|implemented|improved|designed|owned|shipped)\b/i.test(line))) {
      current.bullets.push(line.replace(/^[-*•]\s*/, ""))
    }
  }
  if (current) jobs.push(current)
  return jobs.filter(j => j.bullets.length > 0).slice(0, 10)
}
```

Files: `src/lib/resume-engine.ts`.
**Verification:** unit test with 3 real resumes (2-job junior, 4-job senior, 6-job veteran). Each produces the right number of `ExperienceItem`s with date ranges populated.

---

**T3.2 — Multi-project + multi-education (12h)** · ATS-B3, ATS-B4 · ROI ★★★

Same approach for `parseProjects:470-491` and `parseEducation:493-513`. Boundary detection: blank lines, uppercase title lines for projects; date ranges or institution-line patterns for education.

Files: `src/lib/resume-engine.ts`.
**Verification:** unit test with multi-project / multi-degree resumes.

---

**T3.3 — Score fixes that depend on T3.1 (4h)** · ATS-B20, ATS-B21 · ROI ★★

Now that `workExperience.length` actually reflects job count:
- `experienceRelevance` (`:693`): scale `60 + min(years_total, 12) * 2` instead of the 78/45 binary.
- `formattingCompleteness` (`:687`): keep the section-signals component but also penalize for the score-noise heuristics that no longer apply.

Files: `src/lib/resume-engine.ts`.
**Verification:** before/after on a 6-job senior resume — experienceRelevance moves from 78 to ~84.

---

**T3.4 — `fullName` heuristic (4h)** · ATS-B13 · ROI ★★

Smarter detection: take the line directly above the first contact-line (email/phone), validate it's title-case, 2-4 words, no resume keywords. Fall back to current heuristic on miss.

Files: `src/lib/resume-engine.ts`.
**Verification:** test with resumes that start with a job title above the name, resumes where the name line includes a 3-digit ZIP, resumes with non-ASCII names. All produce the correct name after T2.2 PDF fix.

---

**T3.5 — `inferRoleFromTitle` expansion (3h)** · ATS-B16 · ROI ★★

Extend the role taxonomy beyond Java/data-eng/data-analyst/business-analyst/qa/devops/product. Cover: iOS, Android, Mobile, Frontend, Backend, Fullstack, SRE, Security, ML, Data Scientist, Designer, Marketer, Sales Engineer, Project Manager, Customer Success.

Files: `src/lib/resume-engine.ts:580-590`.
**Verification:** spot-check 10 JD titles; each maps to the correct category.

---

**T3.6 — Push, deploy week-1 (1h)**

Standard commit + push + smoke test. At this point you can promote the editor in the marketing copy because the underlying parsing actually works.

### Week 2

**T3.7 — Template-driven PDF rendering (24h)** · ATS-B5, ATS-B6 · ROI ★★★ (highest single-feature ROI for paid tier)

This is the deliverable that unlocks paid customer trust. Use `@react-pdf/renderer` because it's lighter than Puppeteer and lets you reuse the existing React templates in `src/lib/resume-templates/`.

```bash
npm install @react-pdf/renderer
```

Steps:
1. Persist `chosenTemplateId` on `TailoredResume` (add to `rolefit-types.ts` + `tailored-resumes/route.ts` POST handler).
2. Wrap or rewrite each template in `src/lib/resume-templates/registry.ts` so it can render via `@react-pdf/renderer`'s `Document/Page/Text/View`. The visual styling will need translation to react-pdf's `StyleSheet` (no Tailwind).
3. Rewrite `src/app/api/tailored-resumes/[id]/download/route.ts` to:
   - Look up the tailored resume + chosen template
   - Render via `renderToBuffer(<TemplateDocument resume={resume} />)`
   - Stream the result with the existing Content-Disposition headers
4. Delete or move `buildMinimalPdf` to a "fallback only" path; never wire it on a paid flow.

Effort distribution: 8h on plumbing, 16h on template translation (one polished template first, three more iterated in Sprint 4).

Files: `src/lib/resume-templates/*`, `src/app/api/tailored-resumes/[id]/download/route.ts`, `src/lib/rolefit-types.ts`, the editor UI in `src/components/app/EditorWorkspace.tsx`.
**Verification:** download from the editor; PDF visually matches the template preview, multi-page, Unicode names render correctly, `/Info` dictionary populated (set Title to candidate name).

---

**T3.8 — Email verification flow (4h)** · AUTH-M2 · ROI ★★

Now that email sending works (T1.7), gate paid signup behind verification.

- Add `emailVerifiedAt: string | null` to User type.
- On signup, send a verification link. On reset-password completion or on first verified click, set `emailVerifiedAt`.
- `enforceToolUsage` and tailored-resume route: if `emailVerifiedAt === null && plan === "free"`, allow with a soft warning banner. Paid (Stripe checkout) requires `emailVerifiedAt`.

Files: `src/lib/rolefit-types.ts`, `src/app/api/auth/signup/route.ts`, `src/app/api/auth/verify-email/route.ts` (new), `src/lib/email.ts`.
**Verification:** sign up with throwaway email → verification email arrives → clicking the link sets `emailVerifiedAt`.

---

**T3.9 — Paid launch checklist (4h)**

1. Confirm all Stripe keys in Railway (`RAILWAY_ENV.md`).
2. Confirm Stripe products: `HireTuner Starter` with **$5.49/mo** + **$49.99/yr** prices.
3. Confirm webhook endpoint registered at `hiretuner.com/api/billing/webhook` listening to the four events.
4. Run a real test charge with card `4242 4242 4242 4242`; verify webhook lands → user flipped to `starter` → can download a tailored PDF → cancel from `/dashboard/settings` → portal works → next month auto-downgrade.
5. Flip the marketing page: remove the Beta badge from pricing card; "Beta" stays on the editor only until Sprint 4 template polish lands.

**Verification:** end-to-end paid flow works on production. Stripe shows the test charge, dashboard reflects starter plan, tailored resume PDF renders the chosen template.

---

**T3.10 — Marketing relaunch (3h)**

- Blog post: "HireTuner is now live, here's what it does (and what it doesn't yet)."
- Update homepage hero — switch from "free during beta" to the real free vs starter tier matrix.
- Send "Starter is live" to the waitlist collected in T1.9.
- Update Chrome Web Store listing if the product description needs a refresh.

**Outcome of Sprint 3:** paying customers. The product the user clicks Starter for actually delivers what they see in the preview. Revenue starts.

---

## Sprint 4 — "Scale and decide" (future · no fixed duration)

These are the items you defer until you have either revenue, traffic, or feedback that justifies them. They are not blocking launch. Pick by signal, not by the audit list.

### Triggered by user signal

| Trigger | Items to do | Why |
|---|---|---|
| **You hit > 50 simultaneous users** | Postgres migration (`pg`, Supabase, or Neon free tier). | The JSON file with `proper-lockfile` works until throughput becomes a bottleneck. Migration touches every database call; budget ~40h. |
| **First $1k MRR** | Telemetry / observability stack: Sentry free tier + Logflare for log search. | At this point the operational pain of "what broke at 3 AM" matters. |
| **First $5k MRR** | Stripe customer-portal polish, dunning emails, paid-plan email upgrades / downgrades. | When churn matters. |
| **Real abuse hits** | Move rate limiter to Upstash Redis. Add per-IP quotas to the website forms. | The in-memory limiter from T1.2 is fine until you're scaled across multiple Railway instances. |
| **Users keep asking for templates** | Translate templates 2–4 from `resume-templates/registry.ts` to `@react-pdf/renderer`. | The Sprint 3 paid launch ships with one polished template. Add more on demand. |
| **Users ask for autofill** | The Phase-4 decision tree. Either commit 3 months/ATS or keep "Coming soon". | This is the largest single bucket of "not-built" features. Don't start without revenue cover. |

### Background quality items (do as bug-bash days, not as full sprints)

- ATS-B30 — Expand `SKILL_CATALOG` to ~500 entries. 1 day.
- ATS-B33 — OCR for scanned PDFs via `tesseract.js`. 2 days.
- AUTH-M1 — Sessions list + revoke UI on `/dashboard/settings`. 1 day.
- AUTH-M9 — HSTS / Referrer-Policy headers via `next.config.ts`. 1h.
- EXT-E9/E10/E11 — Per-site selector improvements. 1 day each as DOM changes occur.
- EXT-E28/E29 — Keyboard shortcuts + ARIA tab pattern in popup. 1 day.
- EXT-E34 — Action icon state ("✓" signed in, "!" error). Half day.
- ATS-B25/B26 — International salary + international phone numbers. 1 day each.
- All remaining L items. Collect into a quarterly "polish week".

### The autofill / apply-automation question

Three options, in order of recommendation:

1. **Drop the claim permanently.** Reposition as "Resume optimizer + JD analyzer + extractor." Total cost: 0. Done in Sprint 1's T1.1.
2. **Ship a single-ATS autofill (Greenhouse only).** ~3 weeks of focused work. Risk: locking in a UX that doesn't generalize.
3. **Build full multi-ATS autofill stack.** 12+ weeks per ATS. ~$0 budget — pure dev time. Recommended only if you have a clear customer ask and revenue runway.

If you do go down this path, the first three weeks of effort are detailed in `EXTENSION_E2E_AUDIT.md` §"For the autofill/cover-letter/multi-step features (if you do build them)" — per-ATS field-mapping JSON contract + DataTransfer-based file upload + per-ATS Next-button state machine. Each ATS is independent work.

---

## Summary table — what unlocks revenue, day by day

| Day | What lands | Revenue impact |
|---|---|---|
| Day 1 | Marketing cleanup, rate limits, quick wins | Removes legal risk; nothing else moves without this |
| Day 2 | Failed-login log, telemetry, token refresh | Operational visibility; extension stops downgrading |
| Day 3 | Email send, soft beta launch | Free beta is live — start collecting waitlist signups |
| Day 4–6 | DOCX + PDF parser swap (mammoth + pdfjs-dist) | Real resumes upload correctly — preview matches user expectations |
| Day 7 | Lockfile + CSRF | Concurrency safety + token defense |
| Day 8–10 | Per-site selector polish, push | Extension extracts reliably from more sites |
| Day 11–17 | Multi-experience / project / education parsing | Tailored output finally represents the candidate's real history |
| Day 18–22 | Template-driven PDF rendering | Paid customers get what they preview |
| Day 23 | Email verification + Stripe paid launch checklist | Trust + billing wiring |
| Day 24 | **Open Starter** → first paid customers possible | $5.49/mo and $49.99/yr go live |

The fastest defensible path to revenue: **24 working days** from this document being read to first paid customer. Anything shorter requires either skipping rate limits / parsing fixes (refund risk) or skipping marketing cleanup (legal / reputation risk).

End of sprint plan.
