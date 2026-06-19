import "server-only"

import { logger } from "@/lib/logger"
import type {
  ExperienceItem,
  JobDescriptionAnalysis,
  ProjectItem,
  StructuredResumeProfile,
} from "@/lib/rolefit-types"

/**
 * LLM-assisted resume tailoring.
 *
 * Calls OpenAI (or any OpenAI-compatible endpoint via OPENAI_BASE_URL) to
 * rewrite the summary, experience bullets, and project highlights of a
 * structured resume to align with a parsed job description while preserving:
 *   - section order and counts (no new roles, no new bullets, no dropped bullets)
 *   - dates, companies, project names, education entries
 *   - the user's writing style (tone, length, voice)
 *
 * Skill insertion stays gated by the heuristic guardrail upstream; the LLM is
 * allowed to *reword* existing bullets to surface keywords that are already
 * provable in the master profile, but it must not invent skills the user
 * doesn't have.
 *
 * Falls back to `null` (caller uses heuristic-only output) when:
 *   - OPENAI_API_KEY is not set
 *   - request times out
 *   - response shape doesn't match
 *
 * Errors are logged but never thrown — tailoring must remain best-effort.
 */

export type LLMTailorInput = {
  profile: StructuredResumeProfile
  analysis: JobDescriptionAnalysis
  confirmedSkills: string[]
  /** Skills the user genuinely has (used for the guardrail in the prompt). */
  supportedSkills: string[]
  /** When true, prompt the model to lift the score (used as a hint only). */
  improveScore?: boolean
}

export type LLMTailorOutput = {
  summary: string
  experience: Array<{ jobTitle: string; company: string; bullets: string[] }>
  projects: Array<{ name: string; description: string; bullets: string[] }>
  notes: string[]
}

/**
 * Resolve which LLM provider is wired up. Prefers OpenAI if both keys are set
 * (so the cheaper / faster model is the explicit choice), otherwise falls
 * back to DeepSeek which is fully OpenAI-API compatible at `/chat/completions`.
 */
type Provider = {
  name: "openai" | "deepseek"
  apiKey: string
  baseUrl: string
  model: string
}

function resolveProvider(): Provider | null {
  const openaiKey = (process.env.OPENAI_API_KEY ?? "").trim()
  if (openaiKey && !openaiKey.includes("replace")) {
    return {
      name: "openai",
      apiKey: openaiKey,
      baseUrl: (process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/$/, ""),
      model: process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini",
    }
  }

  const deepseekKey = (process.env.DEEPSEEK_API_KEY ?? "").trim()
  if (deepseekKey && !deepseekKey.includes("replace")) {
    return {
      name: "deepseek",
      apiKey: deepseekKey,
      baseUrl: (process.env.DEEPSEEK_BASE_URL?.trim() || "https://api.deepseek.com").replace(/\/$/, ""),
      model: process.env.DEEPSEEK_MODEL?.trim() || "deepseek-chat",
    }
  }

  return null
}

export function isLlmTailorConfigured(): boolean {
  return resolveProvider() !== null
}

function getTimeout(): number {
  const raw = Number(process.env.AI_TIMEOUT_MS ?? "30000")
  return Number.isFinite(raw) && raw > 0 ? raw : 30_000
}

function makePrompt(input: LLMTailorInput): string {
  const { profile, analysis, supportedSkills } = input
  const supported = supportedSkills.slice(0, 80).join(", ")
  const required = analysis.requiredSkills.slice(0, 40).join(", ")
  const preferred = analysis.preferredSkills.slice(0, 40).join(", ")
  const tools = analysis.toolsAndTechnologies.slice(0, 40).join(", ")
  const responsibilities = analysis.responsibilities.slice(0, 12).join("\n- ")

  const experienceBlock = profile.workExperience
    .map((exp, index) => {
      const bullets = exp.bullets.map((b, i) => `  ${i + 1}. ${b}`).join("\n")
      return `Experience #${index + 1} — ${exp.jobTitle} at ${exp.company} (${exp.startDate} – ${exp.currentRole ? "Present" : exp.endDate}):\n${bullets || "  (no bullets)"}`
    })
    .join("\n\n")

  const projectBlock = profile.projects
    .map((proj, index) => {
      const bullets = proj.bullets.map((b, i) => `  ${i + 1}. ${b}`).join("\n")
      return `Project #${index + 1} — ${proj.name} (${proj.technologies.join(", ")}):\n  Description: ${proj.description}\n${bullets || "  (no bullets)"}`
    })
    .join("\n\n")

  return [
    `You are a senior resume editor.`,
    `Rewrite the candidate's resume so it scores higher against a specific job description, while preserving the candidate's voice and never fabricating experience.`,
    ``,
    `Hard rules:`,
    `1. Output STRICT JSON exactly matching the schema in the SCHEMA section. No prose, no markdown fences.`,
    `2. Keep the SAME number of work-experience entries, in the same order. Do not invent new companies, titles, or dates.`,
    `3. For each experience, keep the SAME number of bullets in the same order. Reword bullets to emphasize JD-relevant work, but do NOT invent technologies the candidate doesn't claim.`,
    `4. Keep the SAME number of projects, in the same order. Same rules apply to project bullets.`,
    `5. You may only reference these skills/technologies in rewrites: ${supported || "(supported skill list empty — only use words already present in the bullets)"}. If a JD keyword isn't in that allowed list, omit it from the rewrite.`,
    `6. Maintain the candidate's tone (use action verbs, past tense for past roles, present for the current role). 1-2 lines per bullet. Quantify with the same numbers the original bullet used; never invent new percentages.`,
    `7. Summary should be 3-5 lines, written in first person omitted (e.g. ".NET developer with 4+ years…").`,
    `8. Add concise "notes" entries describing each non-trivial change so the user can review safely.`,
    ``,
    `JOB DESCRIPTION SIGNAL:`,
    `Title: ${analysis.jobTitle || "Unknown"}`,
    `Role category: ${analysis.roleCategory || "Unknown"}`,
    `Required skills: ${required || "(none parsed)"}`,
    `Preferred skills: ${preferred || "(none parsed)"}`,
    `Tools & tech: ${tools || "(none parsed)"}`,
    `Key responsibilities:\n- ${responsibilities || "(none parsed)"}`,
    ``,
    `CURRENT SUMMARY:`,
    profile.summary || "(empty)",
    ``,
    `CURRENT EXPERIENCE:`,
    experienceBlock || "(none)",
    ``,
    `CURRENT PROJECTS:`,
    projectBlock || "(none)",
    ``,
    `SCHEMA:`,
    `{`,
    `  "summary": "string — 3-5 line tailored summary",`,
    `  "experience": [`,
    `    { "jobTitle": "exact original title", "company": "exact original company", "bullets": ["reworded bullet 1", "reworded bullet 2"] }`,
    `  ],`,
    `  "projects": [`,
    `    { "name": "exact original name", "description": "reworded description", "bullets": ["reworded bullet 1"] }`,
    `  ],`,
    `  "notes": ["one short note per non-trivial change"]`,
    `}`,
  ].join("\n")
}

