import type { NextRequest } from "next/server"
import {
  createId,
  getActiveMasterResume,
  nowIso,
  readDatabase,
  saveTailoredResume,
} from "@/lib/database"
import { assertUsageAvailable, incrementUsage, jsonError, jsonOk, requireApiUser, readJson } from "@/lib/http"
import { logger } from "@/lib/logger"
import { generateTailoredResume } from "@/lib/resume-engine"
import type { Application, TailoredResume } from "@/lib/rolefit-types"
import { optionalStringArray, requireString, ValidationFailed } from "@/lib/validate"

export const runtime = "nodejs"

type TailorBody = {
  jobDescriptionId?: string
  confirmedSkills?: string[]
}

export async function GET(request: NextRequest) {
  const context = requireApiUser(request)
  if (context instanceof Response) return context

  const database = readDatabase()
  const tailoredResumes = database.tailoredResumes
    .filter((resume) => resume.userId === context.user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return jsonOk({ tailoredResumes })
}

export async function POST(request: NextRequest) {
  const context = requireApiUser(request)
  if (context instanceof Response) return context

  const usageCheck = assertUsageAvailable(context.user.id, "tailoredResumesUsed", context.plan)
  if (!usageCheck.allowed) {
    logger.warn("api.tailored-resumes", "Monthly tailored-resume limit reached", {
      userId: context.user.id,
      plan: context.plan,
      used: usageCheck.usage.tailoredResumesUsed,
      limit: usageCheck.limit,
    })
    return jsonError(usageCheck.message, 402, "usage_limit", {
      limit: usageCheck.limit,
      usage: usageCheck.usage.tailoredResumesUsed,
      upgradeRequired: context.plan === "free",
      monthlyCap: usageCheck.limit,
    })
  }

  const body = await readJson<TailorBody>(request)
  let jobDescriptionId: string
  let confirmedSkills: string[]
  try {
    jobDescriptionId = requireString("jobDescriptionId", body?.jobDescriptionId, { min: 1, max: 200 })
    confirmedSkills = optionalStringArray("confirmedSkills", body?.confirmedSkills)
  } catch (error) {
    if (error instanceof ValidationFailed) {
      return jsonError(error.message, 422, "validation_error", error.errors)
    }
    throw error
  }

  const database = readDatabase()
  const masterResume = getActiveMasterResume(context.user.id)

  if (!masterResume) {
    return jsonError("Upload and parse a master resume before tailoring.", 409, "master_resume_required")
  }

  const jobDescription = database.jobDescriptions.find(
    (item) => item.id === jobDescriptionId && item.userId === context.user.id
  )

  if (!jobDescription) {
    return jsonError("Job description analysis not found.", 404, "not_found")
  }

  const generated = generateTailoredResume({
    masterResume,
    analysis: jobDescription.analysis,
    confirmedSkills,
  })
  const timestamp = nowIso()
  const versionNumber =
    database.tailoredResumes.filter((resume) => resume.userId === context.user.id).length + 1
  const tailoredResume: TailoredResume = {
    id: createId(),
    userId: context.user.id,
    masterResumeId: masterResume.id,
    jobDescriptionId: jobDescription.id,
    resumeJson: generated.resumeJson,
    resumeText: generated.resumeText,
    originalScore: generated.originalScore,
    tailoredScore: generated.tailoredScore,
    scoreBreakdown: generated.scoreBreakdown,
    keywordCoverage: generated.keywordCoverage,
    changeLog: generated.changeLog,
    versionNumber,
    pdfUrl: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  const application: Application = {
    id: createId(),
    userId: context.user.id,
    tailoredResumeId: tailoredResume.id,
    companyName: jobDescription.companyName,
    jobTitle: jobDescription.jobTitle,
    jobUrl: jobDescription.jobUrl,
    status: "Saved",
    notes: "",
    dateApplied: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  saveTailoredResume(tailoredResume, application)
  const updatedUsage = incrementUsage(context.user.id, "tailoredResumesUsed")
  logger.info("api.tailored-resumes", "Tailored resume created", {
    userId: context.user.id,
    plan: context.plan,
    tailoredUsed: updatedUsage.tailoredResumesUsed,
    monthlyLimit: usageCheck.limit,
  })

  return jsonOk({
    tailoredResume,
    application,
    usage: updatedUsage,
    monthlyLimit: usageCheck.limit,
  })
}
