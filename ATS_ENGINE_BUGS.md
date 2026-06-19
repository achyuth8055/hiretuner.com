# HireTuner — Resume Engine Bug List

**Companion to:** `ATS_ENGINE_AUDIT.md`
**Date:** 2026-06-18
**Source:** `main` branch, commit `2e75c4f`. All line numbers refer to `src/lib/resume-engine.ts` unless stated otherwise.

Format per entry: severity, impact, reproduction, expected, actual, recommended fix.

---

## B1 — Negation is completely ignored in scoring and keyword matching

**Severity:** Critical
**Impact:** Users get inflated match scores and false confidence. A candidate who *explicitly disclaims* having a required skill receives credit as if they had it.
**Location:** `includesTerm` (`:127`), `scoreResumeAgainstJob` (`:668`), `buildKeywordCoverage` (`:724`), `countOccurrences` (`:765`).

**Reproduction (live, confirmed).**
```bash
curl -s -X POST https://hiretuner.com/api/tools/resume-match \
  -H 'Content-Type: application/json' \
  -d '{
    "resumeText": "Jane Doe Senior Engineer. I do not have AWS experience. I have not used Docker. I have never worked with Kubernetes. I am a Python expert with 10 years experience. I have worked at multiple companies and led many teams.",
    "jobDescriptionText": "Required: AWS, Docker, Kubernetes, Python. 5+ years experience. Build scalable services and lead teams. We are looking for someone with deep production experience."
  }'
# → score 63, requiredSkillsFound: ["AWS","Docker","Kubernetes"], requiredSkillsMissing: []
```

**Expected.** Skills that appear within a negation context ("not", "never", "no", "without", "do not have", "haven't", "don't") are excluded from the "found" count. Required-skills-missing should include AWS, Docker, Kubernetes.

**Actual.** Substring presence in the resume text is sufficient. Negation tokens are invisible to the engine.

**Recommended fix.** Add a negation window: when a candidate token is found, scan ±60 characters around the match for negation cues. Exclude matches whose window contains a negation. Example:
```ts
const NEGATION = /\b(no|not|never|without|don[' ]?t|doesn[' ]?t|haven[' ]?t|hasn[' ]?t|wasn[' ]?t|aren[' ]?t|cannot|can[' ]?t|lack(?:s|ed)?)\b/i
function isNegated(text: string, matchIndex: number, keyword: string) {
  const start = Math.max(0, matchIndex - 60)
  const end = Math.min(text.length, matchIndex + keyword.length + 60)
  return NEGATION.test(text.slice(start, end))
}
```

---

## B2 — `parseExperience` collapses every job into one entry

**Severity:** Critical
**Impact:** Multi-job resumes lose all per-role detail: job titles, companies, dates, locations all wrong. Every downstream consumer (tailoring, scoring, rendering, PDF) sees one mashed-together "job".
**Location:** `:437-468`.

**Reproduction.** Upload (or paste via `PUT /api/resumes/master`) a resume listing three jobs (TechCorp 2021-2024 senior, StartupCo 2018-2021 mid, BigCo 2016-2018 junior, each with 4-6 bullets). Then check `GET /api/resumes/master` — `structuredProfile.workExperience` will have length 1.

**Expected.** One `ExperienceItem` per job role, each with its own jobTitle, company, dates, location, and bullets.

**Actual.** `parseExperience` returns `[{ jobTitle: <first matching title>, company: <split of that line>, bullets: <all action-verb lines, capped at 8> }]`.

**Recommended fix.** Detect job-entry boundaries by date patterns (`\b\d{4}\s*[-–]\s*(present|\d{4})\b`) or by lines containing company + title separators (`-`, `|`, `@`, `at`). Iterate and emit one ExperienceItem per detected block.

---

## B3 — `parseProjects` collapses every project into one entry

**Severity:** Critical
**Impact:** Projects section misrepresented; recruiters reading the structured view see a single "Relevant Projects" item, not the candidate's actual projects.
**Location:** `:470-491`.

**Reproduction.** Paste a resume with 3 named projects (PROJECT 1: name + bullets, PROJECT 2: ...). Check `structuredProfile.projects.length` — always 0 or 1.

