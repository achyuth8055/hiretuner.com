import type { NextRequest } from "next/server"
import { createId, nowIso, replaceMasterResume } from "@/lib/database"
import { jsonError, jsonOk, readJson, requireApiUser } from "@/lib/http"
import type {
  CertificationItem,
  ContactInfo,
  EducationItem,
  ExperienceItem,
  MasterResume,
  ProjectItem,
  StructuredResumeProfile,
} from "@/lib/rolefit-types"

export const runtime = "nodejs"

/**
 * Build a master resume from scratch — for users who don't have an existing
 * resume file to upload. Accepts a `StructuredResumeProfile` and synthesizes
 * the plain-text representation so the rest of the tailoring pipeline (which
 * reads `parsedText`) works without any special casing.
 */

type BuildBody = {
  contact?: Partial<ContactInfo>
  summary?: string
  skills?: Partial<StructuredResumeProfile["skills"]>
  workExperience?: Array<Partial<ExperienceItem>>
  projects?: Array<Partial<ProjectItem>>
  education?: Array<Partial<EducationItem>>
  certifications?: Array<Partial<CertificationItem>>
  links?: string[]
}

function emptySkills(): StructuredResumeProfile["skills"] {
  return {
    programmingLanguages: [],
    frameworks: [],
    databases: [],
    cloudPlatforms: [],
    tools: [],
    businessSkills: [],
    softSkills: [],
  }
}

function normalizeContact(contact: Partial<ContactInfo> | undefined): ContactInfo {
  return {
    fullName: contact?.fullName?.trim() ?? "",
    email: contact?.email?.trim() ?? "",
    phone: contact?.phone?.trim() ?? "",
    location: contact?.location?.trim() ?? "",
    linkedIn: contact?.linkedIn?.trim() ?? "",
    github: contact?.github?.trim() ?? "",
    portfolio: contact?.portfolio?.trim() ?? "",
  }
}

function clampList(values: unknown, max = 30): string[] {
  if (!Array.isArray(values)) return []
  return values
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean)
    .slice(0, max)
}

function normalizeExperience(items: BuildBody["workExperience"]): ExperienceItem[] {
  if (!Array.isArray(items)) return []
  return items.slice(0, 10).map((item) => ({
    id: createId(),
    jobTitle: item?.jobTitle?.trim() ?? "",
    company: item?.company?.trim() ?? "",
    location: item?.location?.trim() ?? "",
    startDate: item?.startDate?.trim() ?? "",
    endDate: item?.endDate?.trim() ?? "",
    currentRole: Boolean(item?.currentRole),
    bullets: clampList(item?.bullets, 12),
  }))
}

function normalizeProjects(items: BuildBody["projects"]): ProjectItem[] {
  if (!Array.isArray(items)) return []
  return items.slice(0, 10).map((item) => ({
    id: createId(),
    name: item?.name?.trim() ?? "",
    description: item?.description?.trim() ?? "",
    technologies: clampList(item?.technologies, 30),
    bullets: clampList(item?.bullets, 8),
  }))
}

function normalizeEducation(items: BuildBody["education"]): EducationItem[] {
  if (!Array.isArray(items)) return []
  return items.slice(0, 6).map((item) => ({
    id: createId(),
    school: item?.school?.trim() ?? "",
    degree: item?.degree?.trim() ?? "",
    location: item?.location?.trim() ?? "",
    graduationDate: item?.graduationDate?.trim() ?? "",
  }))
}

function normalizeCerts(items: BuildBody["certifications"]): CertificationItem[] {
  if (!Array.isArray(items)) return []
  return items.slice(0, 10).map((item) => ({
    id: createId(),
    name: (item as { name?: string })?.name?.trim() ?? "",
  })) as CertificationItem[]
}

/**
 * Render the structured profile into the plain-text form the JD-matching
 * pipeline already understands. Keeps formatting close to what
 * `parseResumeText` would produce, so a built-from-scratch resume scores
 * the same as one parsed from a PDF with equivalent content.
 */
