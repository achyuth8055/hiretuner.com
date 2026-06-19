import type { NextRequest } from "next/server"
import { createId, getActiveMasterResume, nowIso, saveJobDescription } from "@/lib/database"
import { jsonError, jsonOk, refundUsage, requireApiUser, readJson, reserveUsage } from "@/lib/http"
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

  // Validate the request body FIRST so an empty/malformed submission never
  // consumes the user's quota. Quota enforcement runs only after we've
  // confirmed the request would actually do work.
  const body = await readJson<AnalyzeBody>(request)
  const rawText = body?.rawText?.trim() ?? ""

  if (rawText.length < 80) {
    return jsonError("Paste the full job description before analysis.", 422, "validation_error")
  }

  // Atomic check+increment closes the TOCTOU race (AUTH-H2). Reservation
  // happens BEFORE the work runs; we refund on caught exception so a real
  // failure doesn't charge the user.
  const reservation = reserveUsage(context.user.id, "jdScansUsed", context.plan)
  if (!reservation.ok) {
    return jsonError(reservation.message, 402, "usage_limit", {
      limit: reservation.limit,
      usage: reservation.usage.jdScansUsed,
      upgradeRequired: context.plan === "free",
    })
  }

  try {
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

    return jsonOk({
      jobDescription,
      score,
      keywordCoverage,
      requiresMasterResume: !masterResume,
    })
  } catch (error) {
    // Refund the reservation so a server-side failure doesn't burn a credit.
    refundUsage(context.user.id, "jdScansUsed")
    throw error
  }
}