**Expected.** One `ProjectItem` per named project, with name, description, technologies, bullets.

**Actual.** Returns `[{ name: "Relevant Projects", description: bullets[0], technologies: <all skills found in section>, bullets: bullets.slice(1) }]`.

**Recommended fix.** Detect project boundaries by uppercased name lines, leading numbers ("1.", "2."), or blank-line separators. One ProjectItem per block.

---

## B4 — `parseEducation` returns one entry only

**Severity:** Critical
**Impact:** Candidates with multiple degrees (BS + MS, MBA + JD, etc.) lose all but one. Wrong degree may be picked because `lines.find` returns the first match regardless of priority.
**Location:** `:493-513`.

**Reproduction.** Resume with two degrees in EDUCATION block. `structuredProfile.education.length === 1`.

**Expected.** One entry per degree with degree, school, location, graduation date paired correctly.

**Actual.** Returns `[{ school: <first university/college/institute/school line>, degree: <first bachelor/master line>, location: "", graduationDate: <first year-like number> }]`.

**Recommended fix.** Group EDUCATION lines by date-range patterns or by blank lines into degree blocks. One EducationItem per block.

---

## B5 — `buildMinimalPdf` produces a one-page Helvetica file with ~50 visible lines

**Severity:** Critical
**Impact:** Any resume longer than ~50 wrapped lines (typical mid-career resume is 80+ when rendered) loses content. Users download a PDF missing their later jobs, projects, or education.
**Location:** `:1238-1278`.

**Reproduction.** Generate a tailored resume from a master resume with 3 jobs + 4 bullets each + education + projects. Download the PDF. Open in any viewer — last sections truncated below visible area.

**Expected.** Multi-page output that respects the page break.

**Actual.** Single page only:
- MediaBox `[0 0 612 792]` (US Letter, no A4 option).
- Starting Y = 760, line height = 14 — text falls off the page at line ~54.
- `.slice(0, 70)` caps lines after the 70th anyway.
- No Page 2 object.

**Recommended fix.** Replace with a real PDF generator (`pdfkit` for server, `puppeteer` for HTML-to-PDF using the templates from `src/lib/resume-templates/registry.ts`). At minimum: paginate by computing remaining height and emitting additional Page objects.

---

## B6 — PDF download ignores the user's chosen template

**Severity:** Critical
**Impact:** Marketing promises "30+ resume designs" (`src/lib/resume-templates/registry.ts`) but the downloaded file is always the same plain-text Helvetica PDF. The user picks a template in the editor, sees a styled preview, downloads — and gets something that looks like a 1990s LaTeX dump.
**Location:** Download path: `src/app/api/tailored-resumes/[id]/download/route.ts:32` calls `buildMinimalPdf(tailoredResume.resumeText)` unconditionally.

**Reproduction.** Sign in, generate a tailored resume, switch templates in `/editor`, click Download. The downloaded file has no styling, no template differentiation.

**Expected.** Template selection persists into the rendered PDF.

**Actual.** Template selection only affects the in-browser preview.

**Recommended fix.** Render the React template to HTML, then HTML → PDF via Puppeteer or `@react-pdf/renderer`. Persist `chosenTemplateId` on the `TailoredResume` record and pass it to the renderer.

---

## B7 — PDF text extractor cannot read compressed content streams

**Severity:** Critical
**Impact:** Most real-world PDFs (from Word, Google Docs, Canva, iWork) use FlateDecode-compressed content streams. The extractor's regex matches against the *raw uncompressed* bytes, finds nothing in the stream, and the fallback path emits noise.
**Location:** `extractTextFromPdfBuffer` `:211-240`.

**Reproduction.** Upload almost any PDF created by Word's "Save as PDF". The route returns either parsing failure or unreadable text. Compare to a TXT version of the same resume — TXT works perfectly, PDF doesn't.

**Expected.** Extract text from FlateDecode streams. Honor `ToUnicode` CMaps for fonts that encode characters as glyph IDs.

**Actual.** Loops `(text) Tj` and `[(text)] TJ` regex over the raw `latin1` body. Compressed streams contain binary that doesn't match these patterns. Fallback strips non-printable bytes and keeps lines with 3+ ASCII letters — typically zero output.

