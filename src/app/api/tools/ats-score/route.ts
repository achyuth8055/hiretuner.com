import type { NextRequest } from "next/server"
import { jsonError, jsonOk, readJson } from "@/lib/http"
import { logger } from "@/lib/logger"
import { enforceToolUsage, trackPublicTool } from "@/lib/public-tool-storage"
import { buildAtsScore } from "@/lib/resume-engine"
import { optionalString, requireString, ValidationFailed } from "@/lib/validate"

export const runtime = "nodejs"

type AtsScoreBody = {
  resumeText?: string
  targetRole?: string
}

export function OPTIONS() {
  return new Response(null, { status: 204 })
}

export async function POST(request: NextRequest) {
  const usage = await enforceToolUsage(request, "atsChecksUsed")
  if (usage.response) return usage.response

  const body = await readJson<AtsScoreBody>(request)

  let resumeText: string
  let targetRole: string
  try {
    resumeText = requireString("resumeText", body?.resumeText ?? "", {
      min: 80,
      max: 60000,
    })
    targetRole = optionalString("targetRole", body?.targetRole, { max: 200 })
  } catch (error) {
    if (error instanceof ValidationFailed) {
      return jsonError(error.message, 422, "validation_error", error.errors)
    }
    throw error
  }

  let result
  try {
    result = buildAtsScore({ resumeText, targetRole })
  } catch (error) {
    logger.error("api.ats-score", "Failed to build ATS score", {
      error: error instanceof Error ? error.message : String(error),
    })
    return jsonError("Unable to score resume right now. Try again shortly.", 500, "internal_error")
  }
  const isSignedIn = Boolean(usage.context)
  const responseResult = isSignedIn
    ? result
    : {
        estimatedAtsScore: result.estimatedAtsScore,
        topIssues: result.topIssues.slice(0, 3),
        topRecommendations: result.topRecommendations.slice(0, 3),
        disclaimer: result.disclaimer,
        gated: true,
      }

  trackPublicTool(
    {
      userId: usage.context?.user.id ?? null,
      toolType: "ats-score",
      inputJson: { resumeText, targetRole },
      resultJson: result,
    },
    usage.context ? "atsChecksUsed" : undefined
  )

  return jsonOk({ result: responseResult, fullResultAvailable: isSignedIn })
}
