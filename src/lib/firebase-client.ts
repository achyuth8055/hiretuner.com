"use client"

import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app"
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth"

/**
 * Client-side Firebase SDK init. Reads NEXT_PUBLIC_FIREBASE_* envs so the values
 * are bundled into the browser code. Never put admin / service-account secrets here.
 */

let cachedApp: FirebaseApp | null = null

function getFirebaseOptions(): FirebaseOptions | null {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID

  if (!apiKey || !authDomain || !projectId || !appId) return null
  if ([apiKey, authDomain, projectId, appId].some((value) => value.includes("replace"))) return null

  return {
    apiKey,
    authDomain,
    projectId,
    appId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  }
}

export function isFirebaseClientEnabled() {
  return getFirebaseOptions() !== null
}

export function getFirebaseApp(): FirebaseApp | null {
  const options = getFirebaseOptions()
  if (!options) return null

  if (cachedApp) return cachedApp
  cachedApp = getApps()[0] ?? initializeApp(options)
  return cachedApp
}

export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp()
  return app ? getAuth(app) : null
}

export function buildGoogleProvider() {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: "select_account" })
  provider.addScope("email")
  provider.addScope("profile")
  return provider
}

// Re-export for callers that want the underlying APIs directly.
export { GoogleAuthProvider, getApp }