**Recommended fix.** Drop the homegrown parser. Use `pdf-parse` (which wraps pdfjs-dist) or `pdfjs-dist` directly. They handle compression, encodings, glyph maps, embedded fonts.

---

## B8 — PDF buffer read as `latin1`, corrupting UTF-8

**Severity:** High
**Impact:** Names with accented characters (José, Müller, Ng̀uyễn, Łukasz), em-dashes between dates ("2020 – Present"), curly quotes from Word, bullet glyphs (•), ASCII-art separators — all become mojibake.
**Location:** `:212`: `const raw = buffer.toString("latin1")`.

**Reproduction.** Upload a PDF whose source had any non-ASCII character. Examine extracted text — characters appear as `Ã©` (é misencoded), `â€"` (em-dash misencoded), etc.

**Expected.** Text decoded with the original encoding (UTF-8 is the modern default; pdfjs handles per-font encoding).

**Actual.** Hardcoded `latin1`.

**Recommended fix.** Same as B7 — delegate to pdfjs and trust its per-font encoding pipeline.

---

## B9 — PDF extractor has no concept of reading order

**Severity:** High
**Impact:** Two-column resumes (a very popular modern layout in Canva, Google Docs templates) get scrambled: left column line 1, then right column line 1, then left line 2, etc. — or some unpredictable order based on `Tj` operator emission order in the PDF.
**Location:** `:211-240`.

**Reproduction.** Upload a two-column resume from any modern template. Extracted text reads as random fragments.

**Expected.** Top-to-bottom, left-to-right reading order per column block.

**Actual.** Extract order = emission order in the PDF content stream.

**Recommended fix.** Use pdfjs's `getTextContent()` which exposes per-item x/y positions, then sort by column band before joining.

---

## B10 — DOCX extractor only reads `word/document.xml`

**Severity:** High
**Impact:** Content placed in headers, footers, text boxes, or sub-documents is missed. A common resume pattern puts name + contact info in a Word header — that resume comes through with no name, no email, no phone.
**Location:** `extractTextFromDocxBuffer` `:252-269`.

**Reproduction.** Open Word, create a resume with name + email in the document Header (Insert → Header). Save as DOCX. Upload. `structuredProfile.contact.fullName === ""`.

**Expected.** Aggregate text from `word/document.xml`, `word/header*.xml`, `word/footer*.xml`, `word/footnotes.xml`, `word/endnotes.xml`, and text-box nodes.

**Actual.** Only `word/document.xml`.

**Recommended fix.** Either traverse the ZIP listing for all `word/*.xml` files, or replace with `mammoth` (a maintained library that does this correctly).

---

## B11 — DOCX HTML-entity decoder only handles 5 entities

**Severity:** High
**Impact:** Resumes with em-dashes (`&mdash;`), ellipses (`&hellip;`), copyright (`&copy;`), or any numeric entity besides `&#39;` show the literal entity in extracted text.
**Location:** `:262-267`.

**Reproduction.** DOCX with the word "C'est l'été" or "Senior — Engineer". Extracted text shows `Cest l&hellip;t&eacute;` or similar.

**Expected.** Decode every HTML5 named and numeric entity.

**Actual.** Only `&amp; &lt; &gt; &quot; &#39;`.

**Recommended fix.** Use a maintained decoder (`entities` npm package, or strip via mammoth as in B10).

---

## B12 — ZIP filename decoded as UTF-8 while most ZIP creators write CP437

**Severity:** High
**Impact:** Rare in practice (DOCX zips usually use ASCII filenames in `word/document.xml`), but DOCX zips that contain non-ASCII filenames (e.g. from localized Word) would miss the target file.
**Location:** `:296`: `buffer.toString("utf8", offset + 46, offset + 46 + fileNameLength)`.

**Expected.** Inspect the general-purpose bit flag bit 11 — if set, use UTF-8; else CP437.

**Actual.** Always UTF-8.

**Recommended fix.** Check bit 11. If unset, decode as CP437. Or replace with `jszip` (handles this correctly).

---

## B13 — `fullName` extraction picks the wrong line

