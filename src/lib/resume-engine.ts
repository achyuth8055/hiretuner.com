import "server-only"

import { createHash } from "node:crypto"
import { inflateRawSync } from "node:zlib"
import {
  ATS_DISCLAIMER,
  SALARY_DISCLAIMER,
  SCORE_DISCLAIMER,
  type ChangeLogItem,
  type ExperienceItem,
  type JobDescriptionAnalysis,
  type KeywordCoverageItem,
  type MasterResume,
  type ResumeMatchScore,
  type SalaryEstimate,
  type ScoreBreakdown,
  type StructuredResumeProfile,
  type TailoredResumeJson,
} from "@/lib/rolefit-types"
import { createId, nowIso } from "@/lib/database"

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

const SKILL_CATALOG = {
  programmingLanguages: [
    "Java",
    "JavaScript",
    "TypeScript",
    "Python",
    "SQL",
    "C#",
    "Go",
    "Ruby",
    "PHP",
    "Kotlin",
    "Scala",
    "Swift",
    "C++",
  ],
  frameworks: [
    "Spring Boot",
    "Spring",
    "React",
    "Next.js",
    "Node.js",
    "Express",
    "Angular",
    "Vue",
    "Django",
    "Flask",
    "Laravel",
    ".NET",
  ],
  databases: [
    "PostgreSQL",
    "MySQL",
    "SQL Server",
    "MongoDB",
    "Redis",
    "Oracle",
    "DynamoDB",
    "Snowflake",
    "BigQuery",
  ],
  cloudPlatforms: ["AWS", "Azure", "Google Cloud", "GCP", "EC2", "S3", "Lambda"],
  tools: [
    "Docker",
    "Kubernetes",
    "Git",
    "GitHub Actions",
    "CI/CD",
    "Jenkins",
    "Kafka",
    "Terraform",
    "Jira",
    "Linux",
    "REST APIs",
    "GraphQL",
    "Microservices",
  ],
  businessSkills: [
    "Agile",
    "Scrum",
    "Stakeholder Management",
    "Requirements Gathering",
    "Data Analysis",
    "Process Improvement",
    "Product Strategy",
  ],
  softSkills: [
    "Collaboration",
    "Communication",
    "Leadership",
    "Mentoring",
    "Problem Solving",
    "Cross-functional",
    "Documentation",
  ],
}

const ROLE_KEYWORDS = {
  "Software Engineer": ["software engineer", "frontend", "backend", "full stack", "application"],
  "Java Developer": ["java developer", "java engineer", "spring boot", "j2ee"],
  "Data Analyst": ["data analyst", "analytics", "tableau", "power bi", "sql"],
  "Business Analyst": ["business analyst", "requirements", "stakeholder", "process"],
  "QA Engineer": ["qa engineer", "quality assurance", "test automation", "selenium"],
  "DevOps Engineer": ["devops", "kubernetes", "terraform", "ci/cd", "cloud"],
  "Data Engineer": ["data engineer", "etl", "pipeline", "snowflake", "spark"],
  "Product Manager": ["product manager", "roadmap", "product strategy", "user research"],
}

const ALL_SKILLS = Object.values(SKILL_CATALOG).flat()

function normalizeText(value: string) {
  return value
    .replace(/\u0000/g, " ")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function canonical(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").trim()
}

function includesTerm(haystack: string, needle: string) {
  const normalizedHaystack = canonical(haystack)
  const normalizedNeedle = canonical(needle)
  if (!normalizedNeedle) return false

  return new RegExp(`(^|\\s)${escapeRegExp(normalizedNeedle)}($|\\s)`, "i").test(normalizedHaystack)
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function unique(values: string[]) {
  const seen = new Set<string>()
  const result: string[] = []

  values.forEach((value) => {
    const clean = value.trim()
    const key = canonical(clean)
    if (clean && !seen.has(key)) {
      seen.add(key)
      result.push(clean)
    }
  })

  return result
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function average(values: number[]) {
  if (values.length === 0) return 0
  return values.reduce((total, value) => total + value, 0) / values.length
}

function percentage(matched: number, total: number) {
  if (total === 0) return 85
  return clampScore((matched / total) * 100)
}

export function hashInput(input: unknown) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex")
}

export async function extractResumeTextFromFile(file: File) {
  if (file.size === 0) {
    throw new Error("Empty file. Upload a PDF, DOCX, or TXT resume with readable content.")
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("File is too large. Upload a resume smaller than 5MB.")
  }

  const fileName = file.name.toLowerCase()
  const buffer = Buffer.from(await file.arrayBuffer())

  if (file.type === "text/plain" || fileName.endsWith(".txt")) {
    return normalizeText(buffer.toString("utf8"))
  }

  if (file.type === "application/pdf" || fileName.endsWith(".pdf")) {
    const text = extractTextFromPdfBuffer(buffer)
    if (!text) {
      throw new Error("Parsing failed. The PDF may be scanned or image-only.")
    }
    return text
  }

  if (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileName.endsWith(".docx")
  ) {
    const text = extractTextFromDocxBuffer(buffer)
    if (!text) {
      throw new Error("Parsing failed. The DOCX file did not contain readable document text.")
    }
    return text
  }

  throw new Error("Unsupported file type. Upload a PDF, DOCX, or TXT file.")
}

function extractTextFromPdfBuffer(buffer: Buffer) {
  const raw = buffer.toString("latin1")
  const textChunks: string[] = []
  const literalTextRegex = /\(([^()]*(?:\\.[^()]*)*)\)\s*Tj/g
  const arrayTextRegex = /\[((?:\s*\([^()]*(?:\\.[^()]*)*\)\s*)+)\]\s*TJ/g
  let match: RegExpExecArray | null

  while ((match = literalTextRegex.exec(raw))) {
    textChunks.push(unescapePdfText(match[1]))
  }

  while ((match = arrayTextRegex.exec(raw))) {
    const chunk = match[1].replace(/\(([^()]*(?:\\.[^()]*)*)\)/g, (_, value: string) => {
      return `${unescapePdfText(value)} `
    })
    textChunks.push(chunk)
  }

  if (textChunks.length > 0) {
    return normalizeText(textChunks.join(" "))
  }

  const fallback = raw
    .replace(/[^ -~\n\r\t]/g, " ")
    .split("\n")
    .filter((line) => /[A-Za-z]{3,}/.test(line))
    .join("\n")

  return normalizeText(fallback)
}

function unescapePdfText(value: string) {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\\t/g, " ")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
}

function extractTextFromDocxBuffer(buffer: Buffer) {
  const documentXml = readZipFile(buffer, "word/document.xml")
  if (!documentXml) return ""

  return normalizeText(
    documentXml
      .toString("utf8")
      .replace(/<w:tab\/>/g, " ")
      .replace(/<\/w:p>/g, "\n")
      .replace(/<\/w:tr>/g, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
  )
}

function readZipFile(buffer: Buffer, targetPath: string) {
  const eocdSignature = 0x06054b50
  let eocdOffset = -1

  for (let index = buffer.length - 22; index >= 0; index -= 1) {
    if (buffer.readUInt32LE(index) === eocdSignature) {
      eocdOffset = index
      break
    }
  }

  if (eocdOffset === -1) return null

  const centralDirectorySize = buffer.readUInt32LE(eocdOffset + 12)
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16)
  let offset = centralDirectoryOffset
  const end = centralDirectoryOffset + centralDirectorySize

  while (offset < end && buffer.readUInt32LE(offset) === 0x02014b50) {
    const compressionMethod = buffer.readUInt16LE(offset + 10)
    const compressedSize = buffer.readUInt32LE(offset + 20)
    const fileNameLength = buffer.readUInt16LE(offset + 28)
    const extraLength = buffer.readUInt16LE(offset + 30)
    const commentLength = buffer.readUInt16LE(offset + 32)
    const localHeaderOffset = buffer.readUInt32LE(offset + 42)
    const fileName = buffer.toString("utf8", offset + 46, offset + 46 + fileNameLength)

    if (fileName === targetPath) {
      const localFileNameLength = buffer.readUInt16LE(localHeaderOffset + 26)
      const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28)
      const dataOffset = localHeaderOffset + 30 + localFileNameLength + localExtraLength
      const compressed = buffer.subarray(dataOffset, dataOffset + compressedSize)

      if (compressionMethod === 0) return compressed
      if (compressionMethod === 8) return inflateRawSync(compressed)
      return null
    }

    offset += 46 + fileNameLength + extraLength + commentLength
  }

  return null
}

