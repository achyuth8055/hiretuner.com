import type { NextRequest } from "next/server"
import { nowIso, readDatabase, updateDatabase } from "@/lib/database"
import { jsonError, jsonOk, requireApiUser, readJson } from "@/lib/http"
import { renderResumeText } from "@/lib/resume-engine"
import type { TailoredResumeJson } from "@/lib/rolefit-types"

export const runtime = "nodejs"

type UpdateTailoredResumeBody = {
  resumeJson?: TailoredResumeJson
  resumeText?: string
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const userContext = requireApiUser(request)
  if (userContext instanceof Response) return userContext

  const { id } = await context.params
  const database = readDatabase()
  const tailoredResume = database.tailoredResumes.find(
    (resume) => resume.id === id && resume.userId === userContext.user.id
  )

  if (!tailoredResume) return jsonError("Tailored resume not found.", 404, "not_found")

  const jobDescription = database.jobDescriptions.find((item) => item.id === tailoredResume.jobDescriptionId)
  const application = database.applications.find((item) => item.tailoredResumeId === tailoredResume.id)

  return jsonOk({ tailoredResume, jobDescription, application })
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const userContext = requireApiUser(request)
  if (userContext instanceof Response) return userContext

  const { id } = await context.params
  const body = await readJson<UpdateTailoredResumeBody>(request)
  const updated = updateDatabase((database) => {
    const tailoredResume = database.tailoredResumes.find(
      (resume) => resume.id === id && resume.userId === userContext.user.id
    )

    if (!tailoredResume) return null

    if (body?.resumeJson) {
      tailoredResume.resumeJson = body.resumeJson
      tailoredResume.resumeText = renderResumeText(body.resumeJson)
    }

    if (body?.resumeText?.trim()) {
      tailoredResume.resumeText = body.resumeText.trim()
    }

    tailoredResume.updatedAt = nowIso()
    return tailoredResume
  })

  if (!updated) return jsonError("Tailored resume not found.", 404, "not_found")

  return jsonOk({ tailoredResume: updated })
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const userContext = requireApiUser(request)
  if (userContext instanceof Response) return userContext

  const { id } = await context.params
  const deleted = updateDatabase((database) => {
    const owned = database.tailoredResumes.some(
      (resume) => resume.id === id && resume.userId === userContext.user.id
    )
    if (!owned) return false

    database.applications = database.applications.filter((item) => item.tailoredResumeId !== id)
    database.tailoredResumes = database.tailoredResumes.filter((item) => item.id !== id)
    return true
  })

  if (!deleted) return jsonError("Tailored resume not found.", 404, "not_found")

  return jsonOk({ deleted: true })
}
