import type { NextRequest } from "next/server"
import { readDatabase } from "@/lib/database"
import { jsonError, refundUsage, requireApiUser, reserveUsage } from "@/lib/http"
import { renderTailoredResumePdf } from "@/lib/pdf-renderer"

export const runtime = "nodejs"

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const userContext = requireApiUser(request)
  if (userContext instanceof Response) return userContext

  // Atomic check+increment so concurrent downloads can't exceed the cap.
  const reservation = reserveUsage(userContext.user.id, "pdfDownloadsUsed", userContext.plan)
  if (!reservation.ok) {
    return jsonError(reservation.message, 402, "upgrade_required", {
      limit: reservation.limit,
      usage: reservation.usage.pdfDownloadsUsed,
      upgradeRequired: true,
    })
  }

  try {
    const { id } = await context.params
    const tailoredResume = readDatabase().tailoredResumes.find(
      (resume) => resume.id === id && resume.userId === userContext.user.id
    )

    if (!tailoredResume) {
      refundUsage(userContext.user.id, "pdfDownloadsUsed")
      return jsonError("Tailored resume not found.", 404, "not_found")
    }

    // Renders the chosen template via @react-pdf/renderer when available, or
    // falls back to the legacy single-page Helvetica PDF when the package
    // hasn't been installed yet.
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
    refundUsage(userContext.user.id, "pdfDownloadsUsed")
    throw error
  }
}
