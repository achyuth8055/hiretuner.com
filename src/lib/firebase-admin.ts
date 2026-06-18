import "server-only"

import { cert, getApp, getApps, initializeApp, type App, type ServiceAccount } from "firebase-admin/app"
import { getAuth, type Auth } from "firebase-admin/auth"
import { getFirestore, type Firestore } from "firebase-admin/firestore"
import { getStorage, type Storage } from "firebase-admin/storage"

/**
 * Lazy Firebase Admin SDK init.
 *
 * Requires three envs to be populated:
 *  - FIREBASE_PROJECT_ID
 *  - FIREBASE_CLIENT_EMAIL
 *  - FIREBASE_PRIVATE_KEY (PEM, newlines may be escaped as \n)
 *
 * Optionally: FIREBASE_STORAGE_BUCKET (e.g. "hiretuner.appspot.com")
 *
 * When credentials are missing, isFirebaseAdminEnabled() returns false and
 * callers should fall back to local behavior (the JSON-file user store).
 */

const APP_NAME = "hiretuner-admin"

let cachedApp: App | null = null

function getServiceAccount(): ServiceAccount | null {
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const rawKey = process.env.FIREBASE_PRIVATE_KEY

  if (!projectId || !clientEmail || !rawKey) return null
  if ([projectId, clientEmail, rawKey].some((value) => value.includes("replace"))) return null

  // Vercel-style env stores newlines as the literal two characters `\n`.
  const privateKey = rawKey.includes("\\n") ? rawKey.replace(/\\n/g, "\n") : rawKey

  return { projectId, clientEmail, privateKey }
}

export function isFirebaseAdminEnabled() {
  return getServiceAccount() !== null
}

export function getFirebaseApp(): App | null {
  if (!isFirebaseAdminEnabled()) return null
  if (cachedApp) return cachedApp

  const existing = getApps().find((app) => app.name === APP_NAME)
  if (existing) {
    cachedApp = existing
    return existing
  }

  try {
    cachedApp = initializeApp(
      {
        credential: cert(getServiceAccount()!),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      },
      APP_NAME,
    )
  } catch {
    // Re-use any concurrent init that beat us to it.
    cachedApp = getApp(APP_NAME)
  }

  return cachedApp
}

export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp()
  return app ? getAuth(app) : null
}

export function getFirebaseFirestore(): Firestore | null {
  const app = getFirebaseApp()
  return app ? getFirestore(app) : null
}

export function getFirebaseStorage(): Storage | null {
  const app = getFirebaseApp()
  return app ? getStorage(app) : null
}

/**
 * Verify a Firebase Auth ID token (typically from an Authorization: Bearer header).
 * Returns the decoded token or null when the SDK isn't configured / token is invalid.
 */
export async function verifyIdToken(idToken: string) {
  const auth = getFirebaseAuth()
  if (!auth) return null
  try {
    return await auth.verifyIdToken(idToken, true)
  } catch {
    return null
  }
}
