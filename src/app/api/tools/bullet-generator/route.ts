import type { NextRequest } from "next/server"
import { jsonError, jsonOk, readJson } from "@/lib/http"
import { enforceToolUsage, trackPublicTool } from "@/lib/public-tool-storage"
import { buildBulletSuggestions } from "@/lib/resume-engine"

export const runtime = "nodejs"

type BulletBody = {
  jobTitle?: string
  existingBullet?: string
  toolsUsed?: string
  impactMetric?: string
  targetRole?: string
}

export async function POST(request: NextRequest) {
  const usage = await enforceToolUsage(request, "publicToolUsageUsed")
  if (usage.response) return usage.response

  const body = await readJson<BulletBody>(request)
  const jobTitle = body?.jobTitle?.trim() ?? ""
  const existingBullet = body?.existingBullet?.trim() ?? ""

  if (!jobTitle) return jsonError("Target job title is required.", 422, "validation_error")
  if (existingBullet.length < 10) {
    return jsonError("Paste an existing bullet point to improve.", 422, "validation_error")
  }

  const result = buildBulletSuggestions({
    jobTitle,
    existingBullet,
    toolsUsed: body?.toolsUsed,
    impactMetric: body?.impactMetric,
    targetRole: body?.targetRole,
  })
  const isSignedIn = Boolean(usage.context)
  const responseResult = isSignedIn ? result : { ...result, options: result.options.slice(0, 3), gated: true }

  trackPublicTool(
    {
      userId: usage.context?.user.id ?? null,
      toolType: "bullet-generator",
      inputJson: {
        jobTitle,
        existingBullet,
        toolsUsed: body?.toolsUsed ?? "",
        impactMetric: body?.impactMetric ?? "",
        targetRole: body?.targetRole ?? "",
      },
      resultJson: result,
    },
    usage.context ? "publicToolUsageUsed" : undefined
  )

  return jsonOk({ result: responseResult, fullResultAvailable: isSignedIn })
}
