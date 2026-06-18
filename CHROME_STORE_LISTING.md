# Chrome Web Store Listing — HireTuner

The Chrome Web Store dashboard cannot be automated by extensions (browser-level
restriction), so this is the ready-to-paste field-by-field guide. Open the
dashboard tab you already have (`chrome.google.com/webstore/devconsole/...`)
and fill in:

---

## Package upload

- Click **"+ New item"** → drag-drop
  `/Users/achyuth/Documents/Website Ideas/makemyresume/hiretuner-chrome-extension.zip`
- Chrome will validate the manifest and surface the extension ID (long random
  string like `abcdefghijklmnop...`). **Copy that ID** — you'll need it twice:
  1. To create the OAuth Chrome App client (see "OAuth" section below).
  2. To add it to Firebase Authorized Domains (`chrome-extension://<id>`).

---

## Store listing tab

### Single-purpose description (required, ≤132 chars)
Already baked into `manifest.json` (116 chars — fits the limit):
```
Tune your resume to every job — instant ATS score, keyword gap scan, and AI bullet suggestions on any job posting.
```

### Detailed description (paste verbatim)
```
HireTuner is an AI-powered Chrome extension that helps job seekers beat ATS filters and land more interviews.

Paste your resume once, then extract any LinkedIn / Indeed / Glassdoor / Monster / Dice job description with one click and get an instant analysis:

  • ATS Compatibility Score — see exactly how a typical ATS will rank your resume against the role.
  • Keyword Gap Scan — every required and preferred skill in the JD, marked as Found, Reworded, Needs Confirmation, or Not Added.
  • Resume Match — directional match score with a breakdown across required skills, responsibilities, experience, and formatting.
  • Bullet Point Generator — transform weak resume bullets into high-impact, metrics-driven achievements.
  • Interview Questions — likely interview questions generated from the job description.

The extension talks to the HireTuner web app (https://hiretuner.com) over HTTPS. Sign in with Google through Firebase to unlock your Starter plan quota (up to 100 tailored resumes per month).

Your data:
  • Resume text and analysis history are stored locally in chrome.storage — never uploaded except when you explicitly run an analysis.
  • Analysis requests are sent to HireTuner servers and processed against the job description you provide.
  • We never sell or share your personal data with third parties.

Pricing:
  • Free tier: 5 resume matches per month, basic ATS keyword gap.
  • Starter: $5.49/mo or $54.99/yr — 100 tailored resumes per month, advanced AI rewriting engine, master resume management, application tracker.

Read our Privacy Policy: https://hiretuner.com/privacy-policy
Terms of Service: https://hiretuner.com/terms-of-service
```

### Category
**Productivity** → **Workflow & Planning** (or simply "Productivity").

### Language
English (United States).

---

## Graphic assets

| Slot | Required size | File |
|---|---|---|
| Store icon | 128 × 128 PNG | `chromeExtension/public/icon-128.png` |
| Small promo tile | 440 × 280 PNG (or skip) | We have a 440×440 square — Chrome will accept it but resize. Use `chromeExtension/public/icon-440.png` and crop if rejected, or skip this slot (only the 128 store icon is *strictly* required for unlisted/private; promo is encouraged for public). |
| Screenshots | 1280 × 800 or 640 × 400 PNG/JPG, at least 1, up to 5 | TODO — capture three screenshots: (1) popup on a LinkedIn job page showing the JD extracted, (2) Analyze tab with a real ATS score result, (3) Options page showing Firebase settings filled in. |

To capture screenshots: open the popup on a LinkedIn job, hit ⇧⌘4 then space, click the popup. Repeat for the other two views.

---

## Privacy practices tab

This is the section reviewers care about most. Answer truthfully:

- **Single purpose**: "Tune the user's resume to a job description by extracting the JD from any job site and running ATS/keyword/match analyses via the HireTuner web service."
- **Permission justifications**:
  - `storage` — Save user's resume and analysis history locally in `chrome.storage`.
  - `activeTab` / `tabs` — Read the job description from the user's currently-open tab when they click Extract.
  - `scripting` — Inject the keyword highlighter into the active page.
  - `alarms` — Weekly cleanup of stored analysis history older than 7 days.
  - `identity` — Authenticate the user with Google via `chrome.identity.getAuthToken` to unlock paid-plan quotas.
  - Host permission `https://hiretuner.com/*` — Send analysis requests to the HireTuner backend.
  - Host permissions for job sites — Read the JD from LinkedIn, Indeed, Glassdoor, Monster, Dice when the user clicks Extract.
- **Data collected**:
  - "Personal communications" → NO
  - "Authentication information" → YES (Firebase ID tokens, exchanged with our server for a session).
  - "Personally identifiable information" → YES (the user's email + display name from Google when they sign in).
  - "Web history" → NO (we don't track browsing — we only read the active tab when the user clicks Extract).
  - "User activity" → NO.
  - "Website content" → YES (we read the job description text from the active job-site tab when the user clicks Extract).
- **Remote code use**: NO (all code is bundled in the package; no eval/remote scripts).
- **Privacy policy URL**: `https://hiretuner.com/privacy-policy`

Tick the certification at the bottom acknowledging the Chrome Web Store
Developer Program Policies.

---

## OAuth (critical — sign-in will fail without this)

The current manifest has a placeholder `oauth2.client_id`. Before submission:

1. Open https://console.cloud.google.com → APIs & Services → Credentials.
2. **Create Credentials → OAuth client ID → Application type = "Chrome App"**.
3. **Application ID**: paste the extension ID Chrome assigned when you uploaded
   the zip in step "Package upload" above.
4. Save → copy the generated `xxxxxx.apps.googleusercontent.com`.
5. Open `chromeExtension/manifest.json`, replace the placeholder, rebuild
   (`cd chromeExtension && npm run build`), re-zip:
   ```
   cd chromeExtension/dist && zip -r ../../hiretuner-chrome-extension.zip . -x "*.map" -x "*.d.ts*"
   ```
6. Back in the Chrome Web Store dashboard, **upload the new zip** to bump the
   package, then re-submit.

You only need to do this once — the OAuth client is tied to the extension ID,
which doesn't change when you update the package.

---

## Submit

Once all required fields are green:

1. Click **"Submit for review"**.
2. Google typically reviews within 1–3 business days. They may ask follow-up
   questions if any permission seems excessive — your `tabs` + multiple
   host permissions are common scrutiny targets, but the justifications above
   cover the reasoning.

---

## Outputs ready in your folder

- `hiretuner-chrome-extension.zip` (148 KB, MV3 — drag into the dashboard).
- `chromeExtension/public/icon-128.png` — store icon.
- `chromeExtension/public/icon-440.png` — fallback promo tile (crop to 440×280
  if Chrome rejects the square aspect).

I left the existing 16/32/48/128 PNGs inside the zip too, so the extension
shows the new HireTuner brand mark immediately in the browser toolbar and the
chrome://extensions page.
