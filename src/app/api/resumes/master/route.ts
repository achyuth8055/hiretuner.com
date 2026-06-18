import type { NextRequest } from "next/server"
import { createId, getActiveMasterResume, nowIso, readDatabase, replaceMasterResume, updateDatabase } from "@/lib/database"
import { jsonError, jsonOk, requireApiUser, readJson } from "@/lib/http"
import { extractResumeTextFromFile, parseResumeText } from "@/lib/resume-engine"
import type { MasterResume, StructuredResumeProfile } from "@/lib/rolefit-types"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const context = requireApiUser(request)
  if (context instanceof Response) return context

  return jsonOk({ masterResume: getActiveMasterResume(context.user.id) })
}

export async function POST(request: NextRequest) {
  const context = requireApiUser(request)
  if (context instanceof Response) return context

  const existing = readDatabase().masterResumes.filter(
    (resume) => resume.userId === context.user.id && resume.active
  )

  if (existing.length >= 1) {
    updateDatabase((database) => {
      database.masterResumes = database.masterResumes.map((resume) =>
        resume.userId === context.user.id ? { ...resume, active: false, updatedAt: nowIso() } : resume
      )
    })
  }

  // Reject non-multipart bodies up front. request.formData() throws a 500
  // when the body is JSON or otherwise not multipart/form-data; catch it and
  // return a clean 422 so non-form callers see a usable error.
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return jsonError(
      "Upload a PDF, DOCX, or TXT resume file using multipart/form-data.",
      422,
      "validation_error",
    )
  }
  const file = formData.get("file")

  if (!(file instanceof File)) {
    return jsonError("Upload a PDF, DOCX, or TXT resume file.", 422, "validation_error")
  }

  try {
    const parsedText = await extractResumeTextFromFile(file)
    if (!parsedText) {
      return jsonError("Parsing failed. The uploaded resume did not contain readable text.", 422, "parse_failed")
    }

    const structuredProfile = parseResumeText(parsedText)
    const timestamp = nowIso()
    const masterResume: MasterResume = {
      id: createId(),
      userId: context.user.id,
      originalFileUrl: null,
      originalFileName: file.name,
      parsedText,
      structuredProfile,
      active: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    replaceMasterResume(masterResume)

    return jsonOk({ masterResume })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error while parsing resume."
    return jsonError(message, 422, "parse_failed")
  }
}

type UpdateMasterResumeBody = {
  parsedText?: string
  structuredProfile?: StructuredResumeProfile
}

export async function PUT(request: NextRequest) {
  const context = requireApiUser(request)
  if (context instanceof Response) return context

  const body = await readJson<UpdateMasterResumeBody>(request)
  const updated = updateDatabase((database) => {
    const resume = database.masterResumes.find(
      (item) => item.userId === context.user.id && item.active
    )

    if (!resume) return null

    if (body?.parsedText && body.parsedText.trim().length > 0) {
      resume.parsedText = body.parsedText.trim()
      resume.structuredProfile = parseResumeText(resume.parsedText)
    }

    if (body?.structuredProfile) {
      resume.structuredProfile = body.structuredProfile
      resume.parsedText = body.parsedText?.trim() || resume.parsedText
    }

    resume.updatedAt = nowIso()
    return resume
  })

  if (!updated) return jsonError("Master resume not found.", 404, "not_found")

  return jsonOk({ masterResume: updated })
}

export async function DELETE(request: NextRequest) {
  const context = requireApiUser(request)
  if (context instanceof Response) return context

  updateDatabase((database) => {
    database.masterResumes = database.masterResumes.filter((resume) => resume.userId !== context.user.id)
  })

  return jsonOk({ deleted: true })
}