export function emptyStructuredProfile(): StructuredResumeProfile {
  return {
    contact: {
      fullName: "",
      email: "",
      phone: "",
      location: "",
      linkedIn: "",
      github: "",
      portfolio: "",
    },
    summary: "",
    skills: {
      programmingLanguages: [],
      frameworks: [],
      databases: [],
      cloudPlatforms: [],
      tools: [],
      businessSkills: [],
      softSkills: [],
    },
    workExperience: [],
    projects: [],
    education: [],
    certifications: [],
    links: [],
  }
}

export function parseResumeText(parsedText: string): StructuredResumeProfile {
  const text = normalizeText(parsedText)
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
  const profile = emptyStructuredProfile()

  profile.contact.email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? ""
  profile.contact.phone =
    text.match(/(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}/)?.[0] ?? ""
  profile.contact.linkedIn = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s)]+/i)?.[0] ?? ""
  profile.contact.github = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[^\s)]+/i)?.[0] ?? ""
  profile.contact.portfolio =
    text.match(/(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+\.[a-z]{2,}(?:\/[^\s)]*)?/i)?.[0] ?? ""

  const firstNameLine = lines.find(
    (line) =>
      line.length <= 80 &&
      !line.includes("@") &&
      !/\d{3}/.test(line) &&
      !/resume|summary|experience|skills/i.test(line)
  )
  profile.contact.fullName = firstNameLine ?? ""

  profile.summary = extractSection(text, ["summary", "profile", "professional summary"])
    .split("\n")
    .filter((line) => !isHeading(line))
    .slice(0, 4)
    .join(" ")
    .trim()

  Object.entries(SKILL_CATALOG).forEach(([category, skills]) => {
    profile.skills[category as keyof StructuredResumeProfile["skills"]] = skills.filter((skill) =>
      includesTerm(text, skill)
    )
  })

  profile.links = unique(
    text.match(/(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+\.[a-z]{2,}(?:\/[^\s)]*)?/gi) ?? []
  )

  profile.workExperience = parseExperience(text)
  profile.projects = parseProjects(text)
  profile.education = parseEducation(text)
  profile.certifications = parseCertifications(text)

  if (!profile.summary) {
    const fallback = lines
      .filter((line) => line.length > 40 && !line.includes("@"))
      .slice(0, 2)
      .join(" ")
    profile.summary = fallback.slice(0, 500)
  }

  return profile
}

function extractSection(text: string, headings: string[]) {
  const lines = text.split("\n")
  const startIndex = lines.findIndex((line) =>
    headings.some((heading) => canonical(line) === canonical(heading))
  )

  if (startIndex === -1) return ""

  const sectionLines: string[] = []

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    if (isHeading(lines[index])) break
    sectionLines.push(lines[index])
  }

  return normalizeText(sectionLines.join("\n"))
}

function isHeading(line: string) {
  const clean = canonical(line)
  return [
    "summary",
    "professional summary",
    "experience",
    "work experience",
    "professional experience",
    "skills",
    "technical skills",
    "projects",
    "education",
    "certifications",
    "links",
  ].includes(clean)
}

