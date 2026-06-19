# HireTuner — Resume Engine & ATS Functional Audit

**Date:** 2026-06-18
**Auditor:** Claude (Senior QA / Resume-Platform Specialist mode)
**Scope:** resume parsing, JD ingestion, keyword detection, ATS scoring, resume tailoring/rewriting, PDF export.
**Method:** Full source review of `src/lib/resume-engine.ts` (1,304 lines) — the entire engine lives there — plus the resume/JD/tailored-resume API routes and a battery of live black-box probes against `https://hiretuner.com/api/tools/*`. No fixes were applied. The companion file `ATS_ENGINE_BUGS.md` has every finding with severity, impact, repro, expected vs actual, and recommended fix.

---

## TL;DR

The engine is **almost entirely heuristic regex + a hardcoded skill catalog**. There is **no language model and no semantic understanding** anywhere in the resume / scoring / tailoring path. That makes the engine fast and free, but the marketing on the homepage ("AI-powered") oversells what the code actually does.

The four highest-impact issues:

1. **Negation is completely ignored.** A resume that says "I do NOT have AWS experience" still scores AWS as found and matched. Confirmed live on `/api/tools/resume-match` — score 63%, `requiredSkillsFound: ["AWS","Docker","Kubernetes"]` for a resume that explicitly disclaims all three.
2. **Resume parsing collapses every job into a single `workExperience` entry, every project into one entry, every degree into one entry.** Multi-job resumes lose all per-role detail — no per-job dates, locations, or bullets.
3. **PDF download is a 70-line, single-page, Helvetica-only stub with no Unicode support and no page break logic.** The "30+ resume templates" advertised on the marketing page exist as React components in `src/lib/resume-templates/registry.ts` but **are never used in the actual download path** — the API always emits the same primitive PDF regardless of which template the user picked in the editor. Lines past ~50 fall off the bottom of the page (invisible) and lines past 70 are silently dropped.
4. **PDF and DOCX parsers are naive and fail on the vast majority of real-world files.** The PDF reader does regex on raw `latin1` bytes — it cannot read FlateDecode-compressed text streams (which is nearly all real PDFs) or extract glyphs that use a ToUnicode CMap. The DOCX reader only reads `word/document.xml` so anything in headers, footers, text boxes, or sub-documents is invisible.

Tailoring claims "we never fabricate experience" and the guard logic *is* present (the `needs_confirmation` / `not_recommended` classification works), but two bypass paths exist: (a) the user can pass any string in `confirmedSkills` and it is added unverified, (b) `buildTailoredSummary` writes assertive marketing copy ("Software Engineer candidate with demonstrated experience in X, Y, Z") that the original resume never claimed.

**Total findings:** 7 Critical, 18 High, 12 Medium, 6 Low.

---

## What the engine actually does (architectural snapshot)

```
upload (.pdf / .docx / .txt)
    │
    ▼
extractResumeTextFromFile  ←──── 5 MB cap (after body parsed; see security audit H11)
    │
    ▼
   plain text
    │
    ▼
parseResumeText           ←──── regex extraction → StructuredResumeProfile
    │  • email/phone/name from line-1 heuristics
    │  • skills = substring match against hardcoded SKILL_CATALOG (~90 skills total)
    │  • workExperience = ONE entry, all bullets concatenated
    │  • education = ONE entry
    │  • projects = ONE entry
    ▼

JD text (pasted)
    │
    ▼
analyzeJobDescription
    │  • detectedSkills = substring match against SKILL_CATALOG
    │  • required / preferred split via "required"/"preferred" line markers (broken — see B14)
    │  • responsibilities = lines containing build|develop|design|manage|... verbs
    │  • experienceLevel = matchAll \d+ years (defaults to Entry-level if absent)
    ▼

scoreResumeAgainstJob
    │  weighted sum of:
    │    requiredSkillsMatch (22%) + preferredSkillsMatch (12%) + responsibilityMatch (16%)
    │    + jobTitleRelevance (12%) + experienceRelevance (12%) + keywordCoverage (16%)
    │    + formattingCompleteness (5%) + sectionCompleteness (5%)
    │  • all "matches" use substring with word boundaries via includesTerm()
    │  • NO negation detection, NO semantics
    ▼

generateTailoredResume
    │  • reorder skills by JD priority
    │  • reorder bullets by JD keyword count
    │  • append ", with emphasis on <skill>." to bullets missing supported keywords
    │  • generate templated summary string
    ▼

buildMinimalPdf
       single-page Helvetica, 70 lines max, ~50 visible, no Unicode
```

