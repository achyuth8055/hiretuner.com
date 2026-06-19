import "server-only"

import type { NextRequest } from "next/server"
import { getCurrentUserFromRequest, getCurrentUserFromRequestAsync } from "@/lib/auth"
import { csrfCheck } from "@/lib/csrf"
import {
  currentUsageMonth,
  createId,
  getUsageSnapshotForUser,
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
  // CSRF gate runs first — a cross-site forgery never reads the session.
  const csrfFail = csrfCheck(request)
  if (csrfFail) return csrfFail

  const auth = getCurrentUserFromRequest(request)

  if (!auth) {
    return jsonError("Authentication is required.", 401, "unauthorized")
  }

  const subscription = auth.subscription
  const plan = resolvePlan(subscription)
  // Read-only snapshot in the auth hot path — only write when a route
  // actually counts usage (via reserveUsage / incrementUsage). Closes
  // AUTH-M4 write amplification.
  const usage = getUsageSnapshotForUser(auth.user.id)

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
  // CSRF gate (Bearer-token requests bypass this — see csrfCheck()).
  const csrfFail = csrfCheck(request)
  if (csrfFail) return csrfFail

  const auth = await getCurrentUserFromRequestAsync(request)
  if (!auth) {
    return jsonError("Authentication is required.", 401, "unauthorized")
  }

  const subscription = auth.subscription
  const plan = resolvePlan(subscription)
  // Read-only snapshot — see requireApiUser for rationale.
  const usage = getUsageSnapshotForUser(auth.user.id)

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
  if (subscription.planType === "pro" && ["active", "trialing"].includes(subscription.status)) {
    return "pro"
  }
  return "free"
}

type UsageField =
  | "jdScansUsed"
  | "tailoredResumesUsed"
  | "pdfDownloadsUsed"
  | "atsChecksUsed"
  | "resumeMatchChecksUsed"
  | "salaryEstimatesUsed"
  | "publicToolUsageUsed"

function limitForField(field: UsageField, plan: PlanType): number | null {
  const limits = PLAN_LIMITS[plan]
  const limitByField: Record<UsageField, number | null> = {
    jdScansUsed: limits.jdScans,
    tailoredResumesUsed: limits.tailoredResumes,
    pdfDownloadsUsed: limits.pdfDownloads,
    atsChecksUsed: limits.atsChecks,
    resumeMatchChecksUsed: limits.resumeMatchChecks,
    salaryEstimatesUsed: limits.salaryEstimates,
    publicToolUsageUsed: limits.publicToolUsage,
  }
  let limit = limitByField[field]
  // Hard cap: paid plans top out at PAID_PLAN_MONTHLY_RESUME_LIMIT tailored
  // resumes per month no matter what the plan otherwise says — except Pro,
  // which is unlimited.
  if (
    field === "tailoredResumesUsed" &&
    plan !== "free" &&
    plan !== "pro" &&
    (limit === null || limit > PAID_PLAN_MONTHLY_RESUME_LIMIT)
  ) {
    limit = PAID_PLAN_MONTHLY_RESUME_LIMIT
  }
  return limit
}

function denialMessage(field: UsageField, plan: PlanType): string {
  if (field === "pdfDownloadsUsed") {
    return "PDF downloads require the Starter plan."
  }
  if (field === "tailoredResumesUsed") {
    return plan === "free"
      ? "Free plan allows 1 tailored resume. Upgrade to Starter for 100 per month."
      : `You have reached the ${PAID_PLAN_MONTHLY_RESUME_LIMIT} tailored-resume monthly limit. Resets at the start of next month.`
  }
  return "You have reached the usage limit for your current plan."
}

export function assertUsageAvailable(userId: string, field: UsageField, plan: PlanType) {
  const usage = upsertUsageForUser(userId)
  const limit = limitForField(field, plan)

  if (limit !== null && usage[field] >= limit) {
    return {
      allowed: false as const,
      usage,
      limit,
      message: denialMessage(field, plan),
    }
  }

  return {
    allowed: true as const,
    usage,
    limit,
  }
}

/**
 * Atomic check-and-increment. Closes AUTH-H2 (TOCTOU) by performing the
 * cap test and the counter increment inside a single `updateDatabase` call.
 * JavaScript is single-threaded — no other request can interleave between
 * the two steps inside the same mutator function.
 *
 * Use this in place of `assertUsageAvailable + incrementUsage` for any quota
 * that must not be exceeded under concurrent load.
 */
export function reserveUsage(userId: string, field: UsageField, plan: PlanType) {
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

    const limit = limitForField(field, plan)
    if (limit !== null && usage[field] >= limit) {
      return {
        ok: false as const,
        usage,
        limit,
        message: denialMessage(field, plan),
      }
    }

    usage[field] += 1
    usage.updatedAt = new Date().toISOString()
    return { ok: true as const, usage, limit }
  })
}

/**
 * Refund a usage reservation, e.g. when the work after `reserveUsage`
 * threw and the user shouldn't be charged. Decrements down to zero only.
 */
export function refundUsage(userId: string, field: UsageField) {
  updateDatabase((database) => {
    const month = currentUsageMonth()
    const usage = database.usages.find((item) => item.userId === userId && item.month === month)
    if (!usage) return
    if (usage[field] > 0) {
      usage[field] -= 1
      usage.updatedAt = new Date().toISOString()
    }
  })
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

export function publicBaseUrl(_request: Request) {
  // NEVER trust the Origin header for building redirect URLs — an attacker can
  // set it. Always use the configured public URL. In local dev, set
  // NEXT_PUBLIC_APP_URL=http://localhost:3000 in .env.
  const url = process.env.NEXT_PUBLIC_APP_URL
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_APP_URL is required so we never trust the Origin header for redirect URLs.",
    )
  }
  return url.replace(/\/$/, "")
}
