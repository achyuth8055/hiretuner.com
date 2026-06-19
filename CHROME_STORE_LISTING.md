# Chrome Web Store Listing — HireTuner

The Web Store dev console blocks extension scripting, so this is the
ready-to-paste field-by-field guide. Open the listing in the dashboard and
work top-to-bottom.

> ✅ **Updated zip ready:** `outputs/hiretuner-extension.zip` (56 KB).
> Manifest has been trimmed: removed `scripting` + `tabs` (unused),
> removed `http://localhost:*` host permissions (review-blocking),
> removed the placeholder `oauth2` block (we use a website bridge now).

---

## 1. Package upload

1. Dashboard → your item → **Package** tab → **Upload new package**.
2. Drag in `outputs/hiretuner-extension.zip`.
3. Manifest validates → version stays `1.0.0`.

---

## 2. Store listing tab

### Short description (already in manifest, ≤132 chars, 116 chars actual)
```
Tune your resume to every job — instant ATS score, keyword gap scan, and AI bullet suggestions on any job posting.
```

### Detailed description (paste verbatim)
```
HireTuner is a Chrome extension that helps job seekers beat ATS filters by analyzing how well a resume matches any given job description — directly from the job posting.

Paste your resume once, then extract a job description from LinkedIn / Indeed / Glassdoor / Greenhouse / Lever / Workday / Workable / Ashby with one click and get an instant analysis:

  • ATS Compatibility Score — an estimated score showing how a typical ATS will rank your resume against the role.
  • Keyword Gap Scan — every required and preferred skill detected in the JD, marked as Found, Found-but-Weak, Needs Confirmation, or Missing.
  • Resume Match — directional match score with a breakdown across required skills, responsibilities, experience, and formatting.
  • Bullet Point Suggestions — keyword-aware suggestions for rewording existing bullets to mirror JD language without inventing experience.
  • Interview Questions — likely interview questions derived from the job description.

Note: HireTuner extracts job descriptions and runs ATS analysis. It does NOT autofill or auto-submit applications. Those features are on the roadmap.

The extension talks to the HireTuner web app (https://hiretuner.com) over HTTPS. Sign in with Google through Firebase to unlock your Starter plan quota (up to 100 tailored resumes per month).

Your data:
  • Resume text and analysis history are stored locally in chrome.storage — never uploaded except when you explicitly run an analysis.
  • Analysis requests are sent to HireTuner servers and processed against the job description you provide.
  • We never sell or share your personal data with third parties.

Pricing:
  • Free tier: 5 resume matches per month, basic ATS keyword gap.
  • Starter: $5.49/mo or $49.99/yr — 100 tailored resumes per month, resume tailoring engine, master resume management, application tracker.

Read our Privacy Policy: https://hiretuner.com/privacy-policy
Terms of Service: https://hiretuner.com/terms-of-service
```

### Category
**Productivity**

### Language
English (United States)

---

## 3. Graphic assets

| Slot | Size | File |
|---|---|---|
| Store icon | 128 × 128 PNG | `chromeExtension/public/icon-128.png` |
| Small promo tile (optional) | 440 × 280 PNG | Skip unless you have one cropped to exactly 440 × 280. The square 440 will be rejected. |
| Screenshots (1–5, required ≥1) | 1280 × 800 PNG (no alpha) | Already in `outputs/` from earlier — re-upload if review reset them. |

---

## 4. Privacy practices tab  ← **THIS IS WHERE REVIEW USUALLY FAILS**

### Single purpose (paste verbatim)
```
Extract the job description from the user's currently-open job-site tab and run a heuristic ATS / keyword-gap / resume-match analysis against the user's stored resume via the HireTuner web service.
```

### Permission justifications (one per declared permission)

`storage`
```
Save the user's resume text, settings, and last 7 days of analysis history locally in chrome.storage on the user's own device. Nothing is uploaded.
```

`activeTab`
```
When the user clicks "Extract job description" in the popup, read the visible text of the currently-active job posting tab to send to the HireTuner backend for analysis. Only runs on user click, only on the active tab.
```

`alarms`
```
A single weekly chrome.alarms timer ('cleanup') prunes locally-cached analysis results older than 7 days from chrome.storage.local. No network or user-data side effects.
```

`identity`
```
Used to sign the user into HireTuner via chrome.identity.launchWebAuthFlow, which opens hiretuner.com/extension-auth in a popup, completes Firebase Google sign-in, and returns a Firebase ID token. No long-lived OAuth token is requested or stored.
```

### Host permission justification

`https://hiretuner.com/*`, `https://*.hiretuner.com/*`
```
The extension is a thin client of the HireTuner web app. All analysis requests, session cookies, and the OAuth bridge page live on hiretuner.com.
```

`https://identitytoolkit.googleapis.com/*`, `https://securetoken.googleapis.com/*`
```
Firebase Auth endpoints. The Firebase Web SDK bundled in the extension calls these to verify the user's ID token and refresh it before expiry. Standard, documented Firebase requirement.
```

### Content-script host matches (LinkedIn, Indeed, Glassdoor, Monster, Dice, careers.google, careers.microsoft)
```
Content script reads the job-description DOM on supported job boards so the user can extract the JD with one click from the extension popup. Runs at document_idle, only on the listed sites. Does not read other tabs, does not write to the page, does not exfiltrate browsing history.
```

### Data collected (toggles)

| Type | Collect? | Why |
|---|---|---|
| Personally identifiable information | **Yes** | Email + display name from Google sign-in (Firebase Auth). |
| Authentication information | **Yes** | Firebase ID token, exchanged with our server for a session. |
| Personal communications | No | — |
| Web history | No | We never read the user's browsing history. |
| User activity | No | — |
| Website content | **Yes** | Job description text from the active tab, on explicit user click. |
| Financial info / health / location | No | — |

### Three certifications at the bottom — **tick all three**
- ✅ I do not sell or transfer user data to third parties outside the approved use cases.
- ✅ I do not use or transfer user data for purposes unrelated to my item's single purpose.
- ✅ I do not use or transfer user data to determine creditworthiness or for lending purposes.

### Privacy policy URL
```
https://hiretuner.com/privacy-policy
```

> ⚠️ If `https://hiretuner.com/privacy-policy` returns 404 in a normal browser tab, review will reject the listing. Verify it loads before submitting.

### Remote code
**No** — all code is bundled. No `eval`, no remote `<script>`, no remote WASM.

---

## 5. Submit

1. All sidebar dots should be green ⬤.
2. Click **Submit for review** (top right).
3. Reviews usually clear in 1–3 business days. The bridge-based auth + tight permission list should sail through.

---

## Changes vs the previously-rejected submission

| Before | After | Why |
|---|---|---|
| `permissions: [storage, scripting, activeTab, tabs, alarms, identity]` | `[storage, activeTab, alarms, identity]` | `scripting` and `tabs` were never actually called — removing them avoids permission-justification rejection. |
| `host_permissions` included `http://localhost:3000/*` and `http://localhost:3055/*` | Removed | Web Store rejects `http://` hosts in published extensions. |
| `host_permissions` included `https://*.googleapis.com/*` and `https://*.firebaseio.com/*` (wildcards) | Narrowed to `identitytoolkit.googleapis.com` + `securetoken.googleapis.com` only | Wildcards on googleapis.com are flagged as overbroad; only the two Firebase Auth endpoints are actually called. |
| Placeholder `oauth2.client_id` block in manifest | Removed | We switched to `chrome.identity.launchWebAuthFlow` + a bridge page on hiretuner.com — no Chrome App OAuth client needed. |
| Missing `homepage_url`, `author` | Added | Review prefers these fields populated. |
