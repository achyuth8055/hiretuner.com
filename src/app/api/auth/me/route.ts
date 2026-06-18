import { getCurrentUser } from "@/lib/auth"
import { getDashboardData } from "@/lib/database"
import { jsonError, jsonOk, resolvePlan } from "@/lib/http"
import { PLAN_LIMITS } from "@/lib/rolefit-types"

export const runtime = "nodejs"

export async function GET() {
  const auth = await getCurrentUser()

  if (!auth) {
    return jsonError("Authentication is required.", 401, "unauthorized")
  }

  const plan = resolvePlan(auth.subscription)
  const dashboard = getDashboardData(auth.user.id)

  return jsonOk({
    user: { id: auth.user.id, name: auth.user.name, email: auth.user.email },
    subscription: auth.subscription,
    plan,
    limits: PLAN_LIMITS[plan],
    dashboard,
  })
}
