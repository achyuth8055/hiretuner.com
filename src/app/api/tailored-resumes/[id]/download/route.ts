import type { NextRequest } from "next/server"
import { findUserById, readDatabase } from "@/lib/database"
import { verifyDownloadSignature } from "@/lib/download-signatures"
import {
  jsonError,
  refundUsage,
  requireApiUser,
  reserveUsage,
  resolvePlan,
} from "@/lib/http"
import { renderTailoredResumePdf } from "@/lib/pdf-renderer"

export const runtime = "nodejs"

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const url = new URL(request.url)
  const sig = url.searchParams.get("sig")
  const expRaw = url.searchParams.get("exp")
  const signedUid = url.searchParams.get("uid")

  // Two valid auth paths: signed link OR session cookie. Try signed first
  // so a freshly-minted link works in any tab (no session reuse required).
  let authedUserId: string | null = null
  let plan: ReturnType<typeof resolvePlan> = "free"

  if (sig && expRaw && signedUid) {
    const expiresAt = Number(expRaw)
    const valid = verifyDownloadSignature({
      scope: "tailored-resume",
      resourceId: id,
      userId: signedUid,
      expiresAt,
      signature: sig,
    })
    if (valid) {
      const user = findUserById(signedUid)
      if (user) {
        const subscription =
          readDatabase().subscriptions.find((s) => s.userId === user.id) ?? null
        authedUserId = user.id
        plan = resolvePlan(subscription)
      }
    } else {
      return jsonError(
        "Download link is invalid or expired. Open the resume in your dashboard to get a fresh link.",
        403,
        "invalid_signature",
      )
    }
  }

  // Fall back to the session-cookie path when no signed params are present.
  if (!authedUserId) {
    const userContext = requireApiUser(request)
    if (userContext instanceof Response) return userContext
    authedUserId = userContext.user.id
    plan = userContext.plan
  }

  const reservation = reserveUsage(authedUserId, "pdfDownloadsUsed", plan)
  if (!reservation.ok) {
    return jsonError(reservation.message, 402, "upgrade_required", {
      limit: reservation.limit,
      usage: reservation.usage.pdfDownloadsUsed,
      upgradeRequired: true,
    })
  }

  try {
    const tailoredResume = readDatabase().tailoredResumes.find(
      (resume) => resume.id === id && resume.userId === authedUserId,
    )

    if (!tailoredResume) {
      refundUsage(authedUserId, "pdfDownloadsUsed")
      return jsonError("Tailored resume not found.", 404, "not_found")
    }

    const pdf = await renderTailoredResumePdf(tailoredResume)
    const filename = `hiretuner-resume-v${tailoredResume.versionNumber}.pdf`

    return new Response(pdf as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    refundUsage(authedUserId, "pdfDownloadsUsed")
    throw error
  }
}
