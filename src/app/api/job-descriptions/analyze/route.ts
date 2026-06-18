import type { NextRequest } from "next/server"
import { createId, getActiveMasterResume, nowIso, saveJobDescription } from "@/lib/database"
import { assertUsageAvailable, incrementUsage, jsonError, jsonOk, requireApiUser, readJson } from "@/lib/http"
import { analyzeJobDescription, buildKeywordCoverage, scoreResumeAgainstJob } from "@/lib/resume-engine"
import type { JobDescription } from "@/lib/rolefit-types"

export const runtime = "nodejs"

type AnalyzeBody = {
  companyName?: string
  jobTitle?: string
  jobUrl?: string
  rawText?: string
}

export async function POST(request: NextRequest) {
  const context = requireApiUser(request)
  if (context instanceof Response) return context

  const usageCheck = assertUsageAvailable(context.user.id, "jdScansUsed", context.plan)
  if (!usageCheck.allowed) {
    return jsonError(usageCheck.message, 402, "usage_limit", {
      limit: usageCheck.limit,
      usage: usageCheck.usage.jdScansUsed,
      upgradeRequired: context.plan === "free",
    })
  }

  const body = await readJson<AnalyzeBody>(request)
  const rawText = body?.rawText?.trim() ?? ""

  if (rawText.length < 80) {
    return jsonError("Paste the full job description before analysis.", 422, "validation_error")
  }

  const analysis = analyzeJobDescription({
    rawText,
    companyName: body?.companyName,
    jobTitle: body?.jobTitle,
    jobUrl: body?.jobUrl,
  })
  const jobDescription: JobDescription = {
    id: createId(),
    userId: context.user.id,
    companyName: body?.companyName?.trim() || analysis.companyName,
    jobTitle: body?.jobTitle?.trim() || analysis.jobTitle,
    jobUrl: body?.jobUrl?.trim() || "",
    rawText,
    analysis,
    createdAt: nowIso(),
  }
  const masterResume = getActiveMasterResume(context.user.id)
  const score = masterResume
    ? scoreResumeAgainstJob(masterResume.parsedText, masterResume.structuredProfile, analysis)
    : null
  const keywordCoverage = masterResume ? buildKeywordCoverage(masterResume.parsedText, analysis) : []

  saveJobDescription(jobDescription)
  incrementUsage(context.user.id, "jdScansUsed")

  return jsonOk({
    jobDescription,
    score,
    keywordCoverage,
    requiresMasterResume: !masterResume,
  })
}
