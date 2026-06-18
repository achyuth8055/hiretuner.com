import type { NextRequest } from "next/server"
import { createId, nowIso, readDatabase, updateDatabase } from "@/lib/database"
import { jsonError, jsonOk, requireApiUser, readJson } from "@/lib/http"
import type { Application, ApplicationStatus } from "@/lib/rolefit-types"

export const runtime = "nodejs"

type CreateApplicationBody = {
  tailoredResumeId?: string
  companyName?: string
  jobTitle?: string
  jobUrl?: string
  status?: ApplicationStatus
  notes?: string
  dateApplied?: string | null
}

export async function GET(request: NextRequest) {
  const context = requireApiUser(request)
  if (context instanceof Response) return context

  const applications = readDatabase().applications
    .filter((application) => application.userId === context.user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return jsonOk({ applications })
}

export async function POST(request: NextRequest) {
  const context = requireApiUser(request)
  if (context instanceof Response) return context

  const body = await readJson<CreateApplicationBody>(request)
  const tailoredResumeId = body?.tailoredResumeId ?? ""
  const database = readDatabase()
  const tailoredResume = database.tailoredResumes.find(
    (resume) => resume.id === tailoredResumeId && resume.userId === context.user.id
  )

  if (!tailoredResume) {
    return jsonError("Choose one of your tailored resumes before creating an application.", 422, "validation_error")
  }

  const timestamp = nowIso()
  const application: Application = {
    id: createId(),
    userId: context.user.id,
    tailoredResumeId,
    companyName: body?.companyName?.trim() ?? "",
    jobTitle: body?.jobTitle?.trim() ?? "",
    jobUrl: body?.jobUrl?.trim() ?? "",
    status: body?.status ?? "Saved",
    notes: body?.notes?.trim() ?? "",
    dateApplied: body?.dateApplied ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  updateDatabase((draft) => {
    draft.applications.push(application)
  })

  return jsonOk({ application })
}
