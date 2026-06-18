import type { NextRequest } from "next/server"
import { jsonError, jsonOk, readJson } from "@/lib/http"
import { enforceToolUsage, trackPublicTool } from "@/lib/public-tool-storage"
import { buildKeywordScan } from "@/lib/resume-engine"

export const runtime = "nodejs"

type KeywordScanBody = {
  resumeText?: string
  targetRole?: string
}

export async function POST(request: NextRequest) {
  const usage = await enforceToolUsage(request, "publicToolUsageUsed")
  if (usage.response) return usage.response

  const body = await readJson<KeywordScanBody>(request)
  const resumeText = body?.resumeText?.trim() ?? ""

  if (resumeText.length < 80) {
    return jsonError("Paste enough resume text to scan keywords.", 422, "validation_error")
  }

  const result = buildKeywordScan({ resumeText, targetRole: body?.targetRole })
  const isSignedIn = Boolean(usage.context)
  const responseResult = isSignedIn
    ? result
    : {
        targetRole: result.targetRole,
        detectedTechnicalSkills: result.detectedTechnicalSkills.slice(0, 8),
        missingCommonKeywords: result.missingCommonKeywords.slice(0, 3),
        weakKeywordAreas: result.weakKeywordAreas.slice(0, 3),
        gated: true,
      }

  trackPublicTool(
    {
      userId: usage.context?.user.id ?? null,
      toolType: "keyword-scan",
      inputJson: { resumeText, targetRole: body?.targetRole ?? "" },
      resultJson: result,
    },
    usage.context ? "publicToolUsageUsed" : undefined
  )

  return jsonOk({ result: responseResult, fullResultAvailable: isSignedIn })
}
