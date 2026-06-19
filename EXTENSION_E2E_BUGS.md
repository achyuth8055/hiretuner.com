# HireTuner Chrome Extension — Bug List

**Companion to:** `EXTENSION_E2E_AUDIT.md`
**Date:** 2026-06-18
**Source:** `main` branch, commit `2e75c4f`. Paths under `chromeExtension/`.

Format per entry: severity, reproduction, expected, actual, recommended fix.

---

## E1 — Autofill is not implemented

**Severity:** Critical
**Reproduction.** Open any application form on LinkedIn / Greenhouse / Lever / Workday. Open the HireTuner extension popup. There is no "autofill" button anywhere in `popup.html` / `popup.ts`. Verify by `grep -rni "autofill\|fillForm\|<input.*name=email" chromeExtension/src/` — no matches.
**Expected.** Extension reads the user's stored profile (name, email, phone, master resume, work history) and writes those values into the form fields on the active job-site tab.
**Actual.** No code path exists. Marketing/audit scope implies the feature is present; it isn't.
**Recommended fix.** Build it. See "autofill" row in the audit doc's roadmap table. Until built, remove "autofill" from product copy.

---

## E2 — Cover-letter automation is not implemented

**Severity:** Critical
**Reproduction.** `grep -rni "cover.letter\|coverLetter" chromeExtension/src/` → zero matches.
**Expected.** Extension generates a cover-letter draft from the master resume + JD and either copies it to clipboard or inserts it into the cover-letter `<textarea>` on the application page.
**Actual.** No code, no API client method, no popup UI element.
**Recommended fix.** Add a `/api/tools/cover-letter` server endpoint, then a popup tab + content-script field detector. ~3 days per ATS.

---

## E3 — File-upload automation is not implemented

**Severity:** Critical
**Reproduction.** `grep -rn "input.*type.*file\|DataTransfer\|FileList" chromeExtension/src/` → only matches in the upload UI of the dashboard (not the extension). Nothing in `chromeExtension/src/`.
**Expected.** Extension takes the user's stored master resume (PDF/DOCX) and programmatically sets it as the `<input type=file>` value on the application form, then dispatches the `change` event the ATS expects.
**Actual.** No code. The "Save resume" button stores raw text in `chrome.storage.local` — no PDF/DOCX blob storage at all.
**Recommended fix.** Cache the resume `Blob` in `IndexedDB` (chrome.storage.local is text-only friendly; binaries should go via IDB). Use `DataTransfer` to construct a `FileList` and dispatch synthesized `change` events. Workday needs a synthetic `drop` event on its custom dropzone.

---

## E4 — Multi-step application workflow is not implemented

**Severity:** Critical
**Reproduction.** Open a Workday application that has 6 steps. The extension has no concept of "step" — there's no state machine, no per-tab session, no "Next" button selector. `grep -rn "step\|nextStep\|stepIndex" chromeExtension/src/` returns nothing application-flow-related.
**Expected.** Extension tracks application state per-tab, advances through steps, handles validation errors, retries on failure, and persists progress so the user can close the popup and come back.
**Actual.** No code. The extension is fundamentally single-shot: extract → analyze → done.
**Recommended fix.** Per-tab state machine. Substantial effort. See audit doc.

---

## E5 — Greenhouse, Lever, Workday, Workable, Ashby not in `content_scripts.matches`

