import type { NextRequest } from "next/server"
import { readDatabase } from "@/lib/database"
import { signDownloadUrl } from "@/lib/download-signatures"
import { jsonError, jsonOk, publicBaseUrl, requireApiUser } from "@/lib/http"

export const runtime = "nodejs"

/**
 * Mint a short-lived, HMAC-signed download URL for a tailored resume
 * (AUTH-M8). The link works without a session cookie for 10 minutes so the
 * user can paste it into a download manager, share with themselves cross-
 * device, etc., but it stops working as soon as the TTL passes.
 *
 * The link still encodes the userId so the download route additionally
 * verifies the requester owns the resource — the signature alone is not
 * sufficient (defense in depth against a leaked AUTH_SECRET).
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const userContext = requireApiUser(request)
  if (userContext instanceof Response) return userContext

  const { id } = await context.params
  const exists = readDatabase().tailoredResumes.some(
    (resume) => resume.id === id && resume.userId === userContext.user.id,
  )
  if (!exists) {
    return jsonError("Tailored resume not found.", 404, "not_found")
  }

  const { sig, expiresAt } = signDownloadUrl("tailored-resume", id, userContext.user.id)
  const baseUrl = publicBaseUrl(request)
  const url = `${baseUrl}/api/tailored-resumes/${id}/download?sig=${sig}&exp=${expiresAt}&uid=${encodeURIComponent(
    userContext.user.id,
  )}`

  return jsonOk({ url, expiresAt })
}
