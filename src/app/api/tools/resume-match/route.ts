import type { NextRequest } from "next/server"
import { jsonError, jsonOk, readJson } from "@/lib/http"
import { enforceToolUsage, trackPublicTool } from "@/lib/public-tool-storage"
import { buildResumeMatchTool } from "@/lib/resume-engine"

export const runtime = "nodejs"

type ResumeMatchBody = {
  resumeText?: string
  jobDescriptionText?: string
}

export async function POST(request: NextRequest) {
  const usage = await enforceToolUsage(request, "resumeMatchChecksUsed")
  if (usage.response) return usage.response

  const body = await readJson<ResumeMatchBody>(request)
  const resumeText = body?.resumeText?.trim() ?? ""
  const jobDescriptionText = body?.jobDescriptionText?.trim() ?? ""

  if (resumeText.length < 80) {
    return jsonError("Paste enough resume text to compare.", 422, "validation_error")
  }
  if (jobDescriptionText.length < 80) {
    return jsonError("Paste the full job description to compare.", 422, "validation_error")
  }

  const result = buildResumeMatchTool({ resumeText, jobDescriptionText })
  const isSignedIn = Boolean(usage.context)
  const responseResult = isSignedIn
    ? result
    : {
        score: result.score,
        requiredSkillsFound: result.requiredSkillsFound.slice(0, 3),
        requiredSkillsMissing: result.requiredSkillsMissing.slice(0, 3),
        preferredSkillsMissing: result.preferredSkillsMissing.slice(0, 3),
        suggestedImprovements: result.suggestedImprovements.slice(0, 3),
        gated: true,
      }

  trackPublicTool(
    {
      userId: usage.context?.user.id ?? null,
      toolType: "resume-match",
      inputJson: { resumeText, jobDescriptionText },
      resultJson: result,
    },
    usage.context ? "resumeMatchChecksUsed" : undefined
  )

  return jsonOk({ result: responseResult, fullResultAvailable: isSignedIn })
}
