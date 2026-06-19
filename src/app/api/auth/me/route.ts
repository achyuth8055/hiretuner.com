import { cookies } from "next/headers"
import { SESSION_COOKIE, getCurrentUser } from "@/lib/auth"
import { getDashboardData } from "@/lib/database"
import { jsonError, jsonOk, resolvePlan } from "@/lib/http"
import { PLAN_LIMITS } from "@/lib/rolefit-types"

export const runtime = "nodejs"

// Tiny in-process cache (AUTH-L3). Every page render in the dashboard fires
// /api/auth/me as the auth-state check — without a cache we hit the JSON
// store twice per render (auth + dashboard). 15-second TTL is short enough
// that subscription / quota changes still show up promptly; long enough to
// kill the per-nav DB round-trip cost.
const ME_CACHE_TTL_MS = 15_000

type CachedResponse = {
  expiresAt: number
  body: unknown
}
const cache = new Map<string, CachedResponse>()
let lastPruneAt = 0

function pruneCache(now: number) {
  if (now - lastPruneAt < 30_000) return
  lastPruneAt = now
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(key)
  }
}

export async function GET() {
  const cookieStore = await cookies()
  const cookieValue = cookieStore.get(SESSION_COOKIE)?.value
  const cacheKey = cookieValue ?? ""
  const now = Date.now()
  pruneCache(now)

  const cached = cache.get(cacheKey)
  if (cached && cached.expiresAt > now) {
    return jsonOk(cached.body)
  }

  const auth = await getCurrentUser()
  if (!auth) {
    return jsonError("Authentication is required.", 401, "unauthorized")
  }

  const plan = resolvePlan(auth.subscription)
  const dashboard = getDashboardData(auth.user.id)

  const body = {
    user: { id: auth.user.id, name: auth.user.name, email: auth.user.email },
    subscription: auth.subscription,
    plan,
    limits: PLAN_LIMITS[plan],
    dashboard,
  }
  cache.set(cacheKey, { expiresAt: now + ME_CACHE_TTL_MS, body })
  return jsonOk(body)
}
