import "server-only"

import type { NextRequest } from "next/server"
import { getCurrentUserFromRequest, getCurrentUserFromRequestAsync } from "@/lib/auth"
import {
  currentUsageMonth,
  createId,
  updateDatabase,
  upsertUsageForUser,
} from "@/lib/database"
import {
  PAID_PLAN_MONTHLY_RESUME_LIMIT,
  PLAN_LIMITS,
  type PlanType,
  type Subscription,
  type Usage,
  type User,
} from "@/lib/rolefit-types"

export type ApiUserContext = {
  user: User
  subscription: Subscription | null
  plan: PlanType
  usage: Usage
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return Response.json({ ok: true, data }, init)
}

export function jsonError(message: string, status = 400, code = "bad_request", details?: unknown) {
  return Response.json(
    {
      ok: false,
      error: {
        code,
        message,
        details,
      },
    },
    { status }
  )
}

export async function readJson<T = Record<string, unknown>>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T
  } catch {
    return null
  }
}

/**
 * Sync auth check - used by routes that only need the cookie-based session.
 * Prefer `requireApiUserAsync` for new routes so the Chrome extension's
 * Authorization: Bearer flow works automatically.
 */
export function requireApiUser(request: NextRequest | Request): ApiUserContext | Response {
  const auth = getCurrentUserFromRequest(request)

  if (!auth) {
    return jsonError("Authentication is required.", 401, "unauthorized")
  }

  const subscription = auth.subscription
  const plan = resolvePlan(subscription)
  const usage = upsertUsageForUser(auth.user.id)

  return {
    user: auth.user,
    subscription,
    plan,
    usage,
  }
}

/**
 * Async auth check that also accepts a Firebase ID token via Authorization
 * header. This is the path the Chrome extension hits.
 */
export async function requireApiUserAsync(
  request: NextRequest | Request,
): Promise<ApiUserContext | Response> {
  const auth = await getCurrentUserFromRequestAsync(request)
  if (!auth) {
    return jsonError("Authentication is required.", 401, "unauthorized")
  }

  const subscription = auth.subscription
  const plan = resolvePlan(subscription)
  const usage = upsertUsageForUser(auth.user.id)

  return {
    user: auth.user,
    subscription,
    plan,
    usage,
  }
}

export function resolvePlan(subscription: Subscription | null): PlanType {
  if (!subscription) return "free"
  if (subscription.planType === "starter" && ["active", "trialing"].includes(subscription.status)) {
    return "starter"
  }
  if (subscription.planType === "plus" && ["active", "trialing"].includes(subscription.status)) {
    return "plus"
  }
  return "free"
}

export function assertUsageAvailable(
  userId: string,
  field:
    | "jdScansUsed"
    | "tailoredResumesUsed"
    | "pdfDownloadsUsed"
    | "atsChecksUsed"
    | "resumeMatchChecksUsed"
    | "salaryEstimatesUsed"
    | "publicToolUsageUsed",
  plan: PlanType
) {
  const usage = upsertUsageForUser(userId)
  const limits = PLAN_LIMITS[plan]
  const limitByField = {
    jdScansUsed: limits.jdScans,
    tailoredResumesUsed: limits.tailoredResumes,
    pdfDownloadsUsed: limits.pdfDownloads,
    atsChecksUsed: limits.atsChecks,
    resumeMatchChecksUsed: limits.resumeMatchChecks,
    salaryEstimatesUsed: limits.salaryEstimates,
    publicToolUsageUsed: limits.publicToolUsage,
  }
  let limit = limitByField[field]

  // Hard cap: paid plans top out at 100 tailored resumes per month.
  if (
    field === "tailoredResumesUsed" &&
    plan !== "free" &&
    (limit === null || limit > PAID_PLAN_MONTHLY_RESUME_LIMIT)
  ) {
    limit = PAID_PLAN_MONTHLY_RESUME_LIMIT
  }

  if (limit !== null && usage[field] >= limit) {
    let message: string
    if (field === "pdfDownloadsUsed") {
      message = "PDF downloads require the Starter plan."
    } else if (field === "tailoredResumesUsed") {
      message =
        plan === "free"
          ? "Free plan allows 1 tailored resume. Upgrade to Starter for 100 per month."
          : `You have reached the ${PAID_PLAN_MONTHLY_RESUME_LIMIT} tailored-resume monthly limit. Resets at the start of next month.`
    } else {
      message = "You have reached the usage limit for your current plan."
    }
    return {
      allowed: false as const,
      usage,
      limit,
      message,
    }
  }

  return {
    allowed: true as const,
    usage,
    limit,
  }
}

export function incrementUsage(
  userId: string,
  field:
    | "jdScansUsed"
    | "tailoredResumesUsed"
    | "pdfDownloadsUsed"
    | "atsChecksUsed"
    | "resumeMatchChecksUsed"
    | "salaryEstimatesUsed"
    | "publicToolUsageUsed"
) {
  return updateDatabase((database) => {
    const month = currentUsageMonth()
    let usage = database.usages.find((item) => item.userId === userId && item.month === month)

    if (!usage) {
      const timestamp = new Date().toISOString()
      usage = {
        id: createId(),
        userId,
        month,
        jdScansUsed: 0,
        tailoredResumesUsed: 0,
        pdfDownloadsUsed: 0,
        atsChecksUsed: 0,
        resumeMatchChecksUsed: 0,
        salaryEstimatesUsed: 0,
        publicToolUsageUsed: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
      }
      database.usages.push(usage)
    }

    usage[field] += 1
    usage.updatedAt = new Date().toISOString()
    return usage
  })
}

export function publicBaseUrl(request: Request) {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    request.headers.get("origin") ||
    new URL(request.url).origin ||
    "http://localhost:3000"
  )
}