function parseExperience(text: string): ExperienceItem[] {
  const experienceSection =
    extractSection(text, ["experience", "work experience", "professional experience"]) || text
  const lines = experienceSection
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
  const bullets = lines
    .filter((line) => /^[-*•]/.test(line) || /\b(developed|built|led|managed|created|implemented|improved|designed)\b/i.test(line))
    .map((line) => line.replace(/^[-*•]\s*/, ""))
    .slice(0, 8)

  const titleLine =
    lines.find((line) =>
      /\b(engineer|developer|analyst|manager|consultant|specialist|architect|intern)\b/i.test(line)
    ) ?? "Experience"

  if (bullets.length === 0) return []

  return [
    {
      id: createId(),
      jobTitle: titleLine.split(/\s[-|–]\s/)[0] || titleLine,
      company: titleLine.split(/\s[-|–]\s/)[1] || "",
      location: "",
      startDate: "",
      endDate: "",
      currentRole: /present|current/i.test(experienceSection),
      bullets,
    },
  ]
}

function parseProjects(text: string) {
  const section = extractSection(text, ["projects"])
  if (!section) return []

  const bullets = section
    .split("\n")
    .map((line) => line.trim().replace(/^[-*•]\s*/, ""))
    .filter((line) => line.length > 20)
    .slice(0, 5)

  if (bullets.length === 0) return []

  return [
    {
      id: createId(),
      name: "Relevant Projects",
      description: bullets[0] ?? "",
      technologies: ALL_SKILLS.filter((skill) => includesTerm(section, skill)).slice(0, 8),
      bullets: bullets.slice(1),
    },
  ]
}

function parseEducation(text: string) {
  const section = extractSection(text, ["education"])
  if (!section) return []

  const lines = section
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) return []

  return [
    {
      id: createId(),
      school: lines.find((line) => /university|college|institute|school/i.test(line)) ?? lines[0],
      degree: lines.find((line) => /bachelor|master|associate|phd|degree|science|arts/i.test(line)) ?? "",
      location: "",
      graduationDate: lines.find((line) => /\b(19|20)\d{2}\b/.test(line)) ?? "",
    },
  ]
}

function parseCertifications(text: string) {
  const section = extractSection(text, ["certifications", "certification"])
  if (!section) return []

  return section
    .split("\n")
    .map((line) => line.trim().replace(/^[-*•]\s*/, ""))
    .filter((line) => line.length > 3)
    .slice(0, 6)
    .map((line) => ({
      id: createId(),
      name: line,
      issuer: "",
      date: line.match(/\b(19|20)\d{2}\b/)?.[0] ?? "",
    }))
}

export function analyzeJobDescription(input: {
  rawText: string
  jobTitle?: string
  companyName?: string
  jobUrl?: string
}): JobDescriptionAnalysis {
  const text = normalizeText(input.rawText)
  const lower = text.toLowerCase()
  const detectedSkills = ALL_SKILLS.filter((skill) => includesTerm(text, skill))
  const roleCategory =
    Object.entries(ROLE_KEYWORDS).find(([, terms]) => terms.some((term) => lower.includes(term)))?.[0] ??
    inferRoleFromTitle(input.jobTitle || text)
  const requiredSection = collectLinesNear(text, ["required", "requirements", "must have", "minimum"])
  const preferredSection = collectLinesNear(text, ["preferred", "nice to have", "bonus", "plus"])
  const requiredSkills = unique(
    detectedSkills.filter((skill) => includesTerm(requiredSection || text.slice(0, Math.ceil(text.length * 0.7)), skill))
  )
  const preferredSkills = unique(
    detectedSkills.filter((skill) => includesTerm(preferredSection, skill) && !requiredSkills.includes(skill))
  )
  const remainingSkills = detectedSkills.filter(
    (skill) => !requiredSkills.includes(skill) && !preferredSkills.includes(skill)
  )
  const responsibilities = extractResponsibilities(text)

  return {
    jobTitle: input.jobTitle?.trim() || inferTitleFromText(text) || roleCategory,
    companyName: input.companyName?.trim() || inferCompanyFromText(text),
    roleCategory,
    experienceLevel: inferExperienceLevel(text),
    requiredSkills: requiredSkills.length > 0 ? requiredSkills : remainingSkills.slice(0, 6),
    preferredSkills:
      preferredSkills.length > 0
        ? preferredSkills
        : remainingSkills.slice(requiredSkills.length > 0 ? 0 : 6, requiredSkills.length > 0 ? 6 : 10),
    responsibilities,
    toolsAndTechnologies: unique(
      detectedSkills.filter((skill) => SKILL_CATALOG.tools.includes(skill) || SKILL_CATALOG.cloudPlatforms.includes(skill))
    ),
    softSkills: unique(SKILL_CATALOG.softSkills.filter((skill) => includesTerm(text, skill))),
    importantKeywords: unique([...detectedSkills, ...responsibilities.flatMap((item) => importantWords(item))]).slice(0, 20),
    seniorityIndicators: unique(text.match(/\b(senior|lead|principal|staff|junior|entry level|mid-level|manager)\b/gi) ?? []),
    workMode: inferWorkMode(text),
    location: inferLocation(text),
    salaryMentioned: text.match(/\$[0-9,]+(?:\s*[-–]\s*\$?[0-9,]+)?/)?.[0] ?? "",
  }
}

function inferRoleFromTitle(value: string) {
  const lower = value.toLowerCase()
  if (lower.includes("java")) return "Java Developer"
  if (lower.includes("data engineer")) return "Data Engineer"
  if (lower.includes("data analyst")) return "Data Analyst"
  if (lower.includes("business analyst")) return "Business Analyst"
  if (lower.includes("qa")) return "QA Engineer"
  if (lower.includes("devops")) return "DevOps Engineer"
  if (lower.includes("product")) return "Product Manager"
  return "Software Engineer"
}

