import type { NextRequest } from "next/server"
import { jsonError, jsonOk, readJson } from "@/lib/http"
import { enforceToolUsage, trackPublicTool } from "@/lib/public-tool-storage"
import { buildInterviewQuestions } from "@/lib/resume-engine"

export const runtime = "nodejs"

type InterviewBody = {
  jobDescription?: string
  role?: string
  experienceLevel?: string
}

export async function POST(request: NextRequest) {
  const usage = await enforceToolUsage(request, "publicToolUsageUsed")
  if (usage.response) return usage.response

  const body = await readJson<InterviewBody>(request)
  const jobDescription = body?.jobDescription?.trim() ?? ""

  if (jobDescription.length < 80) {
    return jsonError("Paste the full job description to generate interview questions.", 422, "validation_error")
  }

  const result = buildInterviewQuestions({
    jobDescription,
    role: body?.role,
    experienceLevel: body?.experienceLevel,
  })
  const isSignedIn = Boolean(usage.context)
  const responseResult = isSignedIn
    ? result
    : {
        role: result.role,
        technicalQuestions: result.technicalQuestions.slice(0, 3),
        behavioralQuestions: result.behavioralQuestions.slice(0, 3),
        skillsToReview: result.skillsToReview.slice(0, 5),
        gated: true,
      }

  trackPublicTool(
    {
      userId: usage.context?.user.id ?? null,
      toolType: "interview-questions",
      inputJson: { jobDescription, role: body?.role ?? "", experienceLevel: body?.experienceLevel ?? "" },
      resultJson: result,
    },
    usage.context ? "publicToolUsageUsed" : undefined
  )

  return jsonOk({ result: responseResult, fullResultAvailable: isSignedIn })
}
