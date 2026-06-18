import "server-only"

import { FieldValue } from "firebase-admin/firestore"
import { getFirebaseFirestore, isFirebaseAdminEnabled } from "@/lib/firebase-admin"
import type { Subscription, User } from "@/lib/rolefit-types"

/**
 * Firestore mirror of the JSON user/subscription store.
 *
 * When isFirestoreEnabled() returns true, mutating helpers below should be
 * called *in addition to* the existing JSON store mutations so reads can keep
 * working in either environment. The JSON store remains the source of truth
 * for local dev; Firestore becomes the source of truth in production.
 *
 * This module intentionally exports only narrow upsert helpers - we don't
 * replace the entire data layer in one shot to keep blast radius small.
 */

const USERS_COLLECTION = "users"
const SUBSCRIPTIONS_COLLECTION = "subscriptions"
const SESSIONS_COLLECTION = "sessions"
const USAGES_COLLECTION = "usages"

export function isFirestoreEnabled() {
  return isFirebaseAdminEnabled() && getFirebaseFirestore() !== null
}

export async function upsertUserDocument(user: User) {
  const firestore = getFirebaseFirestore()
  if (!firestore) return
  await firestore.collection(USERS_COLLECTION).doc(user.id).set(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      authProvider: user.authProvider,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      // Never write passwordHash to Firestore - auth is handled by Firebase Auth
      // for OAuth users and by our own scrypt for email/password users.
      hasPassword: Boolean(user.passwordHash),
    },
    { merge: true },
  )
}

export async function upsertSubscriptionDocument(subscription: Subscription) {
  const firestore = getFirebaseFirestore()
  if (!firestore) return
  await firestore
    .collection(SUBSCRIPTIONS_COLLECTION)
    .doc(subscription.id)
    .set(
      {
        ...subscription,
        updatedAt: subscription.updatedAt,
      },
      { merge: true },
    )
}

export async function recordSessionDocument(
  sessionId: string,
  userId: string,
  expiresAt: string,
) {
  const firestore = getFirebaseFirestore()
  if (!firestore) return
  await firestore.collection(SESSIONS_COLLECTION).doc(sessionId).set({
    userId,
    expiresAt,
    createdAt: FieldValue.serverTimestamp(),
  })
}

export async function incrementUsageCounter(
  userId: string,
  month: string,
  field: keyof Pick<
    {
      jdScansUsed: number
      tailoredResumesUsed: number
      pdfDownloadsUsed: number
      atsChecksUsed: number
      resumeMatchChecksUsed: number
      salaryEstimatesUsed: number
      publicToolUsageUsed: number
    },
    | "jdScansUsed"
    | "tailoredResumesUsed"
    | "pdfDownloadsUsed"
    | "atsChecksUsed"
    | "resumeMatchChecksUsed"
    | "salaryEstimatesUsed"
    | "publicToolUsageUsed"
  >,
) {
  const firestore = getFirebaseFirestore()
  if (!firestore) return
  const docId = `${userId}__${month}`
  await firestore
    .collection(USAGES_COLLECTION)
    .doc(docId)
    .set(
      {
        userId,
        month,
        [field]: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
}