function renderStructuredAsText(profile: StructuredResumeProfile): string {
  const lines: string[] = []
  const c = profile.contact
  if (c.fullName) lines.push(c.fullName)
  const contactBits = [c.email, c.phone, c.location, c.linkedIn, c.github, c.portfolio]
    .filter(Boolean)
    .join(" | ")
  if (contactBits) lines.push(contactBits)

  if (profile.summary) {
    lines.push("", "SUMMARY", profile.summary)
  }

  const skillBits = Object.entries(profile.skills)
    .filter(([, list]) => list.length > 0)
    .map(([label, list]) => `${humanizeSkillLabel(label)}: ${list.join(", ")}`)
  if (skillBits.length) {
    lines.push("", "SKILLS", ...skillBits)
  }

  if (profile.workExperience.length) {
    lines.push("", "EXPERIENCE")
    for (const job of profile.workExperience) {
      const header = [job.jobTitle, job.company].filter(Boolean).join(" — ")
      const dates = [job.startDate, job.currentRole ? "Present" : job.endDate]
        .filter(Boolean)
        .join(" – ")
      lines.push(header || "Role", `${job.location || ""}${dates ? `   ${dates}` : ""}`.trim())
      for (const b of job.bullets) lines.push(`• ${b}`)
      lines.push("")
    }
  }

  if (profile.projects.length) {
    lines.push("PROJECTS")
    for (const proj of profile.projects) {
      const techBit = proj.technologies.length ? ` | ${proj.technologies.join(", ")}` : ""
      lines.push(`${proj.name}${techBit}`)
      if (proj.description) lines.push(proj.description)
      for (const b of proj.bullets) lines.push(`• ${b}`)
      lines.push("")
    }
  }

  if (profile.education.length) {
    lines.push("EDUCATION")
    for (const edu of profile.education) {
      lines.push(
        [edu.degree, edu.school, edu.location, edu.graduationDate].filter(Boolean).join(" | "),
      )
    }
    lines.push("")
  }

  if (profile.certifications.length) {
    lines.push(
      "CERTIFICATIONS",
      ...profile.certifications.map((cert) => `• ${cert.name}`),
      "",
    )
  }

  if (profile.links.length) {
    lines.push("LINKS", profile.links.join(" | "))
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim()
}

function humanizeSkillLabel(camel: string): string {
  return camel
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim()
}

export async function POST(request: NextRequest) {
  const context = requireApiUser(request)
  if (context instanceof Response) return context

  const body = await readJson<BuildBody>(request)
  if (!body) {
    return jsonError("Provide your resume fields as JSON.", 422, "validation_error")
  }

  const contact = normalizeContact(body.contact)
  if (!contact.fullName || !contact.email) {
    return jsonError(
      "Your name and email are required so the resume header has something to render.",
      422,
      "validation_error",
    )
  }

  const skills: StructuredResumeProfile["skills"] = {
    ...emptySkills(),
    ...Object.fromEntries(
      Object.entries(body.skills ?? {}).map(([key, value]) => [key, clampList(value, 30)]),
    ),
  }

  const workExperience = normalizeExperience(body.workExperience)
  if (workExperience.length === 0) {
    return jsonError(
      "Add at least one work experience entry so the JD-matching engine has something to tailor.",
      422,
      "validation_error",
    )
  }

  const structuredProfile: StructuredResumeProfile = {
    contact,
    summary: body.summary?.trim() ?? "",
    skills,
    workExperience,
    projects: normalizeProjects(body.projects),
    education: normalizeEducation(body.education),
    certifications: normalizeCerts(body.certifications),
    links: clampList(body.links, 8),
  }

  const parsedText = renderStructuredAsText(structuredProfile)
  if (parsedText.length < 80) {
    return jsonError(
      "Add a bit more detail — your profile is too thin to score against a job description.",
      422,
      "validation_error",
    )
  }

  const timestamp = nowIso()
  const masterResume: MasterResume = {
    id: createId(),
    userId: context.user.id,
    originalFileUrl: null,
    originalFileName: null,
    parsedText,
    structuredProfile,
    active: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  replaceMasterResume(masterResume)
  return jsonOk({ masterResume })
}