**Severity:** High
**Impact:** Wrong name shown in the tailored resume, in the parsed profile, in every UI display.
**Location:** `:360-367`.

**Reproduction.**
1. Resume starts with a job title line ("Senior Software Engineer — 10 years experience") above the name → that title becomes `fullName`.
2. Name line has a phone number on it ("John Smith — 555-1234") → skipped (`\d{3}` regex), name fallback finds a different line.

**Expected.** Detect the candidate's name reliably (capitalized 2-3 word phrase at top of doc, often above the email/phone block).

**Actual.** First line under 80 chars without `@`, without 3 consecutive digits, without resume keywords. Easy to mis-pick.

**Recommended fix.** Look at the line immediately above the contact block (email/phone line). Apply title-case + 2-4 word length heuristic. Validate against a "doesn't look like a job title" check.

---

## B14 — Required/preferred JD split never deactivates the collector

**Severity:** High
**Impact:** Most JD-detected skills end up in `requiredSkills`; `preferredSkills` is almost always empty. The scoring "matched required vs preferred" weight (22% vs 12%) becomes meaningless.
**Location:** `collectLinesNear` `:631-643` + `analyzeJobDescription` `:544-545`.

**Reproduction (live, confirmed).** Input:
```
Senior Software Engineer at TechCorp. Required: 5+ years Python, AWS, Docker.
[...]
Bonus: Java, MongoDB.
```
Expected: requiredSkills includes Python AWS Docker; preferredSkills includes Java MongoDB.
Actual (from `/api/tools/jd-keywords`): `requiredSkills: ["Java", "Python", "MongoDB", "AWS", "Docker"], preferredSkills: []`.

**Why.** `collectLinesNear` sets `active = true` once it sees "required", then never deactivates because the only deactivation is `isHeading(line)` — which is the *resume* heading list (summary, experience, skills, etc.), not JD section markers (responsibilities, qualifications, bonus, nice to have, what we offer, benefits).

**Recommended fix.** Maintain a JD-specific heading set: `["required","requirements","preferred","nice to have","bonus","plus","responsibilities","what you will do","qualifications","what we offer","benefits","about us"]`. Switch the collector state machine to: section starts at the matching marker, ends at the *next* JD heading.

---

## B15 — `inferExperienceLevel` defaults to Entry-level when years are unspecified

**Severity:** High
**Impact:** Senior-level JDs that don't explicitly say "5+ years" are classified as Entry-level. Affects downstream scoring and tailoring tone.
**Location:** `:607-616`.

**Reproduction.** Input JD: "Senior Software Engineer. Lead the backend team." (no number). `experienceLevel = "Entry-level (0-2y)"` because `maxYears = 0 ≤ 2`.

**Expected.** Look for seniority cues (senior, lead, principal, staff, junior, manager) **before** falling back to year count. If no cues, default to Mid-level.

**Actual.** Year-count check fires first.

**Recommended fix.** Reorder the conditions:
```ts
if (lower.includes("senior") || lower.includes("staff") || lower.includes("principal") || maxYears >= 6) return "Senior (6y+)"
if (lower.includes("junior") || lower.includes("entry level") || maxYears <= 2 && maxYears > 0) return "Entry-level (0-2y)"
return "Mid-level (3-5y)"
```

---

## B16 — `inferRoleFromTitle` falls back to "Software Engineer" for everything

**Severity:** High
**Impact:** QA, security, mobile, ML, frontend, backend, SRE, designer, PM, support — all become "Software Engineer" unless the JD title contains a specific keyword in the small fallback list.
**Location:** `:580-590`.

**Reproduction.** JD title "Senior iOS Engineer" → roleCategory = "Software Engineer" (no "ios" check).

**Expected.** Either return "Unknown" or look at a richer taxonomy.

**Actual.** Hard-coded ladder: java → "Java Developer", data engineer, data analyst, business analyst, qa, devops, product, else "Software Engineer".

**Recommended fix.** Extend the keyword list materially, or replace with a learned classifier. At minimum: iOS, Android, Mobile, Frontend, Backend, Fullstack, SRE, Security, ML, Data Scientist, Designer, Project Manager.