function inferTitleFromText(text: string) {
  const match = text.match(
    /\b(?:job title|title|role)\s*[:\-]\s*([A-Za-z0-9 +/#.&,-]{3,80})/i
  )
  return match?.[1]?.split("\n")[0]?.trim() ?? ""
}

function inferCompanyFromText(text: string) {
  const explicit = text.match(/\b(?:company|employer)\s*[:\-]\s*([A-Za-z0-9 .,&-]{2,80})/i)
  if (explicit?.[1]) return explicit[1].split("\n")[0].trim()

  const atCompany = text.match(/\bat\s+([A-Z][A-Za-z0-9 .,&-]{2,40})\b/)
  return atCompany?.[1]?.trim() ?? ""
}

function inferExperienceLevel(text: string) {
  const years = [...text.matchAll(/(\d+)\+?\s*(?:years|yrs)/gi)].map((match) => Number(match[1]))
  const maxYears = years.length > 0 ? Math.max(...years) : 0
  const lower = text.toLowerCase()

  if (lower.includes("entry level") || lower.includes("junior") || maxYears <= 2) return "Entry-level (0-2y)"
  if (lower.includes("senior") || maxYears >= 6) return "Senior (6y+)"
  if (lower.includes("lead") || lower.includes("principal") || lower.includes("staff")) return "Senior (6y+)"
  return "Mid-level (3-5y)"
}

function inferWorkMode(text: string) {
  const lower = text.toLowerCase()
  if (lower.includes("remote")) return lower.includes("hybrid") ? "Remote / Hybrid" : "Remote"
  if (lower.includes("hybrid")) return "Hybrid"
  if (lower.includes("onsite") || lower.includes("on-site")) return "On-site"
  return "Not specified"
}

function inferLocation(text: string) {
  const match = text.match(/\b(?:location|based in)\s*[:\-]\s*([A-Za-z ,.-]{2,80})/i)
  return match?.[1]?.split("\n")[0]?.trim() ?? ""
}

function collectLinesNear(text: string, markers: string[]) {
  const lines = text.split("\n")
  const collected: string[] = []
  let active = false

  for (const line of lines) {
    const lower = line.toLowerCase()
    if (markers.some((marker) => lower.includes(marker))) active = true
    if (active) collected.push(line)
    if (active && collected.length > 10 && isHeading(line)) break
  }

  return collected.join("\n")
}

function extractResponsibilities(text: string) {
  const section = collectLinesNear(text, ["responsibilities", "what you will do", "duties"])
  const source = section || text

  return unique(
    source
      .split("\n")
      .map((line) => line.trim().replace(/^[-*•]\s*/, ""))
      .filter((line) => /\b(build|develop|design|manage|collaborate|optimize|maintain|analyze|lead|support)\b/i.test(line))
      .slice(0, 8)
  )
}

function importantWords(text: string) {
  return unique(
    text
      .split(/[^A-Za-z0-9+#.]+/)
      .filter((word) => word.length > 3)
      .filter((word) => !/^(with|that|this|from|will|have|using|your|their|about)$/i.test(word))
  )
}

export function scoreResumeAgainstJob(resumeText: string, profile: StructuredResumeProfile, analysis: JobDescriptionAnalysis): ResumeMatchScore {
  const requiredMatched = analysis.requiredSkills.filter((skill) => includesTerm(resumeText, skill)).length
  const preferredMatched = analysis.preferredSkills.filter((skill) => includesTerm(resumeText, skill)).length
  const allKeywords = unique([
    ...analysis.requiredSkills,
    ...analysis.preferredSkills,
    ...analysis.toolsAndTechnologies,
    ...analysis.softSkills,
  ])
  const keywordMatches = allKeywords.filter((keyword) => includesTerm(resumeText, keyword)).length
  const responsibilityMatches = analysis.responsibilities.filter((responsibility) =>
    importantWords(responsibility).some((word) => includesTerm(resumeText, word))
  ).length
  const sectionSignals = [
    Boolean(profile.summary),
    Object.values(profile.skills).some((items) => items.length > 0),
    profile.workExperience.length > 0,
    profile.education.length > 0,
  ].filter(Boolean).length
  const formattingCompleteness = clampScore(65 + sectionSignals * 8 + Math.min(profile.workExperience.length, 2) * 5)
  const titleRelevance = analysis.jobTitle
    ? includesTerm(resumeText, analysis.jobTitle) || includesTerm(resumeText, analysis.roleCategory)
      ? 85
      : 55
    : 70
  const experienceRelevance = profile.workExperience.length > 0 ? 78 : 45

  const breakdown: ScoreBreakdown = {
    requiredSkillsMatch: percentage(requiredMatched, analysis.requiredSkills.length),
    preferredSkillsMatch: percentage(preferredMatched, analysis.preferredSkills.length),
    responsibilityMatch: percentage(responsibilityMatches, analysis.responsibilities.length),
    jobTitleRelevance: titleRelevance,
    experienceRelevance,
    keywordCoverage: percentage(keywordMatches, allKeywords.length),
    formattingCompleteness,
    sectionCompleteness: percentage(sectionSignals, 4),
  }
  const originalScore = clampScore(
    breakdown.requiredSkillsMatch * 0.22 +
      breakdown.preferredSkillsMatch * 0.12 +
      breakdown.responsibilityMatch * 0.16 +
      breakdown.jobTitleRelevance * 0.12 +
      breakdown.experienceRelevance * 0.12 +
      breakdown.keywordCoverage * 0.16 +
      breakdown.formattingCompleteness * 0.05 +
      breakdown.sectionCompleteness * 0.05
  )

  return {
    label: "Estimated resume match score",
    originalScore,
    breakdown,
    disclaimer: SCORE_DISCLAIMER,
  }
}

export function buildKeywordCoverage(resumeText: string, analysis: JobDescriptionAnalysis): KeywordCoverageItem[] {
  const items: KeywordCoverageItem[] = []

  const pushItems = (keywords: string[], source: KeywordCoverageItem["source"]) => {
    keywords.forEach((keyword) => {
      const count = countOccurrences(resumeText, keyword)
      let status: KeywordCoverageItem["status"] = "missing"
      let reason = "Not found in the master resume."

      if (count >= 2) {
        status = "found_and_used"
        reason = "Found in multiple parts of the master resume."
      } else if (count === 1) {
        status = "found_but_weak"
        reason = "Found once, but it may need stronger placement."
      } else if (source === "required" || source === "tool") {
        status = "needs_confirmation"
        reason = "Found in the job description but not in the master resume. Confirm real experience before adding."
      } else {
        status = "not_recommended"
        reason = "No supporting evidence found in the master resume."
      }

      items.push({
        keyword,
        status,
        reason,
        source,
        confirmed: false,
      })
    })
  }

  pushItems(analysis.requiredSkills, "required")
  pushItems(analysis.preferredSkills, "preferred")
  pushItems(analysis.toolsAndTechnologies.filter((skill) => !items.some((item) => item.keyword === skill)), "tool")
  pushItems(analysis.softSkills.filter((skill) => !items.some((item) => item.keyword === skill)), "soft_skill")

  return items
}

function countOccurrences(text: string, keyword: string) {
  const normalizedText = canonical(text)
  const normalizedKeyword = canonical(keyword)
  if (!normalizedKeyword) return 0
  return normalizedText.split(normalizedKeyword).length - 1
}

export function generateTailoredResume(input: {
  masterResume: MasterResume
  analysis: JobDescriptionAnalysis
  confirmedSkills: string[]
}) {
  const { masterResume, analysis } = input
  const confirmedSkills = unique(input.confirmedSkills)
  const originalCoverage = buildKeywordCoverage(masterResume.parsedText, analysis)
  const profile = structuredClone(masterResume.structuredProfile) as StructuredResumeProfile
  const supportedSkills = new Set<string>()

  Object.values(profile.skills).forEach((skills) => skills.forEach((skill) => supportedSkills.add(skill)))
  confirmedSkills.forEach((skill) => supportedSkills.add(skill))

  const changeLog: ChangeLogItem[] = []
  const unsupportedKeywords: string[] = []

  originalCoverage.forEach((item) => {
    if (item.status === "needs_confirmation" && confirmedSkills.some((skill) => canonical(skill) === canonical(item.keyword))) {
      item.confirmed = true
      changeLog.push({
        id: createId(),
        label: "needs_confirmation",
        section: "Skills",
        keyword: item.keyword,
        after: item.keyword,
        reason: `${item.keyword} was only added after user confirmation.`,
      })
      addSkillToProfile(profile, item.keyword)
    } else if (item.status === "needs_confirmation" || item.status === "not_recommended") {
      unsupportedKeywords.push(item.keyword)
      changeLog.push({
        id: createId(),
        label: "not_added_no_proof",
        section: "Safe Tailoring",
        keyword: item.keyword,
        reason: `${item.keyword} was not added because no proof was found in the master resume.`,
      })
    }
  })

  const matchedRequired = analysis.requiredSkills.filter((skill) => supportedSkills.has(skill) || includesTerm(masterResume.parsedText, skill))
  const title = analysis.jobTitle || analysis.roleCategory
  const summaryBefore = profile.summary
  profile.summary = buildTailoredSummary(profile, title, matchedRequired)
  if (profile.summary !== summaryBefore) {
    changeLog.push({
      id: createId(),
      label: "reworded_from_existing",
      section: "Summary",
      before: summaryBefore,
      after: profile.summary,
      reason: "Reworded the existing summary to emphasize role-relevant skills already present in the master profile.",
    })
  }

  profile.workExperience = reorderAndTuneExperience(profile.workExperience, matchedRequired, changeLog)
  profile.skills = reorderSkills(profile.skills, [...analysis.requiredSkills, ...analysis.preferredSkills, ...confirmedSkills])

  const resumeText = renderResumeText({
    contact: profile.contact,
    summary: profile.summary,
    skills: profile.skills,
    workExperience: profile.workExperience,
    projects: profile.projects,
    education: profile.education,
    certifications: profile.certifications,
  })
  const tailoredScore = scoreResumeAgainstJob(resumeText, profile, analysis)
  const originalScore = scoreResumeAgainstJob(masterResume.parsedText, masterResume.structuredProfile, analysis)

  const resumeJson: TailoredResumeJson = {
    contact: profile.contact,
    summary: profile.summary,
    skills: profile.skills,
    workExperience: profile.workExperience,
    projects: profile.projects,
    education: profile.education,
    certifications: profile.certifications,
    keywordCoverage: originalCoverage,
    unsupportedKeywords,
    changeLog,
    scoreExplanation: `Estimated resume match score improved from ${originalScore.originalScore}% to ${tailoredScore.originalScore}% by emphasizing supported keywords and preserving unsupported-skill guardrails.`,
    warnings: [
      "Review your resume before downloading. You are always in control of the final content.",
      ...unsupportedKeywords.map((keyword) => `${keyword} was not added without evidence or confirmation.`),
    ],
  }

  return {
    resumeJson,
    resumeText: renderResumeText(resumeJson),
    originalScore: originalScore.originalScore,
    tailoredScore: tailoredScore.originalScore,
    scoreBreakdown: tailoredScore.breakdown,
    keywordCoverage: originalCoverage,
    changeLog,
  }
}

function addSkillToProfile(profile: StructuredResumeProfile, skill: string) {
  const targetCategory =
    (Object.entries(SKILL_CATALOG).find(([, skills]) =>
      skills.some((catalogSkill) => canonical(catalogSkill) === canonical(skill))
    )?.[0] as keyof StructuredResumeProfile["skills"] | undefined) ?? "tools"

  profile.skills[targetCategory] = unique([...profile.skills[targetCategory], skill])
}

function buildTailoredSummary(profile: StructuredResumeProfile, title: string, matchedRequired: string[]) {
  const nameOrRole = title || "target role"
  const skills = matchedRequired.slice(0, 5).join(", ")
  const existing = profile.summary || "Professional with experience delivering practical, business-focused work."
  const firstSentence = existing.split(/[.!?]/)[0]?.trim()

  if (skills) {
    return `${nameOrRole} candidate with demonstrated experience in ${skills}. ${firstSentence}. Focused on clear, ATS-friendly communication and role-relevant impact.`
  }

  return `${nameOrRole} candidate with a background aligned to the role requirements. ${firstSentence}.`
}

function reorderAndTuneExperience(
  experience: ExperienceItem[],
  matchedRequired: string[],
  changeLog: ChangeLogItem[]
) {
  return experience.map((item) => {
    const sortedBullets = [...item.bullets].sort((a, b) => {
      const scoreA = matchedRequired.filter((skill) => includesTerm(a, skill)).length
      const scoreB = matchedRequired.filter((skill) => includesTerm(b, skill)).length
      return scoreB - scoreA
    })
    const tunedBullets = sortedBullets.map((bullet) => {
      const missingSupportedSkill = matchedRequired.find((skill) => !includesTerm(bullet, skill))
      if (!missingSupportedSkill || sortedBullets.some((other) => includesTerm(other, missingSupportedSkill))) {
        return bullet
      }

      const tuned = `${bullet.replace(/\.$/, "")}, with emphasis on ${missingSupportedSkill}.`
      changeLog.push({
        id: createId(),
        label: "reworded_from_existing",
        section: "Experience",
        keyword: missingSupportedSkill,
        before: bullet,
        after: tuned,
        reason: `Added a supported keyword already present in the master profile to improve alignment.`,
      })
      return tuned
    })

    return {
      ...item,
      bullets: tunedBullets,
    }
  })
}

function reorderSkills(skills: StructuredResumeProfile["skills"], priorityKeywords: string[]) {
  const priority = new Set(priorityKeywords.map(canonical))
  const sorted = structuredClone(skills) as StructuredResumeProfile["skills"]

  Object.keys(sorted).forEach((key) => {
    const category = key as keyof StructuredResumeProfile["skills"]
    sorted[category] = [...sorted[category]].sort((a, b) => {
      const aPriority = priority.has(canonical(a)) ? 0 : 1
      const bPriority = priority.has(canonical(b)) ? 0 : 1
      return aPriority - bPriority || a.localeCompare(b)
    })
  })

  return sorted
}

export function renderResumeText(resume: Pick<TailoredResumeJson, "contact" | "summary" | "skills" | "workExperience" | "projects" | "education" | "certifications">) {
  const skillLines = Object.entries(resume.skills)
    .filter(([, skills]) => skills.length > 0)
    .map(([category, skills]) => `${labelize(category)}: ${skills.join(", ")}`)

  return normalizeText(
    [
      resume.contact.fullName,
      [resume.contact.location, resume.contact.phone, resume.contact.email, resume.contact.linkedIn]
        .filter(Boolean)
        .join(" | "),
      "",
      "SUMMARY",
      resume.summary,
      "",
      "SKILLS",
      ...skillLines,
      "",
      "EXPERIENCE",
      ...resume.workExperience.flatMap((item) => [
        `${item.jobTitle}${item.company ? ` - ${item.company}` : ""}`,
        [item.location, [item.startDate, item.endDate || (item.currentRole ? "Present" : "")].filter(Boolean).join(" - ")]
          .filter(Boolean)
          .join(" | "),
        ...item.bullets.map((bullet) => `- ${bullet}`),
        "",
      ]),
      resume.projects.length > 0 ? "PROJECTS" : "",
      ...resume.projects.flatMap((item) => [
        item.name,
        item.description,
        ...item.bullets.map((bullet) => `- ${bullet}`),
        "",
      ]),
      resume.education.length > 0 ? "EDUCATION" : "",
      ...resume.education.map((item) =>
        [item.degree, item.school, item.location, item.graduationDate].filter(Boolean).join(" | ")
      ),
      resume.certifications.length > 0 ? "\nCERTIFICATIONS" : "",
      ...resume.certifications.map((item) => [item.name, item.issuer, item.date].filter(Boolean).join(" | ")),
    ]
      .filter((line) => line !== null && line !== undefined)
      .join("\n")
  )
}

function labelize(value: string) {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase())
}

export function buildAtsScore(input: { resumeText: string; targetRole?: string }) {
  const profile = parseResumeText(input.resumeText)
  const skillsDetected = Object.values(profile.skills).flat()
  const hasContact = Boolean(profile.contact.email || profile.contact.phone)
  const sectionCompleteness = percentage(
    [profile.summary, skillsDetected.length > 0, profile.workExperience.length > 0, profile.education.length > 0].filter(Boolean)
      .length,
    4
  )
  const formatting = clampScore(90 - Math.max(0, (input.resumeText.match(/\|/g)?.length ?? 0) - 8) * 2)
  const skillsClarity = percentage(skillsDetected.length, 10)
  const readability = clampScore(80 - Math.max(0, average(profile.workExperience.flatMap((item) => item.bullets.map((bullet) => bullet.length))) - 160) / 4)
  const keywordStrength = input.targetRole
    ? percentage(
        skillsDetected.filter((skill) => includesTerm(input.targetRole || "", skill)).length + skillsDetected.length,
        12
      )
    : skillsClarity
  const score = clampScore(
    formatting * 0.2 + sectionCompleteness * 0.25 + skillsClarity * 0.2 + readability * 0.2 + keywordStrength * 0.15
  )

  return {
    estimatedAtsScore: score,
    breakdown: {
      formatting,
      sectionCompleteness,
      skillsClarity,
      experienceReadability: readability,
      keywordStrength,
      contactCompleteness: hasContact ? 100 : 45,
    },
    topIssues: [
      !hasContact ? "Contact details are incomplete." : "",
      skillsDetected.length < 5 ? "Skills section is thin or not grouped clearly." : "",
      profile.workExperience.length === 0 ? "Work experience section was not detected." : "",
      readability < 65 ? "Some work experience bullets are long and hard to scan." : "",
    ].filter(Boolean),
    topRecommendations: [
      "Group skills by category so recruiters and ATS systems can scan them quickly.",
      "Use concise bullets that start with strong action verbs.",
      "Mirror only the job keywords that are genuinely supported by your experience.",
    ],
    disclaimer: ATS_DISCLAIMER,
  }
}

export function buildResumeMatchTool(input: { resumeText: string; jobDescriptionText: string }) {
  const profile = parseResumeText(input.resumeText)
  const analysis = analyzeJobDescription({ rawText: input.jobDescriptionText })
  const score = scoreResumeAgainstJob(input.resumeText, profile, analysis)
  const coverage = buildKeywordCoverage(input.resumeText, analysis)

  return {
    analysis,
    score,
    requiredSkillsFound: coverage
      .filter((item) => item.source === "required" && ["found_and_used", "found_but_weak"].includes(item.status))
      .map((item) => item.keyword),
    requiredSkillsMissing: coverage
      .filter((item) => item.source === "required" && !["found_and_used", "found_but_weak"].includes(item.status))
      .map((item) => item.keyword),
    preferredSkillsFound: coverage
      .filter((item) => item.source === "preferred" && ["found_and_used", "found_but_weak"].includes(item.status))
      .map((item) => item.keyword),
    preferredSkillsMissing: coverage
      .filter((item) => item.source === "preferred" && !["found_and_used", "found_but_weak"].includes(item.status))
      .map((item) => item.keyword),
    keywordCoverage: coverage,
    suggestedImprovements: [
      "Move strongly matched required skills into the top third of the resume.",
      "Reword existing bullets to mirror JD responsibilities without adding unsupported claims.",
      "Confirm any missing tools before adding them to the resume.",
    ],
  }
}

export function buildKeywordScan(input: { resumeText: string; targetRole?: string }) {
  const profile = parseResumeText(input.resumeText)
  const detected = Object.values(profile.skills).flat()
  const targetRole = input.targetRole || "Software Engineer"
  const roleTerms =
    Object.entries(ROLE_KEYWORDS).find(([role]) => canonical(role) === canonical(targetRole))?.[1] ?? []
  const commonRoleSkills = ALL_SKILLS.filter((skill) =>
    roleTerms.some((term) => includesTerm(`${term} ${targetRole}`, skill))
  )
  const missing = unique([...commonRoleSkills, "REST APIs", "Git", "Agile", "Cloud"].filter((skill) => !includesTerm(input.resumeText, skill))).slice(0, 8)

  return {
    targetRole,
    detectedTechnicalSkills: detected.filter((skill) => !SKILL_CATALOG.softSkills.includes(skill)),
    detectedSoftSkills: detected.filter((skill) => SKILL_CATALOG.softSkills.includes(skill)),
    missingCommonKeywords: missing,
    weakKeywordAreas: detected.length < 8 ? ["Skills section depth", "Role-specific tools"] : ["Keyword placement"],
    suggestedKeywordPlacement: [
      "Place core technical skills in a grouped skills section.",
      "Repeat high-priority supported skills in relevant work experience bullets.",
      "Keep unsupported skills out unless you can honestly confirm experience.",
    ],
  }
}

export function buildSalaryEstimate(input: {
  role: string
  yearsExperience: string
  location: string
  skills: string[]
  workMode: string
  industry?: string
}) {
  const role = input.role || "Software Engineer"
  const baseByRole =
    role.toLowerCase().includes("java") || role.toLowerCase().includes("software")
      ? 96000
      : role.toLowerCase().includes("data")
        ? 90000
        : role.toLowerCase().includes("product")
          ? 110000
          : 82000
  const experienceBoost =
    input.yearsExperience.includes("10") ? 42000 : input.yearsExperience.includes("6") ? 27000 : input.yearsExperience.includes("3") ? 12000 : 0
  const locationBoost = /san francisco|new york|seattle|bay area|boston/i.test(input.location)
    ? 22000
    : /dallas|austin|chicago|atlanta|denver/i.test(input.location)
      ? 8000
      : 0
  const skillBoost = input.skills.reduce((total, skill) => {
    if (/aws|cloud|kubernetes|distributed|microservices|spring boot/i.test(skill)) return total + 3500
    return total + 1500
  }, 0)
  const workModeBoost = input.workMode.toLowerCase().includes("remote") ? 5000 : 0
  const median = Math.round((baseByRole + experienceBoost + locationBoost + skillBoost + workModeBoost) / 1000) * 1000
  const low = Math.round((median * 0.82) / 1000) * 1000
  const high = Math.round((median * 1.23) / 1000) * 1000

  return {
    role,
    low,
    median,
    high,
    factors: [
      input.location ? `Location adjustment for ${input.location}` : "Location was not specified",
      input.yearsExperience ? `${input.yearsExperience} experience band` : "Experience band not specified",
      input.workMode ? `${input.workMode} work mode` : "Work mode not specified",
    ],
    skillsThatMayIncreaseValue: unique(["Spring Boot", "AWS", "Microservices", "Cloud deployment", "Distributed systems", ...input.skills]).slice(0, 8),
    suggestedResumePositioning: [
      `Emphasize ${role} keywords in summary and skills.`,
      "Quantify backend, cloud, data, or operational impact where possible.",
      "Keep salary output labeled as directional, not guaranteed market data.",
    ],
    disclaimer: SALARY_DISCLAIMER,
  }
}

export function buildBulletSuggestions(input: {
  jobTitle: string
  existingBullet: string
  toolsUsed?: string
  impactMetric?: string
  targetRole?: string
}) {
  const action = input.existingBullet.match(/\b(built|worked|made|helped|created|managed|developed|implemented)\b/i)?.[0] ?? "Developed"
  const tools = input.toolsUsed?.trim()
  const metric = input.impactMetric?.trim()
  const role = input.targetRole || input.jobTitle || "target role"
  const base = input.existingBullet.replace(/^[-*•]\s*/, "").replace(/\.$/, "")
  const unsupportedWarnings = ALL_SKILLS.filter((skill) => includesTerm(`${tools ?? ""} ${base}`, skill) && !includesTerm(`${tools ?? ""} ${base}`, skill))

  return {
    options: [
      `${strongVerb(action)} ${base.toLowerCase()}${tools ? ` using ${tools}` : ""}${metric ? `, improving ${metric}` : ""}.`,
      `Delivered ${role.toLowerCase()} work by ${base.toLowerCase()}${tools ? ` with ${tools}` : ""}${metric ? ` to achieve ${metric}` : ""}.`,
      `Improved team execution by ${base.toLowerCase()}${tools ? ` across ${tools} workflows` : ""}${metric ? `, resulting in ${metric}` : ""}.`,
    ],
    strongActionVerbs: ["Developed", "Implemented", "Optimized", "Delivered", "Improved"],
    keywordImprovements: unique([...(tools?.split(",") ?? []), role]).filter(Boolean),
    metricSuggestion: metric ? "" : "Add a measurable result such as time saved, revenue impact, quality improvement, or scale.",
    unsupportedClaimWarning:
      unsupportedWarnings.length > 0
        ? "Only include tools or outcomes you can support from real experience."
        : "No unsupported claim detected, but review before adding to your master resume.",
  }
}

function strongVerb(action: string) {
  const lower = action.toLowerCase()
  if (lower === "worked" || lower === "helped") return "Delivered"
  if (lower === "made") return "Built"
  return action.charAt(0).toUpperCase() + action.slice(1)
}

export function buildSummarySuggestions(input: {
  targetRole: string
  yearsExperience: string
  topSkills: string
  industry?: string
  jobDescription?: string
}) {
  const skills = input.topSkills || "role-relevant skills"
  const role = input.targetRole || "target role"
  const years = input.yearsExperience || "relevant"
  const jd = input.jobDescription ? analyzeJobDescription({ rawText: input.jobDescription, jobTitle: role }) : null
  const jdSkills = jd?.requiredSkills.slice(0, 4).join(", ")

  return {
    conservativeSummary: `${role} candidate with ${years} experience and a background in ${skills}. Focused on clear execution, collaboration, and measurable business outcomes.`,
    balancedSummary: `${role} with ${years} experience applying ${skills} to deliver reliable, user-focused solutions${input.industry ? ` in ${input.industry}` : ""}.`,
    keywordRichSummary: `${role} with experience in ${unique([skills, jdSkills ?? ""]).filter(Boolean).join(", ")}. Skilled at translating job requirements into practical, ATS-friendly resume positioning.`,
    shortAtsSummary: `${role} with ${years} experience in ${skills}.`,
  }
}

export function buildInterviewQuestions(input: {
  jobDescription: string
  role?: string
  experienceLevel?: string
}) {
  const analysis = analyzeJobDescription({ rawText: input.jobDescription, jobTitle: input.role })
  const skills = [...analysis.requiredSkills, ...analysis.preferredSkills].slice(0, 6)

  return {
    role: input.role || analysis.jobTitle,
    experienceLevel: input.experienceLevel || analysis.experienceLevel,
    technicalQuestions: skills.map((skill) => `How have you used ${skill} in a real project or work setting?`),
    behavioralQuestions: [
      "Tell me about a time you had to learn a new tool quickly.",
      "Describe a project where you improved quality, speed, or reliability.",
      "How do you communicate tradeoffs to non-technical stakeholders?",
    ],
    roleSpecificQuestions: analysis.responsibilities
      .slice(0, 4)
      .map((responsibility) => `How would you approach this responsibility: ${responsibility}?`),
    skillsToReview: skills,
    resumeBasedQuestions: [
      "Which resume bullet best proves your fit for this role?",
      "What project most closely matches the job description?",
    ],
  }
}

export function buildMinimalPdf(text: string) {
  const lines = normalizeText(text)
    .split("\n")
    .flatMap((line) => wrapLine(line, 92))
    .slice(0, 70)
  const escapedLines = lines.map(escapePdfString)
  const content = [
    "BT",
    "/F1 10 Tf",
    "50 760 Td",
    "14 TL",
    ...escapedLines.map((line) => `(${line}) Tj T*`),
    "ET",
  ].join("\n")
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${Buffer.byteLength(content)} >> stream\n${content}\nendstream endobj`,
  ]
  let pdf = "%PDF-1.4\n"
  const offsets = [0]
  objects.forEach((object) => {
    offsets.push(Buffer.byteLength(pdf))
    pdf += `${object}\n`
  })
  const xrefOffset = Buffer.byteLength(pdf)
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  offsets.slice(1).forEach((offset) => {
    pdf += `${offset.toString().padStart(10, "0")} 00000 n \n`
  })
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return Buffer.from(pdf, "binary")
}

function wrapLine(line: string, width: number) {
  if (!line) return [""]
  const words = line.split(" ")
  const lines: string[] = []
  let current = ""

  words.forEach((word) => {
    if (`${current} ${word}`.trim().length > width) {
      lines.push(current)
      current = word
    } else {
      current = `${current} ${word}`.trim()
    }
  })

  if (current) lines.push(current)
  return lines
}

function escapePdfString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")
}

export function createSalaryEstimateRecord(input: Omit<SalaryEstimate, "id" | "createdAt">): SalaryEstimate {
  return {
    ...input,
    id: createId(),
    createdAt: nowIso(),
  }
}
