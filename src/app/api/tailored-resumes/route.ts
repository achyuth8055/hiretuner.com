import type { NextRequest } from "next/server"
import {
  createId,
  getActiveMasterResume,
  nowIso,
  readDatabase,
  saveTailoredResume,
} from "@/lib/database"
import { jsonError, jsonOk, refundUsage, requireApiUser, readJson, reserveUsage } from "@/lib/http"
import { isLlmTailorConfigured, tailorResumeWithLLM } from "@/lib/llm-tailor"
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

  // Validate the request body FIRST so a malformed submission never consumes
  // the user's tailored-resume quota.
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

  // Atomic check+increment to close TOCTOU (AUTH-H2). Refund on any failure
  // path below so the user isn't charged when generation throws.
  const reservation = reserveUsage(context.user.id, "tailoredResumesUsed", context.plan)
  if (!reservation.ok) {
    logger.warn("api.tailored-resumes", "Monthly tailored-resume limit reached", {
      userId: context.user.id,
      plan: context.plan,
      used: reservation.usage.tailoredResumesUsed,
      limit: reservation.limit,
    })
    return jsonError(reservation.message, 402, "usage_limit", {
      limit: reservation.limit,
      usage: reservation.usage.tailoredResumesUsed,
      upgradeRequired: context.plan === "free",
      monthlyCap: reservation.limit,
    })
  }

  try {
    const database = readDatabase()
    const masterResume = getActiveMasterResume(context.user.id)

    if (!masterResume) {
      refundUsage(context.user.id, "tailoredResumesUsed")
      return jsonError("Upload and parse a master resume before tailoring.", 409, "master_resume_required")
    }

    const jobDescription = database.jobDescriptions.find(
      (item) => item.id === jobDescriptionId && item.userId === context.user.id
    )

    if (!jobDescription) {
      refundUsage(context.user.id, "tailoredResumesUsed")
      return jsonError("Job description analysis not found.", 404, "not_found")
    }

    const generated = generateTailoredResume({
      masterResume,
      analysis: jobDescription.analysis,
      confirmedSkills,
    })

    // LLM tailoring overlay — when OPENAI_API_KEY is configured, ask an LLM
    // to reword the summary + bullets to better match the JD while keeping
    // the heuristic-built structure intact. Failures here are silent; the
    // heuristic output is the safe baseline.
    if (isLlmTailorConfigured()) {
      const supportedSkills = new Set<string>()
      Object.values(masterResume.structuredProfile.skills).forEach((list) =>
        list.forEach((skill) => supportedSkills.add(skill)),
      )
      confirmedSkills.forEach((skill) => supportedSkills.add(skill))

      const overlay = await tailorResumeWithLLM({
        // The tailoring engine builds resumeJson by stripping a few
        // structured-profile fields not needed for the on-page editor; for
        // the LLM call we pass the master's full profile to ensure the model
        // gets all signals (skills + links).
        profile: {
          ...masterResume.structuredProfile,
          summary: generated.resumeJson.summary,
          skills: generated.resumeJson.skills,
          workExperience: generated.resumeJson.workExperience,
          projects: generated.resumeJson.projects,
          education: generated.resumeJson.education,
          certifications: generated.resumeJson.certifications,
        },
        analysis: jobDescription.analysis,
        confirmedSkills,
        supportedSkills: Array.from(supportedSkills),
      })

      if (overlay) {
        generated.resumeJson.summary = overlay.summary
        overlay.experience.forEach((entry, index) => {
          const target = generated.resumeJson.workExperience[index]
          if (!target) return
          // Preserve original metadata; only swap bullets (already coerced to
          // the original count) and accept the title/company echo for safety.
          if (entry.bullets?.length === target.bullets.length) {
            target.bullets = entry.bullets
          }
        })
        overlay.projects.forEach((entry, index) => {
          const target = generated.resumeJson.projects[index]
          if (!target) return
          if (entry.description) target.description = entry.description
          if (entry.bullets?.length === target.bullets.length) {
            target.bullets = entry.bullets
          }
        })
        overlay.notes.forEach((note) => {
          generated.changeLog.push({
            id: createId(),
            label: "reworded_from_existing",
            section: "LLM rewrite",
            reason: note,
          })
        })
        logger.info("api.tailored-resumes", "LLM overlay applied", {
          userId: context.user.id,
          notes: overlay.notes.length,
        })
      }
    }
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
    logger.info("api.tailored-resumes", "Tailored resume created", {
      userId: context.user.id,
      plan: context.plan,
      tailoredUsed: reservation.usage.tailoredResumesUsed + 1,
      monthlyLimit: reservation.limit,
    })

    return jsonOk({
      tailoredResume,
      application,
      usage: reservation.usage,
      monthlyLimit: reservation.limit,
    })
  } catch (error) {
    refundUsage(context.user.id, "tailoredResumesUsed")
    throw error
  }
}