---

## B17 — Skills appear in `requiredSkills` even when JD says "must NOT have"

**Severity:** High
**Impact:** Engine recommends adding skills the JD explicitly disqualifies. Tailoring would push the user toward emphasizing a disqualifier.
**Location:** `analyzeJobDescription` `:540-572`.

**Reproduction (live, confirmed).** Input JD: "We do NOT want anyone who has only worked with PHP. Must NOT have used MongoDB in production." → MongoDB in requiredSkills.

**Expected.** Skill detection respects negation context.

**Actual.** Substring match, no negation handling. Same root cause as B1.

**Recommended fix.** Apply the negation-window check from B1 to the JD-side keyword detection as well.

---

## B18 — `percentage(0, 0)` returns 85, inflating empty categories

**Severity:** High
**Impact:** `scoreResumeAgainstJob` breakdown values are wrong by design for any JD that has zero of a category. Specifically `preferredSkillsMatch`, `keywordCoverage`, `sectionCompleteness` all default to 85 when total = 0.
**Location:** `:164-167`.

**Reproduction (live).** JD with no preferred skills detected (very common because of B14) → `preferredSkillsMatch: 85`. Resume scores higher than it should by 12% × 85 = ~10 raw points.

**Expected.** Either omit the category from the breakdown or return 0 (no claim).

**Actual.** `return 85` literal.

**Recommended fix.**
```ts
function percentage(matched: number, total: number) {
  if (total === 0) return null  // omit category from final weighted average
  return clampScore((matched / total) * 100)
}
```
And in `scoreResumeAgainstJob`, only count categories whose `percentage` is non-null.

---

## B19 — `countOccurrences` does substring count without word boundaries

**Severity:** High
**Impact:** `buildKeywordCoverage` uses `countOccurrences` to decide `found_and_used` vs `found_but_weak` vs `missing`. Substring matches inside longer words inflate counts. "Java" counts inside "JavaScript" and "Javadoc". "Go" counts inside "Google", "going", "good". "C" counts inside thousands of words.
**Location:** `:765-770`.

**Reproduction.** Resume contains "JavaScript and Google Cloud" → `countOccurrences(resume, "Java")` returns 1 (Java inside JavaScript), `countOccurrences(resume, "Go")` returns 2 (Google + Go could match).

**Expected.** Word-boundary match, same regex pattern `includesTerm` uses.

**Actual.** `normalizedText.split(normalizedKeyword).length - 1` — substring.

**Recommended fix.**
```ts
function countOccurrences(text: string, keyword: string) {
  const re = new RegExp(`(^|\\s)${escapeRegExp(canonical(keyword))}($|\\s)`, "gi")
  const matches = canonical(text).match(re)
  return matches?.length ?? 0
}
```

---

## B20 — `experienceRelevance` is binary because of B2

**Severity:** High
**Impact:** Twelve percent of the total score is essentially a 78-or-45 coin flip based on whether the parser detected any work experience block.
**Location:** `:693`.

**Reproduction.** Two resumes: one with 10 years across 5 jobs, one with a 6-month internship — both score `78` for experienceRelevance because both have `parseExperience(text).length >= 1`.

**Expected.** Score scales with detected years, role-level match (junior vs senior matching JD level), and overlap of detected roles with target.

**Actual.** `profile.workExperience.length > 0 ? 78 : 45`.

**Recommended fix.** After fixing B2 (multi-job parsing), compute: years total, max-job duration, alignment to JD experienceLevel. Weight accordingly.

---

## B21 — `formattingCompleteness` doesn't measure formatting

**Severity:** High
**Impact:** A separate 5% weight that pretends to measure ATS-friendliness but is just a derivative of section presence.
**Location:** `:687`.

**Reproduction.** Two resumes with the same summary/skills/experience/education sections — one in a tidy two-column Canva layout, one in a clean ATS-friendly single-column — score identically.

**Expected.** Detect tables, multi-column, image-heavy layouts (extracted via PDF parser metadata), font count, unusual section ordering.

**Actual.** `clampScore(65 + sectionSignals * 8 + Math.min(profile.workExperience.length, 2) * 5)` — completely independent of formatting.

