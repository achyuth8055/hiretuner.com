# HireTuner Chrome Extension — End-to-End Audit

**Date:** 2026-06-18
**Auditor:** Claude (Senior QA Automation Engineer mode)
**Scope as requested:** browser extension, extension auth, JD extraction, autofill, resume upload automation, cover letter automation, LinkedIn / Greenhouse / Lever / Workday / Indeed compatibility, multi-step application workflows, permission posture, real-user journey simulation from login to application submission.
**Method:** Full source review of every file under `chromeExtension/src/` (background, content, popup, options, common/auth, common/api), plus the `manifest.json` and the build configuration in `chromeExtension/webpack.config.js`. Verification of the extension's claims against the actual code paths.

---

## TL;DR

**The product description in the manifest sells a feature that doesn't exist.** The manifest description is *"Tune your resume to every job — instant ATS score, keyword gap scan, and AI bullet suggestions on any job posting."* That subset *does* exist. But the **audit requirements as posed to me** mention autofill, file upload automation, cover letter automation, multi-step application workflows, and support for LinkedIn / Greenhouse / Lever / Workday / Indeed. **The extension implements none of those.** It's a popup that lets you (a) extract a JD's text from a few specific job sites, (b) paste it into a text area, and (c) call HireTuner's existing API to get an ATS score / match / keywords / bullet rewrite / interview questions.

If "autofill / cover letter / multi-step automation" is part of the launch pitch, **the launch will fail** — there is no code for any of that. Don't ship that messaging until it's built.

**Of the five "Test … compatibility" platforms requested:**

| Platform | In manifest content_scripts.matches? | Site-specific selectors? | Status |
|---|---|---|---|
| LinkedIn | ✅ Yes | ✅ Yes (4 fragile selectors, dated comment "LinkedIn changed its DOM in 2025") | Works, brittle |
| Indeed | ✅ Yes | ✅ Yes (3 selectors, one targets a wrapper not the description) | Works, partially |
| Glassdoor | ✅ Yes | ✅ Yes (3 selectors) | Works, fragile |
| Monster | ✅ Yes | ❌ No site-specific code | Falls through to generic fallback only |
| Dice | ✅ Yes | ❌ No site-specific code | Falls through to generic fallback only |
| Greenhouse | ❌ **Not in matches** | (JSON-LD fallback exists but content script never loads) | **Broken** |
| Lever | ❌ **Not in matches** | (same) | **Broken** |
| Workday | ❌ **Not in matches** | (same) | **Broken** |
| careers.google.com | ✅ In matches | ❌ No site-specific code | Falls through to fallback |
| careers.microsoft.com | ✅ In matches | ❌ No site-specific code | Falls through to fallback |

The comment in `content/content.ts:55-56` cheerfully says *"Most modern ATS-driven boards (Greenhouse, Lever, Workable, etc.) emit a JobPosting JSON-LD block with the description in HTML form. This works even when the visual DOM changes."* That logic is correct — except the content script is never injected into Greenhouse / Lever / Workable / Workday pages because they're not in `content_scripts.matches`.

---

## What the extension actually contains

Five files, ~1,000 lines total:

| File | LOC | Job |
|---|---|---|
| `manifest.json` | 71 | MV3 manifest, declares 4 permissions + 4 host permissions |
| `src/background/service-worker.ts` | 99 | Routes messages, persists resume + history in `chrome.storage.local`, weekly cleanup alarm |
| `src/content/content.ts` | 163 | Reads JD text from a handful of job-site DOMs OR a JSON-LD fallback; in-page keyword highlighting |
| `src/popup/popup.ts` | 341 | Tab UI; paste resume + paste JD + call API; show result; history |
| `src/options/options.ts` | 101 | Settings page (API URL, Firebase config override, debug, file-size limit) |
| `src/common/auth.ts` | 297 | Bridge-flow OAuth via `chrome.identity.launchWebAuthFlow` → `hiretuner.com/extension-auth` → ID token cached in `chrome.storage.local` |
| `src/common/api.ts` | 157 | Wraps fetch with `Authorization: Bearer <idToken>` when cached |

There is **no code at all** for:
- form-field detection or autofill
- file `<input type=file>` programmatic upload
- cover-letter drafting, generation, or insertion
- multi-page application step navigation
- ATS-platform-specific submission flow (Greenhouse, Lever, Workday, etc.)
- per-tab state, application progress tracking, retry on failure

If those are launch requirements, this audit is the wrong document — what you need is a build spec.

---

## Architecture snapshot (what's there)

