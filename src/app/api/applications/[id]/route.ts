import type { NextRequest } from "next/server"
import { nowIso, updateDatabase } from "@/lib/database"
import { jsonError, jsonOk, requireApiUser, readJson } from "@/lib/http"
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/rolefit-types"

export const runtime = "nodejs"

type UpdateApplicationBody = {
  status?: ApplicationStatus
  notes?: string
  dateApplied?: string | null
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const userContext = requireApiUser(request)
  if (userContext instanceof Response) return userContext

  const { id } = await context.params
  const body = await readJson<UpdateApplicationBody>(request)

  if (body?.status && !APPLICATION_STATUSES.includes(body.status)) {
    return jsonError("Unsupported application status.", 422, "validation_error")
  }

  const updated = updateDatabase((database) => {
    const application = database.applications.find(
      (item) => item.id === id && item.userId === userContext.user.id
    )

    if (!application) return null

    if (body?.status) application.status = body.status
    if (typeof body?.notes === "string") application.notes = body.notes
    if (body?.dateApplied !== undefined) application.dateApplied = body.dateApplied
    application.updatedAt = nowIso()

    return application
  })

  if (!updated) return jsonError("Application not found.", 404, "not_found")

  return jsonOk({ application: updated })
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const userContext = requireApiUser(request)
  if (userContext instanceof Response) return userContext

  const { id } = await context.params
  const deleted = updateDatabase((database) => {
    const owned = database.applications.some(
      (item) => item.id === id && item.userId === userContext.user.id
    )
    if (!owned) return false

    database.applications = database.applications.filter((item) => item.id !== id)
    return true
  })

  if (!deleted) return jsonError("Application not found.", 404, "not_found")

  return jsonOk({ deleted: true })
}
