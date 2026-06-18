import { createSessionRecord, createUserRecord, hashPassword, setSessionCookie, validateEmail, validatePassword } from "@/lib/auth"
import { findUserByEmail, insertUser, upsertUsageForUser } from "@/lib/database"
import { jsonError, jsonOk, readJson } from "@/lib/http"

export const runtime = "nodejs"

type SignupBody = {
  name?: string
  email?: string
  password?: string
}

export async function POST(request: Request) {
  const body = await readJson<SignupBody>(request)
  const name = body?.name?.trim() ?? ""
  const email = body?.email?.trim().toLowerCase() ?? ""
  const password = body?.password ?? ""

  if (name.length < 2) return jsonError("Name must be at least 2 characters.", 422, "validation_error")
  if (!validateEmail(email)) return jsonError("Enter a valid email address.", 422, "validation_error")

  const passwordErrors = validatePassword(password)
  if (passwordErrors.length > 0) {
    return jsonError("Password does not meet requirements.", 422, "validation_error", passwordErrors)
  }

  if (findUserByEmail(email)) {
    return jsonError("An account with this email already exists.", 409, "email_exists")
  }

  const passwordHash = await hashPassword(password)
  const { user, subscription } = createUserRecord({ name, email, passwordHash })
  const session = createSessionRecord(user.id)

  insertUser(user, subscription, session)
  upsertUsageForUser(user.id)
  await setSessionCookie(session)

  return jsonOk({
    user: { id: user.id, name: user.name, email: user.email },
    subscription,
  })
}