**Recommended fix.** After the parser is upgraded (B7-B12), surface formatting signals (column count, table presence, font diversity) and score from them.

---

## B22 — `reorderAndTuneExperience` keyword-stuffs every bullet with the same suffix

**Severity:** High
**Impact:** Tailored resume bullets read like spam: every bullet ends with the same `", with emphasis on Docker."` (or whichever skill was missing). Recruiters notice immediately.
**Location:** `:894-929`.

**Reproduction.** Master resume has bullets that don't mention "Docker", JD requires Docker, no other matched-required skill is missing. Every bullet (up to 8) gets the same suffix.

**Expected.** Either rewrite the bullet semantically (real NLP — not present here), or surface the gap as coaching and leave the bullet alone.

**Actual.** Mechanical suffix append to every bullet that doesn't contain the keyword.

**Recommended fix.** Don't auto-rewrite bullets. Generate a coaching list: "Your experience doesn't mention Docker, which the JD requires. Consider adding a bullet about XYZ project where you used Docker." Leave the bullet text untouched.

---

## B23 — `buildTailoredSummary` writes assertive marketing copy

**Severity:** High
**Impact:** The tailored summary always starts with "X candidate with demonstrated experience in A, B, C." — a forward-looking marketing claim, even when the original resume made no such claim. Combined with the template suffix "Focused on clear, ATS-friendly communication and role-relevant impact" — this is fabricated assertion territory.
**Location:** `:881-892`.

**Reproduction.** Master resume summary: "Backend developer interested in distributed systems." JD: Python, AWS. Generated summary: "Senior Software Engineer candidate with demonstrated experience in Python, AWS. Backend developer interested in distributed systems. Focused on clear, ATS-friendly communication and role-relevant impact."

**Expected.** Either echo the user's existing summary or generate a neutral one-sentence rephrase. Stop emitting "demonstrated experience".

**Actual.** Hard-coded sentence skeleton.

**Recommended fix.** Replace with one of: (a) leave the user's summary alone, (b) emit a neutral rephrase using existing words only, (c) actual LLM-based summarization with anti-hallucination guard. Drop the "demonstrated" word.

---

## B24 — `addSkillToProfile` defaults unknown skills to `tools`

**Severity:** High
**Impact:** User-confirmed skills outside `SKILL_CATALOG` get dumped into `tools` regardless of nature. DBT lands in tools. Datadog lands in tools. Pulumi lands in tools. Categorization in the final resume is wrong.
**Location:** `:872-879`.

**Reproduction.** Pass `confirmedSkills: ["DBT", "Pulumi"]` to `POST /api/tailored-resumes`. Both appear under "Tools" in the rendered output.

**Expected.** A best-effort categorization or a new "Other" section.

**Actual.** Fallback to `"tools"`.

**Recommended fix.** Expand SKILL_CATALOG (see B30) or add a small classifier for unknown skills.

---

## B25 — `buildSalaryEstimate` uses string.includes for year-band detection

**Severity:** High
**Impact:** Salary numbers are unreliable. "13 years experience" matches "3" band → understates by ~$30k. "16 years" matches "6" band → understates by ~$15k. "10 years" works correctly.
**Location:** `:1111-1112`.

**Reproduction.**
```bash
# Same role, location, skills — different yearsExperience string:
curl -X POST .../api/tools/salary-estimate -d '{"yearsExperience":"10 years","role":"Software Engineer","location":"Seattle"}'   # → median ~$182k
curl -X POST .../api/tools/salary-estimate -d '{"yearsExperience":"13 years","role":"Software Engineer","location":"Seattle"}'   # → median ~$152k
curl -X POST .../api/tools/salary-estimate -d '{"yearsExperience":"16 years","role":"Software Engineer","location":"Seattle"}'   # → median ~$167k
```
The numbers should rise monotonically with experience but they zigzag.

**Expected.** Parse the years as a number then map to a band.

**Actual.** `input.yearsExperience.includes("10") ? 42000 : input.yearsExperience.includes("6") ? 27000 : input.yearsExperience.includes("3") ? 12000 : 0`.

