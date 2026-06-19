import { jsonError, jsonOk, readJson } from "@/lib/http"
import { logger } from "@/lib/logger"
import {
  getFirebaseAuth,
  isFirebaseAdminEnabled,
  verifyIdToken,
} from "@/lib/firebase-admin"
import { ipFromRequest, rateLimit, rateLimitedResponse } from "@/lib/rate-limit"

export const runtime = "nodejs"

// The Chrome extension caches a Firebase ID token after the website bridge
// flow signs the user in. Firebase tokens expire after 60 minutes. The
// extension can't refresh on its own — the Web SDK never received the
// credential (the bridge flow signed in on the website's origin).
//
// This route accepts a still-valid (≥0s remaining) Firebase ID token from the
// extension, verifies it via Firebase Admin, and mints a fresh ID token for
// the same UID by way of `createCustomToken` → secure exchange. We return the
// CUSTOM TOKEN so the extension can call
// signInWithCustomToken(auth, customToken) → getIdToken() and continue without
// a user-visible re-sign-in.
//
// If the cached token is already expired, the extension must fall back to
// the interactive bridge flow.

const REFRESH_PER_IP_LIMIT = 60
const REFRESH_PER_IP_WINDOW_SEC = 60 * 60

type RefreshBody = {
  idToken?: string
}

export async function POST(request: Request) {
  if (!isFirebaseAdminEnabled()) {
    return jsonError(
      "Firebase Admin is not configured on this deployment.",
      501,
      "firebase_not_configured",
    )
  }

  const ip = ipFromRequest(request)
  const gate = rateLimit(`firebase-refresh:${ip}`, REFRESH_PER_IP_LIMIT, REFRESH_PER_IP_WINDOW_SEC)
  if (!gate.ok) return rateLimitedResponse(gate, "Too many refresh attempts. Try again later.")

  const body = await readJson<RefreshBody>(request)
  const idToken = body?.idToken?.trim()
  if (!idToken) {
    return jsonError("idToken is required.", 422, "validation_error")
  }

  const decoded = await verifyIdToken(idToken)
  if (!decoded?.uid) {
    return jsonError(
      "The cached token is invalid or expired — please sign in again.",
      401,
      "invalid_token",
    )
  }

  if (decoded.email_verified !== true) {
    return jsonError(
      "Email is not verified by your auth provider.",
      403,
      "email_not_verified",
    )
  }

  const auth = getFirebaseAuth()
  if (!auth) {
    return jsonError(
      "Firebase Admin is not configured on this deployment.",
      501,
      "firebase_not_configured",
    )
  }

  try {
    const customToken = await auth.createCustomToken(decoded.uid)
    logger.info("api.auth.firebase.refresh", "Issued custom token", {
      uid: decoded.uid,
      email: decoded.email,
    })
    return jsonOk({ customToken, expiresInSeconds: 3600 })
  } catch (error) {
    logger.error("api.auth.firebase.refresh", "createCustomToken failed", {
      uid: decoded.uid,
      error: error instanceof Error ? error.message : String(error),
    })
    return jsonError(
      "Unable to refresh authentication right now.",
      500,
      "refresh_failed",
    )
  }
}
