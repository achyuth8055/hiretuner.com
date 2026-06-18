import type { NextRequest } from "next/server"
import { readDatabase } from "@/lib/database"
import { assertUsageAvailable, incrementUsage, jsonError, requireApiUser } from "@/lib/http"
import { buildMinimalPdf } from "@/lib/resume-engine"

export const runtime = "nodejs"

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const userContext = requireApiUser(request)
  if (userContext instanceof Response) return userContext

  const usageCheck = assertUsageAvailable(userContext.user.id, "pdfDownloadsUsed", userContext.plan)
  if (!usageCheck.allowed) {
    return jsonError(usageCheck.message, 402, "upgrade_required", {
      limit: usageCheck.limit,
      usage: usageCheck.usage.pdfDownloadsUsed,
      upgradeRequired: true,
    })
  }

  const { id } = await context.params
  const tailoredResume = readDatabase().tailoredResumes.find(
    (resume) => resume.id === id && resume.userId === userContext.user.id
  )

  if (!tailoredResume) {
    return jsonError("Tailored resume not found.", 404, "not_found")
  }

  incrementUsage(userContext.user.id, "pdfDownloadsUsed")

  const pdf = buildMinimalPdf(tailoredResume.resumeText)
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="rolefit-resume-v${tailoredResume.versionNumber}.pdf"`,
      "Cache-Control": "no-store",
    },
  })
}