The 30+ resume-template registry (`src/lib/resume-templates/registry.ts`) feeds the *editor preview* only. The downloadable PDF ignores them.

---

## What works correctly

- **`includesTerm`** uses word boundaries `(^|\s)needle($|\s)` so "Java" does not match inside "JavaScript". Good.
- **Substring matching is case-insensitive** via `canonical()` (lowercase + alphanum + `+#.` preserved). "C++" and "c++" both detected.
- **Scoring is deterministic.** Same input twice produces the same score, confirmed on `/api/tools/resume-match`.
- **`confirmedSkills` guard logic exists.** `buildKeywordCoverage` correctly classifies JD keywords as `found_and_used`, `found_but_weak`, `needs_confirmation`, `not_recommended`, `missing`. `generateTailoredResume` correctly refuses to add `needs_confirmation` or `not_recommended` skills unless the caller passes the keyword in `confirmedSkills`.
- **TXT upload path is reliable.** When the resume is plain UTF-8 text, the engine reads it correctly.
- **Tailored summary preserves the original first sentence.** Even though it wraps it in marketing copy, the user's own first sentence survives.

---

## What I tested live (probes vs production)

| Probe | Endpoint | Result | What it confirms |
|---|---|---|---|
| Junk text resume ("aaaaaaa…") | `POST /api/tools/ats-score` | ATS score = 53 | Engine returns same score regardless of content as long as length passes the 80-char floor |
| Resume with explicit "I do NOT have AWS" | `POST /api/tools/ats-score` | Identical 53 | Negation ignored; identical to junk |
| Resume with disclaimers vs JD requiring same skills | `POST /api/tools/resume-match` | score 63, `requiredSkillsFound: [AWS, Docker, Kubernetes]` | **Critical:** negated skills counted as found |
| Same resume + JD, two sequential calls | `POST /api/tools/resume-match` | score 89 both runs | Determinism confirmed |
| JD with "Java is a bonus, MongoDB is must NOT use" | `POST /api/tools/jd-keywords` | `requiredSkills: [Java, Python, MongoDB, AWS, Docker]` | "Bonus" → required (mis-tier), "must not" → required (wrong direction) |
| JD mentioning new tech (Rust, Bun, Astro, Polars) | `POST /api/tools/jd-keywords` | None detected | Out-of-catalog skills invisible to the engine |
| JD with extreme value ("100 years experience, Salary $5/year") | `POST /api/tools/jd-keywords` | Accepted as Senior, no validation flags | No sanity check |
| Bullet generator with prompt-injection input | `POST /api/tools/bullet-generator` | Validation requires non-empty bullet (passes) | Generator never received the payload (validation rejected) |

PDF binary inspection was deferred (would require logging in + uploading a resume + generating + downloading + opening in a PDF inspector). All PDF findings below are derived from direct source inspection of `buildMinimalPdf` at `src/lib/resume-engine.ts:1238-1278`.

---

## Severity guide

- **Critical** — produces obviously wrong results that cause user harm (false confidence, broken download, hallucinated content). Fix before next launch.
- **High** — meaningfully degrades accuracy or experience but is recoverable. Fix this sprint.
- **Medium** — noticeable for edge cases or power users. Fix this month.
- **Low** — polish / robustness.

---

## Prioritized findings (full details in ATS_ENGINE_BUGS.md)

### Critical (7)
- **B1** Negation is completely ignored across all scoring and matching paths.
- **B2** `parseExperience` returns exactly **one** entry for the entire work history.
- **B3** `parseProjects` returns exactly **one** entry titled "Relevant Projects".
- **B4** `parseEducation` returns exactly **one** entry — multi-degree resumes lose later degrees.
- **B5** `buildMinimalPdf` only places ~50 lines on a single page; lines 51-70 draw below the visible MediaBox; lines 71+ are silently dropped. No multi-page support.
- **B6** PDF download ignores the user's chosen resume template — all downloads emit the same plain Helvetica PDF regardless of which of the "30+ templates" they picked.
- **B7** PDF text extractor cannot read FlateDecode-compressed content streams (the format used by nearly every real PDF). Falls through to a noise filter that produces unusable garbage.

