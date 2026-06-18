import type { NextRequest } from "next/server"
import { jsonError, jsonOk, readJson } from "@/lib/http"
import { enforceToolUsage, trackPublicTool } from "@/lib/public-tool-storage"
import { buildSummarySuggestions } from "@/lib/resume-engine"

export const runtime = "nodejs"

type SummaryBody = {
  targetRole?: string
  yearsExperience?: string
  topSkills?: string
  industry?: string
  jobDescription?: string
}

export async function POST(request: NextRequest) {
  const usage = await enforceToolUsage(request, "publicToolUsageUsed")
  if (usage.response) return usage.response

  const body = await readJson<SummaryBody>(request)

  if (!body?.targetRole?.trim()) {
    return jsonError("Target role is required.", 422, "validation_error")
  }
  if (!body?.topSkills?.trim()) {
    return jsonError("Add at least one top skill.", 422, "validation_error")
  }

  const result = buildSummarySuggestions({
    targetRole: body.targetRole,
    yearsExperience: body.yearsExperience || "relevant",
    topSkills: body.topSkills,
    industry: body.industry,
    jobDescription: body.jobDescription,
  })

  trackPublicTool(
    {
      userId: usage.context?.user.id ?? null,
      toolType: "summary-generator",
      inputJson: {
        targetRole: body.targetRole,
        yearsExperience: body.yearsExperience ?? "",
        topSkills: body.topSkills,
        industry: body.industry ?? "",
        jobDescription: body.jobDescription ?? "",
      },
      resultJson: result,
    },
    usage.context ? "publicToolUsageUsed" : undefined
  )

  return jsonOk({ result, fullResultAvailable: Boolean(usage.context) })
}
