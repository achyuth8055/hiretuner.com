import type { NextRequest } from "next/server"
import { jsonError, jsonOk, readJson } from "@/lib/http"
import { enforceToolUsage, trackPublicTool } from "@/lib/public-tool-storage"
import { analyzeJobDescription } from "@/lib/resume-engine"

export const runtime = "nodejs"

type JdKeywordsBody = {
  jobDescriptionText?: string
  jobTitle?: string
  companyName?: string
}

export async function POST(request: NextRequest) {
  const usage = await enforceToolUsage(request, "publicToolUsageUsed")
  if (usage.response) return usage.response

  const body = await readJson<JdKeywordsBody>(request)
  const rawText = body?.jobDescriptionText?.trim() ?? ""

  if (rawText.length < 80) {
    return jsonError("Paste the full job description before extracting keywords.", 422, "validation_error")
  }

  const result = analyzeJobDescription({
    rawText,
    jobTitle: body?.jobTitle,
    companyName: body?.companyName,
  })
  const isSignedIn = Boolean(usage.context)
  const responseResult = isSignedIn
    ? result
    : {
        jobTitle: result.jobTitle,
        roleCategory: result.roleCategory,
        experienceLevel: result.experienceLevel,
        requiredSkills: result.requiredSkills.slice(0, 5),
        preferredSkills: result.preferredSkills.slice(0, 3),
        responsibilities: result.responsibilities.slice(0, 3),
        gated: true,
      }

  trackPublicTool(
    {
      userId: usage.context?.user.id ?? null,
      toolType: "jd-keywords",
      inputJson: { rawText, jobTitle: body?.jobTitle ?? "", companyName: body?.companyName ?? "" },
      resultJson: result,
    },
    usage.context ? "publicToolUsageUsed" : undefined
  )

  return jsonOk({ result: responseResult, fullResultAvailable: isSignedIn })
}