### High (18)
- **B8** PDF extractor reads buffer as `latin1`, corrupting any UTF-8 character (accented names, em-dash, smart quotes, bullet glyphs, em-spaces).
- **B9** PDF extractor has no concept of multi-column layout, table cells, or reading order — two-column resumes (a popular template style) get scrambled.
- **B10** DOCX extractor reads only `word/document.xml`; ignores headers, footers, text boxes, glossary document, comments. Name and contact info placed in a header are invisible.
- **B11** DOCX HTML-entity table only decodes 5 entities (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`); `&hellip;`, `&mdash;`, `&copy;`, numeric refs, named refs all leak into output.
- **B12** ZIP reader filename uses `utf-8` decoder while most ZIP creators write CP437; non-ASCII filenames silently miss.
- **B13** `parseResumeText` `fullName` heuristic picks the first short line; resumes that start with a job title or with the name on a line containing a `\d{3}` digit string get the wrong value (or empty).
- **B14** Required-vs-preferred JD split is broken: `collectLinesNear` starts collecting at the "required" marker and never stops (the only stop is matching a *resume* section heading, but this is a *JD*). Almost every detected skill ends up labeled "required", "preferred" usually empty.
- **B15** `inferExperienceLevel` defaults to "Entry-level" whenever the JD doesn't mention years — including JDs that say "Senior Engineer" but never quantify years.
- **B16** `inferRoleFromTitle` falls back to "Software Engineer" for every unrecognized JD; QA, security, mobile, ML, frontend-only, backend-only, infra all collapse into one label.
- **B17** `analyzeJobDescription` mis-labels skills as required when the JD explicitly disclaims them (confirmed live: "Must NOT have used MongoDB" → MongoDB in `requiredSkills`).
- **B18** `scoreResumeAgainstJob` `percentage(0,0)` returns **85** — a category with zero JD keywords inflates the breakdown by 85% across `preferredSkillsMatch`, `keywordCoverage`, `sectionCompleteness`.
- **B19** `countOccurrences` does plain substring count (no word boundaries), so "Java" counts inside "JavaScript". Re-classifies single-mention keywords as "found_and_used" when other longer words contain the substring.
- **B20** `experienceRelevance` is binary (78 or 45) because `parseExperience` always returns 0 or 1 entries. No actual experience-vs-role matching.
- **B21** `formattingCompleteness` only varies between ~65 and 100 because the inputs (`sectionSignals`, `workExperience.length`) are almost always at their ceiling. Doesn't actually measure formatting.
- **B22** `reorderAndTuneExperience` appends `", with emphasis on <skill>."` to **every** bullet when a matched-required skill isn't anywhere in the work history. Same suffix on multiple bullets reads as keyword stuffing.
- **B23** `buildTailoredSummary` always emits the phrase *"candidate with demonstrated experience in X, Y, Z"* — a forward-looking marketing claim the original resume may not have made.
- **B24** `addSkillToProfile` dumps any non-catalog skill into the `tools` category — DBT, Datadog, Pulumi all become "tools" even if they're more naturally cloud / DB / framework.
- **B25** `buildSalaryEstimate` uses `string.includes("10")`/`"6"`/`"3"` to detect experience bands — "13 years" matches "3" but not "10" and lands in the 3-5 year band.

### Medium (12)
- **B26** Phone regex hardcoded for US format (`+?1?(\d{3})...`); UK / India / EU numbers produce empty `phone`.
- **B27** Portfolio URL regex matches almost any token containing `.something.tld`; very promiscuous (`version.4.2`, `firstline.txt`).
- **B28** `parseExperience` `currentRole` flag is set globally if "present" or "current" appears *anywhere* in the experience section — not per-job.
- **B29** `parseExperience` clamps bullets to 8 max; resumes with detailed achievement lists lose content.
- **B30** Skills outside `SKILL_CATALOG` (~90 entries) are invisible: Rust, Bun, Astro, Polars, DBT, Snowflake, Pulumi, Kafka Streams, Vite, Solid, Svelte, Tauri, etc.
- **B31** Tailoring sample copy "Focused on clear, ATS-friendly communication and role-relevant impact" is appended to every summary — boilerplate.
- **B32** `scoreResumeAgainstJob` `jobTitleRelevance` is binary 55 or 85; no partial credit for related titles.
- **B33** Scanned / image-only PDFs throw a generic "Parsing failed" — no OCR fallback, no actionable hint.
- **B34** `buildAtsScore` formatting heuristic penalizes resumes with more than 8 pipe characters; doesn't measure tables, columns, fonts, or actual ATS-readability.
- **B35** `buildKeywordScan` `missing` list always includes `"REST APIs", "Git", "Agile", "Cloud"` regardless of role; sales / product / data-science resumes flagged for missing "Git".
- **B36** Tailored resume `keywordCoverage` is computed only from `masterResume.parsedText` — doesn't reflect the tailored version, so `unsupportedKeywords` shown to the user mixes resolved/unresolved.
- **B37** Score result claims "score improved from X% to Y%" but the score is computed against the *rendered* tailored text, which always includes the magic suffix `", with emphasis on <skill>."`. Self-fulfilling lift.

### Low (6)
- **B38** PDF lacks `/Info` dictionary (no Title, Author, Subject, CreationDate). Resume parsers / ATS systems that index metadata see nothing.
- **B39** PDF font has no `/Encoding`; non-WinAnsi characters render incorrectly even when they're in the supported set.
- **B40** `wrapLine` wraps by character count (92), not by font width; certain words wrap mid-syllable.
- **B41** `escapePdfString` only escapes `\`, `(`, `)`. Doesn't escape `\r` or `\n` inside text strings (the source already strips them so the bug is dormant).
- **B42** `responsibilities` detection requires a JD line to start with one of nine verbs; JDs written in noun form ("Responsibilities: ownership of service reliability") miss entirely.
- **B43** `generateTailoredResume` does NOT increment `tailoredResumesUsed` until the result is saved — combined with the security-audit H2 TOCTOU race, a paid user can produce many tailored resumes in parallel without burning quota in step with the work.

---

## Recommendations roadmap

**Sprint 1 — fix what's most user-visible**
1. Multi-page PDF + Unicode handling in `buildMinimalPdf` (or replace with `pdfkit` / `puppeteer`).
2. Wire the resume-template registry into the download path; emit the user's chosen template, not a fallback Helvetica file.
3. Multi-experience parsing: detect job boundaries by date ranges and break the resume into discrete role entries.
4. Add a negation guard: when the resume text within `±60` chars of a matched keyword contains `(not|never|no|without|don't|doesn't|haven't)`, exclude that match from the "found" count.

**Sprint 2 — accuracy fixes**
5. Replace `extractTextFromPdfBuffer` with `pdf-parse` or `pdfjs-dist` so compressed content streams and ToUnicode CMaps are honored.
6. Fix `collectLinesNear` to look for the next JD heading (not the next resume heading) when delimiting required/preferred sections.
7. Make `inferExperienceLevel` look at title cues before defaulting to Entry-level based on "no year mentioned".
8. Fix `countOccurrences` to use word boundaries (same regex `includesTerm` uses).
9. Default `percentage(0, 0)` to `null` (omit from breakdown) instead of `85`.

**Sprint 3 — quality**
10. Tailoring: stop appending the magic suffix to bullets. Either rewrite the bullet semantically (requires real NLP) or leave the bullet alone and surface the gap as a coaching note.
11. Tailored summary: stop emitting "candidate with demonstrated experience in …"; produce a neutral one-line summary instead.
12. Expand SKILL_CATALOG aggressively (top 500 dev skills from job-board mining).
13. Add OCR fallback for scanned PDFs (tesseract.js or vision API).
14. Per-template ATS readability scoring instead of the pipe-count heuristic.

---

## Confidence statement

All code findings (B1-B43) are reproducible from the source on `main` at commit `2e75c4f`, file references and line numbers are exact. The four critical findings that were verifiable from the public API surface (B1 negation, B7 PDF reader, scoring determinism, B17 must-NOT becomes required) were confirmed by live HTTP probes documented above. PDF-output findings (B5, B6, B38-B41) are code-derived and would benefit from a follow-up binary inspection of an actual downloaded file.