export async function tailorResumeWithLLM(input: LLMTailorInput): Promise<LLMTailorOutput | null> {
  const provider = resolveProvider()
  if (!provider) return null

  const url = `${provider.baseUrl}/chat/completions`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), getTimeout())

  try {
    const body = {
      model: provider.model,
      response_format: { type: "json_object" },
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "You rewrite resumes to surface JD-relevant work without inventing experience. Output strict JSON.",
        },
        { role: "user", content: makePrompt(input) },
      ],
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!response.ok) {
      logger.warn("llm.tailor", `${provider.name} returned non-2xx — falling back`, {
        status: response.status,
      })
      return null
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const text = json.choices?.[0]?.message?.content?.trim() ?? ""
    if (!text) return null

    const parsed = safeJsonParse(text)
    if (!parsed) return null

    return validateAndCoerce(parsed, input)
  } catch (error) {
    if ((error as Error)?.name === "AbortError") {
      logger.warn("llm.tailor", `${provider.name} request timed out`)
    } else {
      logger.warn("llm.tailor", `${provider.name} request failed`, {
        error: error instanceof Error ? error.message : String(error),
      })
    }
    return null
  } finally {
    clearTimeout(timer)
  }
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    // Try to recover when the model wraps the JSON in a code fence.
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) {
      try {
        return JSON.parse(match[1]!)
      } catch {
        return null
      }
    }
    return null
  }
}

function validateAndCoerce(
  raw: unknown,
  input: LLMTailorInput,
): LLMTailorOutput | null {
  if (!raw || typeof raw !== "object") return null
  const value = raw as Record<string, unknown>

  const summary = typeof value.summary === "string" ? value.summary.trim() : ""
  if (!summary) return null

  // Coerce experience to the exact shape and length of the original profile.
  // The LLM might return fewer entries or rename fields; rebuild from the
  // original profile and slot in only the bullets the LLM provided per index.
  const llmExp: Array<{ bullets?: string[] }> = Array.isArray(value.experience)
    ? (value.experience as Array<{ bullets?: string[] }>)
    : []
  const experience = input.profile.workExperience.map((source: ExperienceItem, index) => {
    const incoming = llmExp[index]
    const bullets =
      Array.isArray(incoming?.bullets) && source.bullets.length > 0
        ? coerceBullets(incoming!.bullets!, source.bullets.length)
        : source.bullets
    return {
      jobTitle: source.jobTitle,
      company: source.company,
      bullets,
    }
  })

  const llmProj: Array<{ description?: string; bullets?: string[] }> = Array.isArray(
    value.projects,
  )
    ? (value.projects as Array<{ description?: string; bullets?: string[] }>)
    : []
  const projects = input.profile.projects.map((source: ProjectItem, index) => {
    const incoming = llmProj[index]
    return {
      name: source.name,
      description:
        typeof incoming?.description === "string" && incoming.description.trim()
          ? incoming.description.trim()
          : source.description,
      bullets:
        Array.isArray(incoming?.bullets) && source.bullets.length > 0
          ? coerceBullets(incoming!.bullets!, source.bullets.length)
          : source.bullets,
    }
  })

  const notes = Array.isArray(value.notes)
    ? (value.notes as unknown[])
        .map((n) => (typeof n === "string" ? n.trim() : ""))
        .filter(Boolean)
        .slice(0, 12)
    : []

  return { summary, experience, projects, notes }
}

function coerceBullets(bullets: unknown[], targetLength: number): string[] {
  const cleaned = bullets
    .map((b) => (typeof b === "string" ? b.trim() : ""))
    .filter(Boolean)
    .slice(0, targetLength)
  // Pad with empty strings if the model returned fewer than expected so the
  // index alignment with the original profile is preserved.
  while (cleaned.length < targetLength) cleaned.push("")
  return cleaned
}
