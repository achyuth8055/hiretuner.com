import { hashPassword, createSessionForUser } from "@/lib/auth"
import {
  createId,
  findUserByEmail,
  insertUser,
  nowIso,
  updateDatabase,
  upsertUsageForUser,
} from "@/lib/database"
import { isFirebaseAdminEnabled, verifyIdToken } from "@/lib/firebase-admin"
import { jsonError, jsonOk, readJson } from "@/lib/http"
import { logger } from "@/lib/logger"
import type { Session, Subscription, User } from "@/lib/rolefit-types"

export const runtime = "nodejs"

type ExchangeBody = {
  idToken?: string
}

/**
 * Exchange a Firebase Auth ID token for a HireTuner session cookie.
 *
 * Bridges Firebase Auth (used for Google sign-in and for the Chrome extension)
 * into the rest of the app, which is already built around our HMAC-signed
 * session cookie + Postgres-shaped JSON store.
 */
export async function POST(request: Request) {
  if (!isFirebaseAdminEnabled()) {
    return jsonError(
      "Firebase is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.",
      501,
      "firebase_not_configured",
    )
  }

  // Token can come from JSON body or Authorization: Bearer <token>.
  const authHeader = request.headers.get("authorization") ?? ""
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null
  const body = await readJson<ExchangeBody>(request)
  const idToken = body?.idToken ?? bearer

  if (!idToken) {
    return jsonError("idToken is required.", 422, "validation_error")
  }

  const decoded = await verifyIdToken(idToken)
  if (!decoded) {
    return jsonError("Invalid or expired Firebase ID token.", 401, "invalid_token")
  }

  const email = decoded.email?.toLowerCase().trim() ?? ""
  if (!email) {
    return jsonError("Token is missing an email claim.", 422, "validation_error")
  }

  // Require the auth provider to have verified the email. Without this, an
  // attacker who can mint a Firebase Email/Password token for an arbitrary
  // address could take over an existing HireTuner account that uses the same
  // email. Google sign-in always verifies; password sign-in may not.
  if (decoded.email_verified !== true) {
    logger.warn("api.auth.firebase", "Rejected unverified email token", {
      email,
      provider: decoded.firebase?.sign_in_provider,
    })
    return jsonError(
      "Email is not verified by your sign-in provider. Verify your email and try again.",
      403,
      "email_not_verified",
    )
  }

  const name =
    (decoded.name as string | undefined)?.trim() ||
    email.split("@")[0] ||
    "HireTuner User"
  const photoUrl =
    (decoded.picture as string | undefined)?.trim() || null

  // Upsert user - match on email so an account can have multiple sign-in methods.
  let user = findUserByEmail(email)
  if (!user) {
    // No usable password since this is OAuth - store a random scrypt hash so the
    // password-based login path can never accidentally accept this user.
    const passwordHash = await hashPassword(`firebase:${decoded.uid}:${createId()}`)
    const timestamp = nowIso()
    user = {
      id: createId(),
      name,
      email,
      passwordHash,
      authProvider: "google",
      // Google has already verified this email — we required
      // decoded.email_verified above. Skip the verification round-trip.
      emailVerifiedAt: timestamp,
      photoUrl,
      createdAt: timestamp,
      updatedAt: timestamp,
    } satisfies User

    const subscription: Subscription = {
      id: createId(),
      userId: user.id,
      planType: "free",
      status: "free",
      billingInterval: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    const session: Session = {
      id: createId(),
      userId: user.id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
      createdAt: timestamp,
    }

    insertUser(user, subscription, session)
    upsertUsageForUser(user.id)
    logger.info("api.auth.firebase", "Created user from Firebase token", {
      userId: user.id,
      email,
    })
  } else {
    // Keep the display name + photo in sync if Google changed them, and mark
    // email as verified the first time the user signs in via Google (Firebase
    // already enforced email_verified above).
    const shouldUpdateName = user.name !== name
    const shouldUpdatePhoto = photoUrl !== null && user.photoUrl !== photoUrl
    const shouldVerifyEmail = !user.emailVerifiedAt
    if (shouldUpdateName || shouldUpdatePhoto || shouldVerifyEmail) {
      const updated: User = {
        ...user,
        name: shouldUpdateName ? name : user.name,
        photoUrl: shouldUpdatePhoto ? photoUrl : user.photoUrl,
        emailVerifiedAt: shouldVerifyEmail ? nowIso() : user.emailVerifiedAt,
        updatedAt: nowIso(),
      }
      updateDatabase((database) => {
        const idx = database.users.findIndex((item) => item.id === updated.id)
        if (idx >= 0) database.users[idx] = updated
      })
      user = updated
    }
    upsertUsageForUser(user.id)
  }

  await createSessionForUser(user.id, {
    userAgent: request.headers.get("user-agent"),
    ip: request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? null,
  })
  return jsonOk({
    user: { id: user.id, name: user.name, email: user.email },
    firebaseUid: decoded.uid,
  })
}
