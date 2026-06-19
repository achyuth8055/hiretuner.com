import "server-only"

import type { NextRequest } from "next/server"
import { getCurrentUserFromRequest, getCurrentUserFromRequestAsync } from "@/lib/auth"
import { createId, nowIso, savePublicToolResult, saveSalaryEstimate } from "@/lib/database"
import { assertUsageAvailable, incrementUsage, jsonError, resolvePlan } from "@/lib/http"
import { ipFromRequest, rateLimit, rateLimitedResponse } from "@/lib/rate-limit"
import { hashInput } from "@/lib/resume-engine"
import type { SalaryEstimate } from "@/lib/rolefit-types"

// Anonymous (no session) callers of /api/tools/* used to be entirely
// unbounded — see AUTH_SECURITY_BUGS.md C2. Cap at 20 requests per 15-minute
// window per IP. Authenticated users continue to go through assertUsageAvailable
// against their plan quota, not this limiter.
const ANON_TOOL_LIMIT = 20
const ANON_TOOL_WINDOW_SEC = 15 * 60

export function getOptionalToolUser(request: NextRequest | Request) {
  const auth = getCurrentUserFromRequest(request)
  if (!auth) return null
  return {
    ...auth,
    plan: resolvePlan(auth.subscription),
  }
}

export async function getOptionalToolUserAsync(request: NextRequest | Request) {
  const auth = await getCurrentUserFromRequestAsync(request)
  if (!auth) return null
  return {
    ...auth,
    plan: resolvePlan(auth.subscription),
  }
}

export async function enforceToolUsage(
  request: NextRequest | Request,
  field: "atsChecksUsed" | "resumeMatchChecksUsed" | "salaryEstimatesUsed" | "publicToolUsageUsed"
) {
  const context = await getOptionalToolUserAsync(request)

  if (!context) {
    // Anonymous callers — apply IP-based rate limit. Authenticated users
    // skip this; their plan quota is the gate.
    const ip = ipFromRequest(request)
    const limit = rateLimit(`tool:${ip}`, ANON_TOOL_LIMIT, ANON_TOOL_WINDOW_SEC)
    if (!limit.ok) {
      return {
        context: null,
        response: rateLimitedResponse(
          limit,
          "Free tier limit reached. Sign in for higher quotas or try again later.",
        ),
      }
    }
    return { context: null, response: null as Response | null }
  }

  const usageCheck = assertUsageAvailable(context.user.id, field, context.plan)
  if (!usageCheck.allowed) {
    return {
      context,
      response: jsonError(usageCheck.message, 402, "usage_limit", {
        limit: usageCheck.limit,
        usage: usageCheck.usage[field],
        upgradeRequired: context.plan === "free",
      }),
    }
  }

  return { context, response: null }
}

export function trackPublicTool(
  input: {
    userId: string | null
    toolType: string
    inputJson: Record<string, unknown>
    resultJson: Record<string, unknown>
  },
  usageField?: "atsChecksUsed" | "resumeMatchChecksUsed" | "salaryEstimatesUsed" | "publicToolUsageUsed"
) {
  savePublicToolResult({
    id: createId(),
    userId: input.userId,
    toolType: input.toolType,
    inputHash: hashInput(input.inputJson),
    inputJson: input.inputJson,
    resultJson: input.resultJson,
    createdAt: nowIso(),
  })

  if (input.userId && usageField) {
    incrementUsage(input.userId, usageField)
  }
}

export function trackSalaryEstimate(input: Omit<SalaryEstimate, "id" | "createdAt">) {
  const estimate: SalaryEstimate = {
    ...input,
    id: createId(),
    createdAt: nowIso(),
  }
  saveSalaryEstimate(estimate)
  if (estimate.userId) incrementUsage(estimate.userId, "salaryEstimatesUsed")
  return estimate
}
