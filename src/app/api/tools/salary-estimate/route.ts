import type { NextRequest } from "next/server"
import { jsonError, jsonOk, readJson } from "@/lib/http"
import { enforceToolUsage, trackPublicTool, trackSalaryEstimate } from "@/lib/public-tool-storage"
import { buildSalaryEstimate } from "@/lib/resume-engine"

export const runtime = "nodejs"

type SalaryBody = {
  role?: string
  yearsExperience?: string
  location?: string
  skills?: string | string[]
  workMode?: string
  industry?: string
}

export async function POST(request: NextRequest) {
  const usage = await enforceToolUsage(request, "salaryEstimatesUsed")
  if (usage.response) return usage.response

  const body = await readJson<SalaryBody>(request)
  const role = body?.role?.trim() ?? ""
  const location = body?.location?.trim() ?? ""
  const skills = Array.isArray(body?.skills)
    ? body.skills
    : (body?.skills ?? "")
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean)

  if (!role) return jsonError("Job title is required.", 422, "validation_error")
  if (!location) return jsonError("Location is required.", 422, "validation_error")

  const result = buildSalaryEstimate({
    role,
    yearsExperience: body?.yearsExperience || "3-5 Years",
    location,
    skills,
    workMode: body?.workMode || "Hybrid",
    industry: body?.industry,
  })

  trackPublicTool({
    userId: usage.context?.user.id ?? null,
    toolType: "salary-estimate",
    inputJson: {
      role,
      yearsExperience: body?.yearsExperience || "3-5 Years",
      location,
      skills,
      workMode: body?.workMode || "Hybrid",
      industry: body?.industry ?? "",
    },
    resultJson: result,
  })

  trackSalaryEstimate({
    userId: usage.context?.user.id ?? null,
    role,
    yearsExperience: body?.yearsExperience || "3-5 Years",
    location,
    skills,
    workMode: body?.workMode || "Hybrid",
    industry: body?.industry ?? "",
    resultJson: result,
  })

  return jsonOk({ result })
}
