import { cookies } from "next/headers"
import {
  SESSION_COOKIE,
  getCurrentUser,
  listSessionsForUser,
  revokeOtherSessions,
  revokeSessionById,
} from "@/lib/auth"
import { jsonError, jsonOk, readJson } from "@/lib/http"
import { csrfCheck } from "@/lib/csrf"
import { logger } from "@/lib/logger"

export const runtime = "nodejs"

/**
 * GET — list this user's active sessions. The raw session token is never
 * returned; we only show enough metadata to recognize the device.
 */
export async function GET() {
  const auth = await getCurrentUser()
  if (!auth) return jsonError("Authentication is required.", 401, "unauthorized")

  const cookieStore = await cookies()
  const currentSessionId = parseSessionIdFromCookie(cookieStore.get(SESSION_COOKIE)?.value)
  const sessions = listSessionsForUser(auth.user.id).map((session) => ({
    id: session.id,
    current: session.id === currentSessionId,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    lastSeenAt: session.lastSeenAt ?? session.createdAt,
    userAgent: session.userAgent ?? "",
    // We deliberately don't surface the raw IP — only show "(this device)" /
    // "(other)" via the `current` flag so a session list leak doesn't reveal
    // home IPs.
  }))
  return jsonOk({ sessions })
}

/**
 * DELETE — revoke either a specific session (by id) or all other sessions
 * for this user. Body: { sessionId?: string, others?: true }
 */
type DeleteBody = {
  sessionId?: string
  others?: boolean
}

export async function DELETE(request: Request) {
  const csrfFail = csrfCheck(request)
  if (csrfFail) return csrfFail

  const auth = await getCurrentUser()
  if (!auth) return jsonError("Authentication is required.", 401, "unauthorized")

  const body = await readJson<DeleteBody>(request)
  const cookieStore = await cookies()
  const currentSessionId = parseSessionIdFromCookie(cookieStore.get(SESSION_COOKIE)?.value)
  if (!currentSessionId) {
    return jsonError("Current session could not be identified.", 400, "invalid_session")
  }

  if (body?.others) {
    revokeOtherSessions(auth.user.id, currentSessionId)
    logger.info("api.auth.sessions", "Revoked all other sessions", { userId: auth.user.id })
    return jsonOk({ revoked: "others" })
  }

  if (body?.sessionId) {
    if (body.sessionId === currentSessionId) {
      return jsonError(
        "Use POST /api/auth/logout to end the current session.",
        400,
        "use_logout",
      )
    }
    // Only revoke sessions belonging to this user — listSessionsForUser
    // confirms ownership.
    const owns = listSessionsForUser(auth.user.id).some((s) => s.id === body.sessionId)
    if (!owns) return jsonError("Session not found.", 404, "not_found")
    revokeSessionById(body.sessionId)
    logger.info("api.auth.sessions", "Revoked specific session", {
      userId: auth.user.id,
    })
    return jsonOk({ revoked: body.sessionId })
  }

  return jsonError("Pass either sessionId or others=true.", 422, "validation_error")
}

function parseSessionIdFromCookie(value: string | undefined): string | null {
  if (!value) return null
  const [sessionId] = value.split(".")
  return sessionId || null
}
