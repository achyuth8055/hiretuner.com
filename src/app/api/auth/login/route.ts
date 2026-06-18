import { authenticateEmailPassword, createSessionForUser, validateEmail } from "@/lib/auth"
import { getSubscriptionForUser, upsertUsageForUser } from "@/lib/database"
import { jsonError, jsonOk, readJson } from "@/lib/http"

export const runtime = "nodejs"

type LoginBody = {
  email?: string
  password?: string
}

export async function POST(request: Request) {
  const body = await readJson<LoginBody>(request)
  const email = body?.email?.trim().toLowerCase() ?? ""
  const password = body?.password ?? ""

  if (!validateEmail(email) || !password) {
    return jsonError("Enter your email and password.", 422, "validation_error")
  }

  const user = await authenticateEmailPassword(email, password)
  if (!user) {
    return jsonError("Invalid email or password.", 401, "invalid_credentials")
  }

  await createSessionForUser(user.id)
  const subscription = getSubscriptionForUser(user.id)
  const usage = upsertUsageForUser(user.id)

  return jsonOk({
    user: { id: user.id, name: user.name, email: user.email },
    subscription,
    usage,
  })
}
