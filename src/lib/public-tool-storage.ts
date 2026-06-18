import "server-only"

import type { NextRequest } from "next/server"
import { getCurrentUserFromRequest, getCurrentUserFromRequestAsync } from "@/lib/auth"
import { createId, nowIso, savePublicToolResult, saveSalaryEstimate } from "@/lib/database"
import { assertUsageAvailable, incrementUsage, jsonError, resolvePlan } from "@/lib/http"
import { hashInput } from "@/lib/resume-engine"
import type { SalaryEstimate } from "@/lib/rolefit-types"

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
  if (!context) return { context: null, response: null as Response | null }

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
