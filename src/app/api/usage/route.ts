import type { NextRequest } from "next/server"
import { getDashboardData } from "@/lib/database"
import { jsonOk, requireApiUser, resolvePlan } from "@/lib/http"
import { PAID_PLAN_MONTHLY_RESUME_LIMIT, PLAN_LIMITS } from "@/lib/rolefit-types"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const context = requireApiUser(request)
  if (context instanceof Response) return context

  const plan = resolvePlan(context.subscription)
  const dashboard = getDashboardData(context.user.id)
  const baseLimits = PLAN_LIMITS[plan]
  const tailoredResumeMonthlyCap =
    plan === "free" ? baseLimits.tailoredResumes : PAID_PLAN_MONTHLY_RESUME_LIMIT

  return jsonOk({
    plan,
    limits: { ...baseLimits, tailoredResumes: tailoredResumeMonthlyCap },
    paidPlanMonthlyResumeLimit: PAID_PLAN_MONTHLY_RESUME_LIMIT,
    usage: dashboard.usage,
    subscription: dashboard.subscription,
  })
}
