import "server-only"

import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto"
import { promisify } from "node:util"
import { cookies } from "next/headers"
import type { NextRequest } from "next/server"
import {
  createId,
  findUserByEmail,
  getSubscriptionForUser,
  nowIso,
  readDatabase,
  updateDatabase,
} from "@/lib/database"
import type { AuthProvider, Session, Subscription, User } from "@/lib/rolefit-types"

const scrypt = promisify(scryptCallback)

export const SESSION_COOKIE = "rolefit_session"
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

function getAuthSecret() {
  return process.env.AUTH_SECRET || "replace-me-with-a-long-random-auth-secret"
}

function signSessionId(sessionId: string) {
  return createHmac("sha256", getAuthSecret()).update(sessionId).digest("base64url")
}

function serializeSessionToken(sessionId: string) {
  return `${sessionId}.${signSessionId(sessionId)}`
}

function verifySessionToken(token: string | undefined | null) {
  if (!token) return null

  const [sessionId, signature] = token.split(".")
  if (!sessionId || !signature) return null

  const expected = signSessionId(sessionId)
  const actualBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)

  if (actualBuffer.length !== expectedBuffer.length) return null
  if (!timingSafeEqual(actualBuffer, expectedBuffer)) return null

  return sessionId
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url")
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer
  return `scrypt:${salt}:${derivedKey.toString("base64url")}`
}

export async function verifyPassword(password: string, storedHash: string) {
  const [algorithm, salt, key] = storedHash.split(":")
  if (algorithm !== "scrypt" || !salt || !key) return false

  const derivedKey = (await scrypt(password, salt, 64)) as Buffer
  const storedKey = Buffer.from(key, "base64url")

  if (derivedKey.length !== storedKey.length) return false
  return timingSafeEqual(derivedKey, storedKey)
}

export function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase())
}

export function validatePassword(password: string) {
  const errors: string[] = []

  if (password.length < 8) errors.push("Password must be at least 8 characters.")
  if (!/[A-Za-z]/.test(password)) errors.push("Password must include a letter.")
  if (!/[0-9]/.test(password)) errors.push("Password must include a number.")

  return errors
}

export function createUserRecord(input: {
  name: string
  email: string
  passwordHash: string
  authProvider?: AuthProvider
}) {
  const timestamp = nowIso()
  const user: User = {
    id: createId(),
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    passwordHash: input.passwordHash,
    authProvider: input.authProvider ?? "email",
    createdAt: timestamp,
    updatedAt: timestamp,
  }

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

  return { user, subscription }
}

export function createSessionRecord(userId: string): Session {
  const timestamp = nowIso()
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000).toISOString()

  return {
    id: createId(),
    userId,
    expiresAt,
    createdAt: timestamp,
  }
}

export async function setSessionCookie(session: Session) {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, serializeSessionToken(session.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
}

export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

export async function createSessionForUser(userId: string) {
  const session = createSessionRecord(userId)
  updateDatabase((database) => {
    database.sessions = database.sessions.filter(
      (item) => item.userId !== userId || new Date(item.expiresAt).getTime() > Date.now()
    )
    database.sessions.push(session)
  })
  await setSessionCookie(session)
  return session
}

export function getSessionFromToken(token: string | undefined | null) {
  const sessionId = verifySessionToken(token)
  if (!sessionId) return null

  const database = readDatabase()
  const session = database.sessions.find((item) => item.id === sessionId)

  if (!session) return null
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    updateDatabase((draft) => {
      draft.sessions = draft.sessions.filter((item) => item.id !== session.id)
    })
    return null
  }

  return session
}

export async function getCurrentUser() {
  const cookieStore = await cookies()
  const session = getSessionFromToken(cookieStore.get(SESSION_COOKIE)?.value)

  if (!session) return null

  const database = readDatabase()
  const user = database.users.find((item) => item.id === session.userId) ?? null
  if (!user) return null

  return {
    user,
    subscription: getSubscriptionForUser(user.id),
  }
}

export function getCurrentUserFromRequest(request: NextRequest | Request) {
  const token = getCookieFromRequest(request, SESSION_COOKIE)
  const session = getSessionFromToken(token)

  if (!session) return null

  const database = readDatabase()
  const user = database.users.find((item) => item.id === session.userId) ?? null
  if (!user) return null

  return {
    user,
    subscription: database.subscriptions.find((item) => item.userId === user.id) ?? null,
  }
}

/**
 * Async variant that accepts either:
 *  - the existing HMAC-signed session cookie, or
 *  - an `Authorization: Bearer <firebase-id-token>` header verified via Firebase Admin.
 *
 * This is the auth path used by the Chrome extension. Falling back to a Firebase
 * token means the extension can hit any /api route without first round-tripping
 * to /api/auth/firebase to establish a cookie session.
 */
export async function getCurrentUserFromRequestAsync(request: NextRequest | Request) {
  const cookieAuth = getCurrentUserFromRequest(request)
  if (cookieAuth) return cookieAuth

  const authHeader = request.headers.get("authorization") ?? ""
  if (!authHeader.startsWith("Bearer ")) return null
  const idToken = authHeader.slice(7).trim()
  if (!idToken) return null

  const { verifyIdToken } = await import("@/lib/firebase-admin")
  const decoded = await verifyIdToken(idToken)
  if (!decoded?.email) return null

  const email = decoded.email.toLowerCase()
  const database = readDatabase()
  const user = database.users.find((item) => item.email === email) ?? null
  if (!user) return null

  return {
    user,
    subscription: database.subscriptions.find((item) => item.userId === user.id) ?? null,
  }
}

export function getCookieFromRequest(request: NextRequest | Request, name: string) {
  if ("cookies" in request && typeof request.cookies?.get === "function") {
    return request.cookies.get(name)?.value ?? null
  }

  const cookieHeader = request.headers.get("cookie")
  if (!cookieHeader) return null

  const cookiesByName = new Map(
    cookieHeader.split(";").map((cookie) => {
      const [key, ...value] = cookie.trim().split("=")
      return [key, decodeURIComponent(value.join("="))]
    })
  )

  return cookiesByName.get(name) ?? null
}

export async function authenticateEmailPassword(email: string, password: string) {
  const user = findUserByEmail(email)
  if (!user) return null

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) return null

  return user
}

export async function destroyCurrentSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  const sessionId = verifySessionToken(token)

  if (sessionId) {
    updateDatabase((database) => {
      database.sessions = database.sessions.filter((item) => item.id !== sessionId)
    })
  }

  await clearSessionCookie()
}