```
┌────────────────────────────────┐
│  Chrome toolbar icon (action)  │
└──────────────┬─────────────────┘
               │
               ▼
┌────────────────────────────────┐
│  popup.html / popup.ts         │
│   • tab UI (Analyze / Extract / History / Settings)
│   • textareas for resume + JD
│   • Analyze button → apiClient
│   • "Extract job description"  ─────────────► sends EXTRACT_JOB_DESCRIPTION to active tab
│   • "Sign in with Google"      ─────────────► launchBridgeFlow()
└──────────────┬─────────────────┘
               │
               ▼
┌────────────────────────────────┐         ┌─────────────────────────────────┐
│  service-worker.ts (background)│ ◄─────► │  chrome.storage.local           │
│   • routes GET/SAVE/HISTORY    │         │   storedResume                  │
│   • weekly cleanup alarm       │         │   analysisHistory (50 cap)      │
└──────────────┬─────────────────┘         │   firebaseIdToken               │
               │                            │   firebaseUid (= email str)     │
               │                            │   firebaseEmail / DisplayName   │
               ▼                            └─────────────────────────────────┘
┌────────────────────────────────┐
│  content.ts on tab             │   tabs.sendMessage from popup
│   • only on the 7 manifest sites │   ⇄
│   • getCurrentJobDescription() │
│   • highlightKeywords()         │
└──────────────┬─────────────────┘
               │
               ▼
       (DOM of the user's job-site tab — read only)

┌────────────────────────────────┐
│  api.ts                        │  HTTPS  /api/tools/{ats-score,resume-match,
│   • Bearer <idToken> if cached │  ──────► keyword-scan,bullet-generator,
│   • POST → hiretuner.com       │           interview-questions}
└────────────────────────────────┘
```

---

## What works correctly

- **MV3 service-worker + `chrome.storage.local`** message routing is standard and correctly implemented.
- **JD extraction on LinkedIn / Indeed / Glassdoor** *does* succeed when the sites' DOM matches the listed selectors. Confirmed live earlier in this conversation series on LinkedIn.
- **JSON-LD JobPosting fallback** is the right idea and would catch many ATS-driven boards — *if* the content script were registered for them.
- **Bridge OAuth flow** correctly uses `chrome.identity.launchWebAuthFlow` and `chrome.identity.getRedirectURL` with `chromiumapp.org`, gets a verified Firebase ID token, and POSTs it to `/api/auth/firebase` to mint a HireTuner session.
- **Permission posture is minimal**: `storage`, `activeTab`, `alarms`, `identity`. Host permissions narrowed to hiretuner + Firebase Auth endpoints only (after the prior audit-fix pass). No `<all_urls>`, no `tabs`, no `scripting`.
- **Network defaults** for the active configured user point to `https://hiretuner.com` (in options page DEFAULT_CONFIG and in `getApiUrl` in auth.ts). The localhost defaults that exist in `service-worker.ts:61` and `api.ts:15` only fire on the very first request before `chrome.storage.sync` is read — see B4 below.

---

## Severity guide

- **Critical** — feature claimed in scope is entirely absent OR a real-user flow cannot complete OR there is a security or stability flaw.
- **High** — feature exists but breaks for a significant share of real users.
- **Medium** — works in the happy path but degrades silently on edge cases or specific sites.
- **Low** — polish, error UX, observability.

---

## Findings index (full details in EXTENSION_E2E_BUGS.md)

### Critical (8)
- **E1** Autofill is not implemented anywhere in the code.
- **E2** Cover-letter automation is not implemented.
- **E3** File-upload automation is not implemented.
- **E4** Multi-step application workflow is not implemented.
- **E5** Greenhouse, Lever, Workday, Workable — content script not registered for these domains; "we work on every ATS" claim is wrong.
- **E6** Token refresh path is broken; the extension silently downgrades to anonymous after ~50 minutes.
- **E7** `highlightKeywords` produces XSS-class HTML injection via `innerHTML` with attacker-controllable regex pattern.
- **E8** First API call after a fresh install hits `http://localhost:3000` (both `service-worker.ts:61` and `api.ts:15`).