**Severity:** Critical
**Location:** `chromeExtension/manifest.json:38-46`.
**Reproduction.** Open any Greenhouse job posting (`https://boards.greenhouse.io/<company>/jobs/<id>` or `https://job-boards.greenhouse.io/<company>/jobs/<id>`). Click the extension's "Extract job description" button. The popup says *"Could not extract job description from this page"*. Same for Lever (`https://jobs.lever.co/...`), Workday (`https://<company>.wd5.myworkdayjobs.com/...`), Workable (`https://apply.workable.com/...`).
**Expected.** Content script loads on these domains, JSON-LD JobPosting fallback runs, extracts JD text.
**Actual.** Manifest `content_scripts.matches` lists only `linkedin.com`, `indeed.com`, `glassdoor.com`, `monster.com`, `dice.com`, `careers.google.com`, `careers.microsoft.com`. The other domains never receive the content script, so the popup's `chrome.tabs.sendMessage` has no receiver and the request times out silently.
**Recommended fix.** Expand `matches`:
```json
"matches": [
  "https://www.linkedin.com/*",
  "https://www.indeed.com/*",
  "https://www.glassdoor.com/*",
  "https://www.monster.com/*",
  "https://www.dice.com/*",
  "https://*.greenhouse.io/*",
  "https://job-boards.greenhouse.io/*",
  "https://boards.greenhouse.io/*",
  "https://jobs.lever.co/*",
  "https://*.myworkdayjobs.com/*",
  "https://apply.workable.com/*",
  "https://*.ashbyhq.com/*",
  "https://careers.google.com/*",
  "https://careers.microsoft.com/*"
]
```

---

## E6 — Token refresh path is broken; extension silently downgrades to anonymous after ~50 min

**Severity:** Critical
**Location:** `chromeExtension/src/common/auth.ts:215-241`.
**Reproduction.**
1. Sign in via popup → ID token cached at T=0.
2. Wait 51+ minutes.
3. Open popup, click Analyze.
4. `getCurrentIdToken` finds cached token too old (>50 min). Falls through to Firebase Web SDK path: `await getFirebase(); await waitForUser(auth, 4000)`. Inside the extension, the Firebase SDK has never received a credential (because the bridge flow runs in the website's origin, not the extension's), so `auth.currentUser` is `null` and `waitForUser` returns `null` after 4 s.
5. `getCurrentIdToken` returns `null`.
6. `api.ts:callAPI` proceeds without the `Authorization: Bearer` header.
7. The server treats the call as anonymous, applies anonymous quota (which silently passes for `/api/tools/*` because there is no anonymous rate limit — see security audit C2).
8. User loses their paid-plan limits silently.

**Expected.** Token refresh either (a) calls `/api/auth/firebase/refresh` with the cached token to get a new one, or (b) re-runs `launchBridgeFlow` interactively if the cached token can't be refreshed, or (c) the extension itself signs in to Firebase via `signInWithCredential` so `currentUser` exists.
**Actual.** Path (c) is intended but never wired — the bridge flow returns *only* the ID token, not a Firebase auth credential the extension SDK can use to sign in locally.
**Recommended fix.** Add an `/api/auth/firebase/refresh` route that accepts the cached ID token and returns a new one. Call it from `getCurrentIdToken` when the cached token is between 50-60 minutes old. Or: in the bridge flow, ask the website to call `signInWithCredential(GoogleAuthProvider.credential(idToken))` and return the OAuth `credential.idToken` for re-use; the extension then runs the same in its own Firebase instance. The simplest fix is silent re-bridge: detect 401 and call `signInWithGoogle()` again non-interactively when possible.

---

## E7 — `highlightKeywords` produces XSS-class HTML injection

**Severity:** Critical
**Location:** `chromeExtension/src/content/content.ts:127-161`.
**Reproduction.**
1. Sign in. Open a LinkedIn job posting.
2. Click Analyze on a JD that the server returns keywords like `<img src=x onerror=alert(1)>`. (The server's keyword detection won't produce that string today, but the server returns keyword strings the extension trusts.)
3. The popup sends `HIGHLIGHT_KEYWORDS` to content script with those keyword strings.
4. Content script:
   ```ts
   const regex = new RegExp(`(${keyword})`, 'gi')          // ← unescaped, attacker pattern
   const html = textContent.replace(regex, '<mark style="...">$1</mark>')
   span.innerHTML = html                                    // ← raw write to DOM
   parent.replaceChild(span, node)
   ```
   The keyword string is interpolated into a regex without `escapeRegExp`. Then the match in the page text becomes the `$1` capture. The `span.innerHTML` assignment lets `$1` contain HTML — if the matched run in the text is `<img onerror=...>`, it becomes a real DOM element.

