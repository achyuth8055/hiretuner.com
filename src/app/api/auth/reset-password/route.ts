import { createHash, randomBytes } from "node:crypto"
import { findUserByEmail, updateDatabase, createId, nowIso } from "@/lib/database"
import { jsonOk, readJson } from "@/lib/http"

export const runtime = "nodejs"

type ResetBody = {
  email?: string
}

export async function POST(request: Request) {
  const body = await readJson<ResetBody>(request)
  const email = body?.email?.trim().toLowerCase() ?? ""
  const user = email ? findUserByEmail(email) : null
  let devResetToken: string | undefined

  if (user) {
    const token = randomBytes(32).toString("base64url")
    devResetToken = token
    const tokenHash = createHash("sha256").update(token).digest("hex")
    const timestamp = nowIso()

    updateDatabase((database) => {
      database.passwordResetTokens.push({
        id: createId(),
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
        usedAt: null,
        createdAt: timestamp,
      })
    })
  }

  return jsonOk({
    message:
      "If an account exists for that email, password reset instructions will be sent. Configure EMAIL_PROVIDER_API_KEY to send real email.",
    resetToken: process.env.NODE_ENV === "production" ? undefined : devResetToken,
  })
}