### High (10)
- **E9** LinkedIn selectors are hardcoded, fragile, and dated. No JSON-LD fallback for LinkedIn (they don't emit JobPosting JSON-LD).
- **E10** Indeed: one of the three "fallback" selectors targets `#jobsearch-ViewjobPaneWrapper` — a layout wrapper, not the description body.
- **E11** Monster, Dice, careers.google.com, careers.microsoft.com — declared in `content_scripts.matches` but **no site-specific selectors exist**. They depend on the generic JSON-LD / longest-text fallback, which doesn't always fire.
- **E12** Generic fallback caps page text at 12,000 chars — Workday, long bullet-pointed JDs lose the tail.
- **E13** Generic fallback requires the text to match `/(responsib|requirement|qualif|experience)/i` — non-English JDs, internships, and atypically-worded postings miss entirely.
- **E14** JSON-LD fallback uses `tmp.innerHTML = html` then reads `textContent` — passes raw HTML through the browser parser. A `<script>` in a JobPosting description string would execute in the extension's content script context if `tmp` were attached to the document (it isn't, so it doesn't currently — but this is a latent risk).
- **E15** `highlightKeywords` replaces text nodes wholesale; this corrupts React / Vue / Angular reconciliation on SPA job sites, breaking subsequent navigation and rerenders.
- **E16** "Save resume" persists only the raw text in `chrome.storage.local.storedResume` — no sync with the master resume on the user's HireTuner account.
- **E17** `firebaseUid` in extension storage is set to `bridge.email ?? "ext-user"` — email used as UID, multiple installs by same user produce identical "uid", email change invalidates it. Doesn't affect server (server uses the verified Firebase token) but extension client state is wrong.
- **E18** `extractJobBtn.addEventListener` (popup) calls `chrome.tabs.sendMessage` with no timeout / no error if content script isn't loaded on the current tab. UI hangs silently.

### Medium (11)
- **E19** Popup field validation is client-only and doesn't catch the bullet-generator's server-side ≥10-char `existingBullet` requirement, so users see "validation_error" without an inline hint.
- **E20** Options page exposes `firebaseApiKey` / `firebaseAuthDomain` etc. as configurable, but the build bakes these via webpack DefinePlugin (`chromeExtension/webpack.config.js`). User-edited values appear to take effect but the bundle still uses build-time values for module initialization. Misleading.
- **E21** Settings DEFAULT_CONFIG.maxFileSize is `8` (MB); server enforces 5 MB. User can pick a value the server will always reject.
- **E22** Default `apiUrl` differs across files: options page DEFAULT_CONFIG = `https://hiretuner.com`; service worker = `http://localhost:3000`; api.ts = `http://localhost:3000`.
- **E23** `chrome.tabs.sendMessage` response is processed by an arrow function with no `return true` semantics; if the content script never replies (e.g. injected too late), `response` is `undefined` and the catch block doesn't fire.
- **E24** History capped at 50 + 7-day weekly purge. Power users lose most of their session.
- **E25** No telemetry / Sentry / error logging anywhere. When the extension silently breaks on a user, you'll never know.
- **E26** Popup `displayResult` uses `JSON.stringify(data, null, 2)` and inserts into `resultContent.textContent` — okay for safety but unreadable raw JSON to the user.
- **E27** Popup `showError` does not auto-hide and is not associated with the field that errored; error stays even after the user fixes the input.
- **E28** No keyboard shortcuts, no `commands` block in manifest; can't trigger extract / analyze from a hotkey.
- **E29** Popup tab switching uses jQuery-style class toggling and isn't keyboard-accessible (no `role="tablist"` / `aria-selected` / arrow-key navigation).

### Low (7)
- **E30** `console.log('[Background] Service Worker initialized')` and similar in production. Pollutes user devtools, no `if (debug)` guard.
- **E31** Manifest `description` is 116 chars — fine. Manifest `name` is `"HireTuner — AI Resume Optimizer"` — uses an em-dash which sometimes breaks Web Store search.
- **E32** Manifest has no `commands` (hotkeys), no `omnibox`, no `side_panel`, no `notifications` — all leave UX features on the table.
- **E33** `popup.css` and `popup.html` lack any explicit `lang` / `dir` attributes — i18n future-proofing.
- **E34** Action icon never changes state to show "signed in" or "analyzing".
- **E35** Service worker doesn't catch `chrome.runtime.onMessage` errors from inside the handlers — a thrown error in `chrome.storage.local.set` callback silently swallows.
- **E36** `chrome.identity.getRedirectURL("oauth")` is called every time `signInWithGoogle` runs; harmless but wastes a call.

---

## Real-user-journey simulation (as requested)

I walked the requested journey "from login to application submission" on paper, identifying where each step would fail:

| # | Step | Status | Why |
|---|---|---|---|
| 1 | Install extension from Web Store | ⚠ Pending Web Store approval (separate issue) | Listing was rejected once already (see prior session) |
| 2 | Click extension icon, see "Sign in with Google" | ✅ Works | Bridge popup opens hiretuner.com/extension-auth |
| 3 | Complete Firebase Google sign-in in popup | ✅ Works | ID token returned via `chromiumapp.org` |
| 4 | Open a LinkedIn job posting | ✅ Works (mostly) | Site-specific selectors hit |
| 5 | Click "Extract job description" | ✅ Works | JD text loaded into popup textarea |
| 6 | Open a **Greenhouse** job posting and click Extract | ❌ **FAIL** | Content script not injected on Greenhouse |
| 7 | Paste resume → Analyze → ATS score | ✅ Works | API call hits `/api/tools/ats-score` with Bearer token |
| 8 | Apply now → autofill form fields | ❌ **FAIL** | No autofill code exists |
| 9 | Upload resume to the application form | ❌ **FAIL** | No file-upload code exists |
| 10 | Generate a cover letter | ❌ **FAIL** | No cover-letter code exists |
| 11 | Click Next on Workday multi-step page | ❌ **FAIL** | No workflow / no Workday support |
| 12 | Submit application | ❌ **FAIL** | No submit handling |
| 13 | Wait ~60 minutes, do step 5 again | ❌ **FAIL** | Token expired, refresh path doesn't work (E6) → calls become anonymous, hit anonymous rate limit |

So a real-user journey fails at step 6 on most ATS-driven companies, and at step 8 on every job site for the autofill claim.

---

## Recommendations roadmap

**Don't ship "autofill / cover letter / multi-step" messaging.** Either build the features (this is a major effort — see appendix below) or drop the claim. Decision-mode: pick one of:

A. **Ship as "JD-extraction + analysis assistant"** — set expectations correctly, fix the bugs in EXTENSION_E2E_BUGS.md by severity. Total effort ~1 week.
B. **Build the missing automation features.** Realistic scope below. Total effort 4-8 weeks per platform.

If A: prioritize E5, E6, E8, E9 — those are the launch-blocking quality issues for the feature that *does* ship.

If B: roadmap below.

**Hardening (do regardless):**
1. Add Greenhouse, Lever, Workday, Workable to `content_scripts.matches`.
2. Drop the hardcoded `http://localhost:3000` from both `api.ts` and `service-worker.ts`; default to `https://hiretuner.com`.
3. Replace `tmp.innerHTML` in the JSON-LD parser with DOMParser + textContent only.
4. Replace `highlightKeywords` `innerHTML` with a safe TextNode-based highlighter, OR drop the feature.
5. Wire token refresh to call `/api/auth/firebase/refresh` (new endpoint) before the 50-minute window expires. The existing `signInWithCredential` path with `GoogleAuthProvider.credential(idToken)` would also work but requires the extension to participate in Firebase sign-in instead of just receiving an ID token.
6. Add Sentry (or a tiny `POST /api/telemetry/error` endpoint) so silent breakage gets noticed.

**For the autofill/cover-letter/multi-step features (if you do build them):**

| Feature | Approach | Per-site work |
|---|---|---|
| Field-mapping autofill | Per-ATS JSON contract of `{fieldName: selector}` for each of Greenhouse / Lever / Workday / Workable / Ashby / Taleo. Run on DOMContentLoaded + MutationObserver. | ~3 days per ATS to harden |
| File upload | `DataTransfer` + dispatch `change` on `input[type=file]` works on most ATSes. Workday uses a custom dropzone that requires synthesizing a drag-and-drop event. | ~2 days per ATS |
| Cover letter | Use `/api/tools/bullet-generator` + a new `/api/tools/cover-letter` endpoint; render to a textarea or rich-text field per ATS | ~3 days per ATS |
| Multi-step navigation | Per-ATS Next-button selectors + a state machine that tracks "step N of M" and resumes if the user closes the popup | ~5 days per ATS, plus a shared state-machine library |
| Submission button | Per-ATS Submit selector; require explicit user click — never auto-submit | ~1 day per ATS |

That's ~14 days per ATS times 5+ ATSes ⇒ realistic estimate **2-3 calendar months** before "apply to a Greenhouse job in three clicks" is a defensible claim. Anything short of that is marketing fiction.

---

## Confidence statement

Every code-derived finding (E1-E36) cites an exact file and line number. The "feature missing" findings (E1-E4) are an absence of code, which I verified by `grep` for relevant terms (`autofill`, `<input.*type.*file`, `cover.letter`, multi-step state) across `chromeExtension/src/` — zero matches. The user-journey simulation is based on the existing code paths, not on speculation. The token-refresh failure (E6) and the localhost default (E8) were confirmed by reading the auth flow end to end.

Live-installation runtime verification (installing the unpacked extension, walking a real LinkedIn → Greenhouse → Workday flow with screenshots) was not performed in this audit pass because the prior session established that the extension hasn't yet been deployed and the published Web Store listing is in `Draft`. The bug list does not depend on that runtime test — the missing features and the broken refresh are visible from the source.
