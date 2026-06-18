import type { NextRequest } from "next/server"
import { createId } from "@/lib/database"
import { getFirebaseStorage, isFirebaseAdminEnabled } from "@/lib/firebase-admin"
import { jsonError, jsonOk, readJson, requireApiUser } from "@/lib/http"
import { logger } from "@/lib/logger"
import { enumValue, requireString, ValidationFailed } from "@/lib/validate"

export const runtime = "nodejs"

const ALLOWED_MIME = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"] as const

type UploadUrlBody = {
  filename?: string
  mimeType?: (typeof ALLOWED_MIME)[number]
  sizeBytes?: number
}

const MAX_BYTES = 8 * 1024 * 1024 // 8 MB

/**
 * Returns a v4 signed PUT URL the client can use to upload a resume directly
 * to Firebase Storage / GCS without proxying the bytes through our server.
 */
export async function POST(request: NextRequest) {
  const context = requireApiUser(request)
  if (context instanceof Response) return context

  if (!isFirebaseAdminEnabled()) {
    return jsonError(
      "Firebase Storage is not configured. Set FIREBASE_* envs to enable uploads.",
      501,
      "firebase_not_configured",
    )
  }

  const storage = getFirebaseStorage()
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET
  if (!storage || !bucketName) {
    return jsonError(
      "FIREBASE_STORAGE_BUCKET is not configured.",
      501,
      "firebase_storage_missing",
    )
  }

  const body = await readJson<UploadUrlBody>(request)
  let filename: string
  let mimeType: (typeof ALLOWED_MIME)[number]
  try {
    filename = requireString("filename", body?.filename, { min: 1, max: 200 })
    mimeType = enumValue("mimeType", body?.mimeType, ALLOWED_MIME)
  } catch (error) {
    if (error instanceof ValidationFailed) {
      return jsonError(error.message, 422, "validation_error", error.errors)
    }
    throw error
  }

  if (typeof body?.sizeBytes === "number" && body.sizeBytes > MAX_BYTES) {
    return jsonError("Resume exceeds the 8 MB upload limit.", 413, "file_too_large")
  }

  // Sanitize filename to a safe storage path.
  const safeName = filename.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 120)
  const objectPath = `resumes/${context.user.id}/${Date.now()}-${createId()}-${safeName}`
  const bucket = storage.bucket(bucketName)
  const file = bucket.file(objectPath)

  try {
    const [uploadUrl] = await file.getSignedUrl({
      version: "v4",
      action: "write",
      contentType: mimeType,
      expires: Date.now() + 15 * 60 * 1000, // 15 min
    })

    // A short-lived read URL the client can save once the upload finishes.
    const [readUrl] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    })

    return jsonOk({
      uploadUrl,
      readUrl,
      objectPath,
      bucket: bucketName,
      maxBytes: MAX_BYTES,
      contentType: mimeType,
    })
  } catch (error) {
    logger.error("api.resumes.upload-url", "Signed URL creation failed", {
      userId: context.user.id,
      error: error instanceof Error ? error.message : String(error),
    })
    return jsonError("Could not generate upload URL.", 502, "storage_error")
  }
}
