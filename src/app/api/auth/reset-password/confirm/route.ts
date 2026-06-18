import { createHash } from "node:crypto"
import { hashPassword, validatePassword } from "@/lib/auth"
import { nowIso, updateDatabase } from "@/lib/database"
import { jsonError, jsonOk, readJson } from "@/lib/http"

export const runtime = "nodejs"

type ConfirmResetBody = {
  token?: string
  password?: string
}

export async function POST(request: Request) {
  const body = await readJson<ConfirmResetBody>(request)
  const token = body?.token ?? ""
  const password = body?.password ?? ""
  const passwordErrors = validatePassword(password)

  if (!token) return jsonError("Reset token is required.", 422, "validation_error")
  if (passwordErrors.length > 0) {
    return jsonError("Password does not meet requirements.", 422, "validation_error", passwordErrors)
  }

  const tokenHash = createHash("sha256").update(token).digest("hex")
  const passwordHash = await hashPassword(password)
  const updated = updateDatabase((database) => {
    const resetToken = database.passwordResetTokens.find(
      (item) =>
        item.tokenHash === tokenHash &&
        !item.usedAt &&
        new Date(item.expiresAt).getTime() > Date.now()
    )

    if (!resetToken) return false

    const user = database.users.find((item) => item.id === resetToken.userId)
    if (!user) return false

    user.passwordHash = passwordHash
    user.updatedAt = nowIso()
    resetToken.usedAt = nowIso()
    database.sessions = database.sessions.filter((session) => session.userId !== user.id)
    return true
  })

  if (!updated) {
    return jsonError("Reset token is invalid or expired.", 400, "invalid_reset_token")
  }

  return jsonOk({ passwordReset: true })
}