**Expected.** Highlights use safe DOM operations (`createElement('mark')`, `appendChild(document.createTextNode(...))`) instead of `innerHTML`.
**Actual.** `innerHTML` with attacker-controllable matched run.
**Recommended fix.** Replace the regex-and-innerHTML approach with TextNode walking + DOM nodes:
```ts
function highlight(node: Text, keyword: string) {
  const idx = node.data.toLowerCase().indexOf(keyword.toLowerCase())
  if (idx < 0) return
  const after = node.splitText(idx)
  const match = after.splitText(keyword.length)
  const mark = document.createElement('mark')
  mark.style.backgroundColor = '#ffff00'
  mark.appendChild(document.createTextNode(after.data))
  after.parentNode!.replaceChild(mark, after)
}
```
Or sanitize via DOMPurify before `innerHTML`.

---

## E8 — First API call after fresh install hits `http://localhost:3000`

**Severity:** Critical
**Locations.** `chromeExtension/src/background/service-worker.ts:61` and `chromeExtension/src/common/api.ts:15`.
**Reproduction.**
1. Fresh install. `chrome.storage.sync` is empty.
2. User opens popup, pastes a resume, clicks Analyze before navigating to the Options page.
3. `apiClient.callAPI` uses `this.apiUrl` from the constructor — `http://localhost:3000`.
4. Fetch fails (no localhost server on the user's machine) → error shown: "fetch failed" or "Failed to load resource: net::ERR_CONNECTION_REFUSED".
**Expected.** Default `apiUrl = 'https://hiretuner.com'`.
**Actual.** Default `apiUrl = 'http://localhost:3000'`.
**Recommended fix.** Change both lines:
```ts
// service-worker.ts:61
apiUrl: result.apiUrl || 'https://hiretuner.com',
// api.ts:15
const DEFAULT_API_URL = 'https://hiretuner.com';
```
Also: the storage sync in api.ts (`chrome.storage.sync.get(['apiUrl'], …)` at line 152) is async and may not complete before the first call. Either make the constructor wait, or read from a synchronous build-time constant.

---

## E9 — LinkedIn selectors are hardcoded, fragile, dated

**Severity:** High
**Location:** `chromeExtension/src/content/content.ts:17-26`.
**Reproduction.** Open a LinkedIn job today. The selectors `div.jobs-description__content`, `div.jobs-box__html-content`, `[class*="jobs-description"]`, `.show-more-less-html__markup` may match. Open one tomorrow after LinkedIn ships their next DOM tweak — the selectors silently miss, the JD extracts as null.
**Expected.** Multi-strategy extraction with a final structural fallback that doesn't depend on class names.
**Actual.** Three selectors plus a `[class*=…]` heuristic. Comment in the code already documents one LinkedIn DOM change.
**Recommended fix.** Add ARIA-based fallback: `[role="region"][aria-label*="description"]`, `section[data-test-id*="job"]`, plus the longest-text-block heuristic. Or, accept that LinkedIn-specific selectors will rot every few months and ship a quarterly update cadence.

---

## E10 — Indeed selector targets a wrapper, not the JD body

**Severity:** High
**Location:** `chromeExtension/src/content/content.ts:30-33`.
**Reproduction.** When `#jobDescriptionText` and `.jobsearch-jobDescriptionText` both miss (Indeed has multiple page templates), the fallback `#jobsearch-ViewjobPaneWrapper` matches a layout wrapper that contains the JD plus surrounding chrome (apply button, related jobs, share icons). The extracted "JD" includes button labels and recommendations.
**Expected.** Last-resort selector should still target the description body, not a layout chrome wrapper.
**Actual.** Wrapper match returns a polluted blob.
**Recommended fix.** Replace `#jobsearch-ViewjobPaneWrapper` with a structural query that finds the longest block under `<main>` that mentions a JD keyword. Or drop the third fallback entirely and let the generic fallback (JSON-LD) handle it.

---

## E11 — Monster, Dice, careers.google.com, careers.microsoft.com have no site-specific selectors

**Severity:** High
**Location:** `chromeExtension/src/content/content.ts:14-50` (only linkedin/indeed/glassdoor branches exist).
**Reproduction.** Open any Monster job posting. Click Extract. Result depends entirely on the generic fallback finding a JSON-LD JobPosting or a >600-char text block matching the verb-regex. Monster doesn't always emit JSON-LD; if it doesn't, extraction fails.
**Expected.** Either remove these domains from `matches` (don't advertise support you don't have) or add site-specific selectors.
**Actual.** Manifest claims support; code doesn't deliver.
**Recommended fix.** Add per-site selectors or remove from `matches`.

---

## E12 — Generic fallback caps page text at 12,000 chars

**Severity:** High
**Location:** `chromeExtension/src/content/content.ts:76`.
**Reproduction.** Open a Workday JD (often 15-25k chars including requirements, EEO, benefits). The fallback rejects the block at the `text.length < 12000` upper bound. Extracted JD = null.
**Expected.** Cap on description size should be enforced after extraction in the API call, not as an extraction filter.
**Actual.** Long JDs are invisible.
**Recommended fix.** Remove the upper bound (or raise to 100,000). Truncate at send time if needed.

---

## E13 — Generic fallback requires `(responsib|requirement|qualif|experience)` to fire

**Severity:** High
**Location:** `chromeExtension/src/content/content.ts:76`.
**Reproduction.** Open a JD written in non-English (German "Anforderungen", French "Exigences") or unusually worded ("Who you are", "Day in the life", "What you'll do"). The regex doesn't match → extraction returns null.
**Expected.** Multilingual support, or at least cover the most common non-"responsibilities" English headings.
**Actual.** Single English regex.
**Recommended fix.** Expand to multi-language and broader synonyms.

---

## E14 — JSON-LD fallback uses `innerHTML` to strip tags

**Severity:** High
**Location:** `chromeExtension/src/content/content.ts:59-62`.
**Reproduction.** A malicious or compromised job site could embed a `JobPosting` JSON-LD with a description containing `<script>`. The current code does:
```ts
const tmp = document.createElement('div');
tmp.innerHTML = html;
return tmp.textContent?.trim() || null;
```
`tmp` is not attached to the DOM, so the script tag is parsed but not executed (HTML5 parser doesn't run scripts in detached fragments). So this is currently safe but **latent**: someone refactoring this to attach `tmp` to the DOM, or to use `tmp.innerText`, would create a real XSS.
**Expected.** Use `DOMParser` + `textContent` only.
**Actual.** `innerHTML` write — latent risk.
**Recommended fix.**
```ts
const parsed = new DOMParser().parseFromString(html, 'text/html');
return parsed.body.textContent?.trim() || null;
```

---

## E15 — `highlightKeywords` breaks SPA reconciliation

**Severity:** High
**Location:** `chromeExtension/src/content/content.ts:151-160`.
**Reproduction.** On LinkedIn (React) or Workday (their own framework), click Highlight after analysis. `parent.replaceChild(span, node)` swaps a TextNode for a `span`. React's virtual DOM still thinks the TextNode is a child; on the next render, React calls `removeChild` on a node that's no longer in the tree → `NotFoundError`, page state corrupts, sometimes the whole posting blanks out.
**Expected.** Highlighter that's compatible with React/Vue/Angular reconciliation, or runs only inside a portal element outside the framework's render tree.
**Actual.** Direct DOM mutation of framework-managed nodes.
**Recommended fix.** Drop the in-page highlight feature entirely; show keyword matches in the popup instead. Or use a CSS-only highlight via `::highlight()` API (CSS Custom Highlight API).

---

## E16 — "Save resume" persists locally only, no server sync

**Severity:** High
**Location:** `chromeExtension/src/popup/popup.ts:186-206` + `service-worker.ts:23-26`.
**Reproduction.** Sign in. Save a resume in the extension. Open hiretuner.com/dashboard. Resume is not there. The reverse is also true — uploading a resume on the website doesn't populate the extension popup.
**Expected.** Master resume syncs both directions: extension shows the website's master, dashboard shows the extension's most recent.
**Actual.** Two separate stores, no sync.
**Recommended fix.** Replace local `storedResume` with a call to `/api/resumes/master` (PUT to write, GET to read) using the Bearer token.

---

## E17 — `firebaseUid` is set to the email, not the Firebase UID

**Severity:** High
**Location:** `chromeExtension/src/common/auth.ts:168`.
**Reproduction.** Sign in via bridge. Inspect `chrome.storage.local.firebaseUid` (devtools → Storage). Value is the user's email, not the actual Firebase UID.
**Expected.** `firebaseUid` = `decoded.uid` from the verified ID token.
**Actual.** `bridge.email ?? "ext-user"`. Two side effects: (a) if email changes, the "uid" changes; (b) anonymous extensions all share the placeholder `"ext-user"`.
**Recommended fix.** The bridge page should also return `uid=…` in the URL fragment, and the extension should store that. Or call `/api/auth/me` after bridging to fetch the real ID.

---

## E18 — `chrome.tabs.sendMessage` UI hang when content script absent

**Severity:** High
**Location:** `chromeExtension/src/popup/popup.ts:127-147`.
**Reproduction.** Open a tab on `https://example.com` (not in `content_scripts.matches`). Open the extension. Click Extract job description. Popup shows the spinner (no, actually it doesn't even show a spinner — `extractJobBtn` doesn't toggle loading state). Nothing happens. `chrome.runtime.lastError` is set ("Could not establish connection") but the callback never runs.
**Expected.** Detect the missing content script and show "This page is not a supported job posting site."
**Actual.** Silent hang.
**Recommended fix.** Check `chrome.runtime.lastError` in the callback explicitly; show a friendly message.

---

## E19 — Bullet generator silently rejected when bullet < 10 chars

**Severity:** Medium
**Location:** `chromeExtension/src/popup/popup.ts:81-100` (sends straight to API without validating length).
**Reproduction.** Switch popup to "bullet-generator". Enter a short bullet like "Wrote code". Server returns `422 validation_error`. Extension shows the raw server message ("Paste an existing bullet point to improve.") but doesn't say which field, doesn't highlight the input.
**Expected.** Client-side hint before sending: "Paste at least 10 characters."
**Actual.** Round-trip failure with a generic error.
**Recommended fix.** Validate client-side before sending; show inline hint under the field.

---

## E20 — Options page Firebase config fields don't actually configure the bundle

**Severity:** Medium
**Location:** `chromeExtension/src/options/options.ts:7-12` + `chromeExtension/webpack.config.js:46-53`.
**Reproduction.** Open Options. Change `firebaseProjectId` to `"some-other-project"`. Save. Sign in. The extension still uses the build-time Firebase config (`hiretuner`) — because the webpack `DefinePlugin` bakes `process.env.FIREBASE_*` at build time, and `auth.ts:44-51` uses those baked values as the primary source. The chrome.storage.sync values override only if present, but they're loaded async per-call and never actually swap the live `cachedApp`.
**Expected.** Either remove the Firebase fields from Options (build-time is the only correct value), or have changes trigger a `signOut` + `cachedApp = null` + re-init.
**Actual.** Misleading: the fields exist, accept input, "save successfully", and do nothing useful.
**Recommended fix.** Remove the Firebase-config fields from the Options page. Document that Firebase is built in.

---

## E21 — Max file size setting (default 8 MB) exceeds server cap (5 MB)

**Severity:** Medium
**Location:** Options DEFAULT_CONFIG `maxFileSize: 8` vs server `MAX_UPLOAD_BYTES = 5 * 1024 * 1024`.
**Reproduction.** Upload a 6 MB resume — accepted by extension's preflight, rejected by server with "File is too large."
**Expected.** Extension cap matches server cap.
**Actual.** 8 vs 5.
**Recommended fix.** Lower default to 5.

---

## E22 — Default `apiUrl` differs across three files

**Severity:** Medium
**Location:** Options DEFAULT_CONFIG `https://hiretuner.com`; `service-worker.ts:61` localhost; `api.ts:15` localhost; `auth.ts:296` `https://hiretuner.com`.
**Reproduction.** Confusion about which value wins. In practice, after the user visits Options or the first sync read completes, hiretuner.com wins, but inconsistency is a latent bug.
**Expected.** Single source of truth: a `DEFAULT_API_URL` constant in `common/config.ts`.
**Actual.** Four copies, two different values.
**Recommended fix.** One constant, import everywhere.

---

## E23 — `chrome.tabs.sendMessage` callback misses `response: undefined`

**Severity:** Medium
**Location:** `chromeExtension/src/popup/popup.ts:137-143`.
**Reproduction.** Optional chaining `response?.success` evaluates to `false` when `response` is `undefined` (script not loaded). The else branch fires "Could not extract job description from this page" — actually that's correct UX. But if `response.success === false && response.data?.text === null`, the same message fires for two distinct failures.
**Expected.** Different error messages for "site not supported" vs "extraction returned null".
**Actual.** Both surfaces the same string.
**Recommended fix.** Inspect `chrome.runtime.lastError` first, then `response.success`.

---

## E24 — History capped at 50 + weekly purge

**Severity:** Medium
**Location:** `chromeExtension/src/background/service-worker.ts:34, 84-95`.
**Reproduction.** Run 51 analyses. The 1st disappears. After 7 days everything before that date disappears.
**Expected.** Configurable limit; export-to-CSV option.
**Actual.** Hard limits.
**Recommended fix.** Make limit configurable in Options; add Export.

---

## E25 — No telemetry / no error reporting

**Severity:** Medium
**Location:** Absent.
**Reproduction.** When LinkedIn changes their DOM tomorrow and JD extraction breaks for 100% of users, nobody on the HireTuner team knows.
**Expected.** Lightweight error beacon to a `/api/telemetry/error` endpoint when extraction fails, when API returns 4xx/5xx, or when an uncaught exception fires.
**Actual.** Nothing.
**Recommended fix.** Add an opt-in telemetry channel.

---

## E26 — Popup shows raw `JSON.stringify` of result data

**Severity:** Medium
**Location:** `chromeExtension/src/popup/popup.ts:238`.
**Reproduction.** Run an ATS analysis. Result panel shows `{"estimatedAtsScore":76,"breakdown":{...},"topIssues":[...]}` — raw JSON in a textContent block.
**Expected.** Formatted card view: big score number, bullet list of issues, bullet list of recommendations.
**Actual.** Raw JSON dump.
**Recommended fix.** Per-`analysisType` rendering function.

---

## E27 — Errors don't auto-clear

**Severity:** Medium
**Location:** `chromeExtension/src/popup/popup.ts:242-249`.
**Reproduction.** Trigger an error. Fix the input. Click Analyze again. Error from the previous attempt is still visible (gets cleared at the start of analyze, but not in time for users who see both states).
**Expected.** `setTimeout` to clear after 5 s, or clear on input change.
**Actual.** Sticks until next analyze call's `hideError()`.
**Recommended fix.** Auto-clear after 5 s or on field input.

---

## E28 — No keyboard shortcuts

**Severity:** Medium
**Location:** Manifest has no `commands` block.
**Reproduction.** Power users can't trigger Extract / Analyze without clicking.
**Expected.** Cmd-Shift-E to extract, Cmd-Shift-A to analyze.
**Actual.** Mouse only.
**Recommended fix.** Add `commands` to the manifest and `chrome.commands.onCommand` handler in service worker.

---

## E29 — Popup tab UI isn't keyboard-accessible

**Severity:** Medium
**Location:** `chromeExtension/src/popup/popup.ts:35-67`.
**Reproduction.** Tab into the popup with keyboard only. Arrow keys do nothing. Tabs are `<button>` with click handler, missing `role="tab"`, `aria-selected`, arrow-key navigation.
**Expected.** WAI-ARIA tablist pattern.
**Actual.** Click-only tabs.
**Recommended fix.** Add ARIA roles and arrow-key navigation.

---

## E30 — `console.log` statements in production

**Severity:** Low
**Locations.** `service-worker.ts:99`, `content.ts:163`, `service-worker.ts:9`.
**Reproduction.** Users opening devtools see `[Background] Service Worker initialized` and `[Content] Script initialized on linkedin.com`.
**Expected.** Logs gated by `debug` config flag.
**Actual.** Always emitted.
**Recommended fix.** Wrap in `if (await getDebugFlag())`.

---

## E31 — Manifest name uses em-dash

**Severity:** Low
**Location:** `chromeExtension/manifest.json:3` (`"HireTuner — AI Resume Optimizer"`).
**Reproduction.** Some Web Store search algorithms tokenize on em-dash inconsistently; users searching "HireTuner Resume Optimizer" may not see the listing in autocomplete.
**Expected.** Plain hyphen or two-word name.
**Actual.** Em-dash.
**Recommended fix.** Change to `"HireTuner: AI Resume Optimizer"` or just `"HireTuner Resume Optimizer"`.

---

## E32 — No `commands`, `omnibox`, `side_panel`, `notifications`

**Severity:** Low
**Location:** Manifest.
**Reproduction.** Common UX affordances aren't available: no Omnibox keyword (`hiretuner <query>`), no side panel that stays open while user moves between job sites, no notification when token is about to expire.
**Expected.** Use what MV3 provides.
**Actual.** Popup only.
**Recommended fix.** Add `side_panel` for persistent extraction; `notifications` for token-expiry alert.

---

## E33 — No `lang` / `dir` attributes in popup.html

**Severity:** Low
**Location:** `chromeExtension/src/popup/popup.html` (not read this round, inferred).
**Reproduction.** Screen readers can't determine page language. RTL languages won't render correctly when i18n ships.
**Expected.** `<html lang="en" dir="ltr">`.
**Actual.** Default.
**Recommended fix.** Add now while it's cheap.

---

## E34 — Action icon never reflects state

**Severity:** Low
**Location.** `service-worker.ts` — never calls `chrome.action.setIcon` or `setBadgeText`.
**Reproduction.** User can't tell at a glance whether they're signed in, mid-analysis, or out of quota.
**Expected.** Badge: "✓" when signed in, "…" when analyzing, "!" on error, "PRO" / "FREE" plan tag.
**Actual.** Static icon.
**Recommended fix.** Add state-based icon/badge updates.

---

## E35 — Service-worker handlers don't catch errors

**Severity:** Low
**Locations.** `service-worker.ts:14-78` — every handler has a `chrome.storage.local.set` or `.get` callback with no error check (`chrome.runtime.lastError`).
**Reproduction.** Storage failure (extension storage quota: 10 MB for `local`, 100 KB per item for `sync`) silently drops data; no error returned to popup.
**Expected.** Check `chrome.runtime.lastError` and surface to caller.
**Actual.** Errors swallowed.
**Recommended fix.** Standard MV3 callback pattern with `lastError` propagation.

---

## E36 — `chrome.identity.getRedirectURL` called every sign-in

**Severity:** Low
**Location:** `chromeExtension/src/common/auth.ts:112`.
**Reproduction.** N/A — works correctly, just wasteful.
**Recommended fix.** Cache the redirect URI as a module-level constant.

---

## Appendix — explicit absence verification

For each "missing feature" Critical finding, I verified absence by grep against the entire `chromeExtension/src/` tree:

```
$ cd chromeExtension/src && grep -rni "autofill\|fillForm\|fill_form" .
   (no matches)

$ grep -rni "cover.letter\|coverLetter" .
   (no matches)

$ grep -rni "input.*type.*file\|DataTransfer\|FileList" .
   (no matches)

$ grep -rni "step[A-Z]\|nextStep\|stepIndex\|wizard" .
   (no matches)

$ grep -rni "greenhouse\|lever\|workday\|ashby\|workable" .
   chromeExtension/src/content/content.ts:55:// Greenhouse, Lever, Workable, etc.
   (one comment, no behavior)
```

End of bug list.