**Recommended fix.**
```ts
const years = Number(input.yearsExperience.match(/\d+/)?.[0] ?? 0)
const experienceBoost = years >= 10 ? 42000 : years >= 6 ? 27000 : years >= 3 ? 12000 : 0
```

---

## B26 — Phone regex is US-only

**Severity:** Medium
**Impact:** International candidates (UK +44, India +91, EU formats) get `phone = ""` in their parsed profile.
**Location:** `:354`.

**Recommended fix.** Use a library like `libphonenumber-js` or expand the regex to cover at least E.164 (`\+\d{1,3}[ -]?(\d{2,4}[ -]?){2,4}\d{2,4}`).

---

## B27 — Portfolio URL regex matches almost anything with a dot

**Severity:** Medium
**Impact:** False positives populate `contact.portfolio`. E.g., resume mentions "Python 3.11" → portfolio = "3.11" (well, doesn't match because no `[a-z]{2,}` TLD, but "version.4.2" or "file.txt" or unrelated tokens that satisfy `[a-z0-9-]+\.[a-z]{2,}` would).
**Location:** `:357`.

**Recommended fix.** Restrict to URLs starting with `http(s)://` or `www.` or known TLDs. Or take only the first link.matches() that doesn't look like an email domain.

---

## B28 — `currentRole` flag set globally if any "present" anywhere in section

**Severity:** Medium
**Impact:** If any old job had "Present" in its description (e.g., "Present-day patterns of distributed systems") all jobs get marked `currentRole: true`.
**Location:** `:464`.

**Recommended fix.** Move the check inside the per-job parser (after B2 fix).

---

## B29 — `parseExperience` caps bullets at 8

**Severity:** Medium
**Impact:** Detailed senior resumes (lots of accomplishments) lose bullets 9+.
**Location:** `:447`.

**Recommended fix.** Cap per job at ~6, not globally. Or remove the cap and rely on the renderer to truncate at display time.

---

## B30 — Skill catalog is ~90 entries; modern dev skills missing

**Severity:** Medium
**Impact:** Resumes mentioning Rust, Bun, Astro, Polars, DBT, Snowflake, Pulumi, Kafka Streams, Vite, Solid, Svelte, Tauri, Zig, Deno are invisible in skills detection.
**Location:** `:24-100` (`SKILL_CATALOG`).

**Recommended fix.** Expand to top 500 mentions from a job-board mine. Or accept any token following a "Skills:" line as a skill (less precise but no skill goes missing).

---

## B31 — Tailored summary suffix is generic boilerplate

**Severity:** Medium
**Impact:** Every tailored resume's summary ends with the same sentence. Recruiters seeing several tailored resumes from this app see an identifier-pattern.
**Location:** `:888`.

**Recommended fix.** Drop the suffix; let the user's voice carry through.

---

## B32 — `jobTitleRelevance` is binary

**Severity:** Medium
**Impact:** 12% of score weight on a 55-vs-85 binary. No partial credit for related titles ("Senior Backend Engineer" vs "Software Engineer").
**Location:** `:688-692`.

**Recommended fix.** Tokenize both titles, compute Jaccard similarity, multiply through.

---

## B33 — Scanned/image PDFs throw a generic error

**Severity:** Medium
**Impact:** Many users have a PDF from a scanned resume; they see a generic "Parsing failed. The PDF may be scanned or image-only." with no path forward.
**Location:** `:191-193`.

**Recommended fix.** Either OCR (tesseract.js or vision API) or offer a "paste as text" alternative more prominently.

---

## B34 — `buildAtsScore` formatting heuristic is the pipe-character count

**Severity:** Medium
**Impact:** The only "formatting" assessment is pipe-character penalty. Doesn't reflect ATS reality at all.
**Location:** `:1006`.

**Recommended fix.** After parser upgrade, score on: table-detected (penalty), column-count > 1 (penalty), unusual section names (penalty), bullet character variety (small penalty).

---

## B35 — `buildKeywordScan` `missing` list always includes REST APIs, Git, Agile, Cloud

**Severity:** Medium
**Impact:** Marketers, designers, sales-engineers, data-scientists all get told they're missing "Git" — irrelevant for their roles.
**Location:** `:1093`.

**Recommended fix.** Make the always-include list role-conditional.

---

## B36 — `keywordCoverage` is computed from the master resume, not the tailored version

**Severity:** Medium
**Impact:** The coverage shown to the user lists "needs_confirmation" and "not_recommended" against the *original* resume, so if the user confirmed skills during tailoring, the coverage doesn't reflect the confirmed-and-added state.
**Location:** `generateTailoredResume` `:779`, `:851`.

**Recommended fix.** Recompute coverage against the rendered tailored text after confirmed additions, store both.

---

## B37 — Score "lift" is self-fulfilling

**Severity:** Medium
**Impact:** Tailored resume includes the magic `", with emphasis on <skill>."` suffix on bullets. Scoring then finds the skills it just inserted, computes a higher score, and reports "improved from 62% to 86%" — but the lift comes from the engine writing the keywords, not from a real change in fit.
**Location:** `generateTailoredResume` `:854`.

**Recommended fix.** Either (a) drop the auto-rewrite (B22) so the lift reflects real changes, or (b) display the lift only on confirmed-skill additions, separating "from your real experience" lift from "from added keywords" lift.

---

## B38 — PDF lacks `/Info` dictionary

**Severity:** Low
**Impact:** ATS systems that index PDF metadata (Title, Author, CreationDate, Subject) get nothing. Lever, Greenhouse, Workday all inspect this.
**Location:** `:1259-1263`.

**Recommended fix.** Add an `/Info` object with Title (candidate name), Author (candidate name), Creator ("HireTuner"), CreationDate (`D:YYYYMMDDHHMMSS+00'00'`).

---

## B39 — PDF font has no `/Encoding`

**Severity:** Low
**Impact:** Some accented characters in the WinAnsi range may still render wrong without an explicit `/Encoding /WinAnsiEncoding` declaration.
**Location:** `:1257`.

**Recommended fix.** Replace with `4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >> endobj`.

---

## B40 — `wrapLine` wraps by character count, not font width

**Severity:** Low
**Impact:** Lines look uneven; long-word lines wrap slightly oddly.
**Location:** `:1284-1300`.

**Recommended fix.** Use a font-metric-aware line breaker (`pdfkit`'s `widthOfString`).

---

## B41 — `escapePdfString` doesn't escape `\r` / `\n`

**Severity:** Low
**Impact:** Currently dormant because `normalizeText` strips them, but a regression in `normalizeText` would corrupt the PDF.
**Location:** `:1303`.

**Recommended fix.** Belt-and-suspenders: also escape `\r` → `\\r`, `\n` → `\\n`.

---

## B42 — `extractResponsibilities` requires verb-prefix lines

**Severity:** Low
**Impact:** JDs written in noun form ("Responsibilities: ownership of system reliability") produce empty responsibilities array, which collapses `responsibilityMatch` to the default `percentage(0,0)=85` (see B18).
**Location:** `:646-657`.

**Recommended fix.** Also include lines under "Responsibilities" / "What you will do" header regardless of verb prefix.

---

## B43 — Tailored-resume quota is incremented after work is done

**Severity:** Low
**Impact:** Combined with the JSON store race condition (security audit H1/H2), a paid user can fire concurrent tailoring requests, all of which pass the cap check before any has incremented usage.
**Location:** `src/app/api/tailored-resumes/route.ts` (`incrementUsage` called after the result is built).

**Recommended fix.** Pre-decrement the cap inside the same `updateDatabase` call as the work; refund on error.

---

## Appendix — code areas inspected and found correct

| Area | Status |
|---|---|
| Word-boundary regex in `includesTerm` | ✅ correct |
| Determinism (same input → same output) | ✅ confirmed live |
| `unique()` dedup + canonical key | ✅ correct |
| `clampScore` clipping to 0-100 | ✅ correct |
| `escapeRegExp` for needle injection safety | ✅ correct |
| `addSkillToProfile` doesn't duplicate skills | ✅ correct |
| TXT upload happy path | ✅ correct |
| `extractSection` heading match (resume side) | ✅ correct (the bug is using resume-style headings on JD content — see B14) |

End of bug list.
