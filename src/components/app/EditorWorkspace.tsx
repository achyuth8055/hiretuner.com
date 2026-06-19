"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { UpgradeButton } from "@/components/app/UpgradeButton"
import { ResumeDocument } from "@/components/resume-templates/ResumeDocument"
import { resumeTemplates } from "@/lib/resume-templates/registry"
import { tailoredResumeJsonToResumeData } from "@/lib/tailored-to-resume-data"
import type {
  Application,
  CertificationItem,
  EducationItem,
  ExperienceItem,
  JobDescription,
  PlanType,
  ProjectItem,
  TailoredResume,
  TailoredResumeJson,
} from "@/lib/rolefit-types"
import type { ResumeTemplate } from "@/lib/resume-templates/types"

type EditorWorkspaceProps = {
  initial: {
    plan: PlanType
    tailoredResume: TailoredResume
    jobDescription: JobDescription | null
    application: Application | null
  }
}

type ApiResponse<T> = {
  ok?: boolean
  data?: T
  error?: { message?: string; code?: string }
}

type SectionKey =
  | "contact"
  | "summary"
  | "skills"
  | "experience"
  | "projects"
  | "education"
  | "certifications"

const SECTIONS: Array<{ key: SectionKey; label: string; icon: string }> = [
  { key: "contact", label: "Contact", icon: "contact_page" },
  { key: "summary", label: "Summary", icon: "person" },
  { key: "skills", label: "Skills", icon: "bolt" },
  { key: "experience", label: "Experience", icon: "work" },
  { key: "projects", label: "Projects", icon: "rocket_launch" },
  { key: "education", label: "Education", icon: "school" },
  { key: "certifications", label: "Certifications", icon: "workspace_premium" },
]

const SKILL_GROUPS: Array<{ key: keyof TailoredResumeJson["skills"]; label: string }> = [
  { key: "programmingLanguages", label: "Programming languages" },
  { key: "frameworks", label: "Frameworks & libraries" },
  { key: "databases", label: "Databases" },
  { key: "cloudPlatforms", label: "Cloud platforms" },
  { key: "tools", label: "Tools" },
  { key: "businessSkills", label: "Domain / business" },
  { key: "softSkills", label: "Soft skills" },
]

export function EditorWorkspace({ initial }: EditorWorkspaceProps) {
  const [resumeJson, setResumeJson] = useState<TailoredResumeJson>(initial.tailoredResume.resumeJson)
  const [tailoredScore, setTailoredScore] = useState(initial.tailoredResume.tailoredScore)
  const [activeSection, setActiveSection] = useState<SectionKey>("summary")
  const [templateId, setTemplateId] = useState<string>("tech-classic-serif")
  const [previewTab, setPreviewTab] = useState<"preview" | "analysis">("preview")
  const [loading, setLoading] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [upgradeMessage, setUpgradeMessage] = useState("")

  const template: ResumeTemplate = useMemo(
    () => resumeTemplates.find((t) => t.id === templateId) ?? resumeTemplates[0]!,
    [templateId],
  )

  const resumeData = useMemo(
    () =>
      tailoredResumeJsonToResumeData(
        resumeJson,
        initial.jobDescription?.jobTitle ?? "Tailored Resume",
      ),
    [resumeJson, initial.jobDescription?.jobTitle],
  )

  const jobMeta =
    initial.jobDescription?.jobTitle && initial.jobDescription.companyName
      ? `${initial.jobDescription.jobTitle} · ${initial.jobDescription.companyName}`
      : initial.jobDescription?.jobTitle || initial.jobDescription?.companyName || "Tailored resume"

  function patchJson(patch: Partial<TailoredResumeJson>) {
    setResumeJson((current) => ({ ...current, ...patch }))
  }

  async function save() {
    setLoading("save")
    setMessage("")
    setError("")
    try {
      const response = await fetch(`/api/tailored-resumes/${initial.tailoredResume.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeJson, chosenTemplateId: templateId }),
      })
      const json = (await response.json()) as ApiResponse<{ tailoredResume: TailoredResume }>
      if (!response.ok || !json.ok) {
        throw new Error(json.error?.message ?? "Unable to save resume.")
      }
      if (json.data?.tailoredResume) {
        setTailoredScore(json.data.tailoredResume.tailoredScore)
      }
      setMessage("Version saved.")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save resume.")
    } finally {
      setLoading("")
    }
  }

  async function copyPlainText() {
    const lines: string[] = []
    lines.push(resumeJson.contact.fullName)
    const contactBits = [
      resumeJson.contact.email,
      resumeJson.contact.phone,
      resumeJson.contact.location,
      resumeJson.contact.linkedIn,
      resumeJson.contact.github,
      resumeJson.contact.portfolio,
    ]
      .filter(Boolean)
      .join(" | ")
    if (contactBits) lines.push(contactBits)
    if (resumeJson.summary) lines.push("", "SUMMARY", resumeJson.summary)
    if (resumeJson.workExperience.length) {
      lines.push("", "EXPERIENCE")
      for (const job of resumeJson.workExperience) {
        const header = `${job.jobTitle} — ${job.company}${job.location ? `, ${job.location}` : ""}`
        const dates = `${job.startDate} – ${job.currentRole ? "Present" : job.endDate}`
        lines.push(header, dates)
        for (const b of job.bullets) lines.push(`• ${b}`)
        lines.push("")
      }
    }
    await navigator.clipboard.writeText(lines.join("\n"))
    setMessage("Plain text copied.")
  }

  async function downloadPdf() {
    setLoading("download")
    setError("")
    setUpgradeMessage("")
    try {
      const response = await fetch(`/api/tailored-resumes/${initial.tailoredResume.id}/download`)
      if (response.status === 402) {
        const json = (await response.json()) as ApiResponse<unknown>
        setUpgradeMessage(json.error?.message ?? "Upgrade to download PDF.")
        return
      }
      if (!response.ok) {
        const json = (await response.json()) as ApiResponse<unknown>
        throw new Error(json.error?.message ?? "Unable to download PDF.")
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `hiretuner-resume-v${initial.tailoredResume.versionNumber}.pdf`
      anchor.click()
      URL.revokeObjectURL(url)
      setMessage("PDF download started.")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to download PDF.")
    } finally {
      setLoading("")
    }
  }

  return (
    <div className="bg-background text-on-background font-body-base antialiased h-screen overflow-hidden flex flex-col w-full">
      {/* Top bar */}
      <header className="bg-surface/90 dark:bg-surface-container-highest/90 backdrop-blur-md text-primary sticky top-0 z-50 border-b border-outline-variant/30 shadow-sm flex justify-between items-center w-full px-gutter py-3">
        <div className="flex items-center gap-stack-md">
          <Link
            href="/dashboard"
            className="font-headline-md text-headline-md font-bold text-primary flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
              auto_awesome
            </span>
            HireTuner
          </Link>
          <div className="h-6 w-px bg-outline-variant/30 mx-2" />
          <ScorePill
            originalScore={initial.tailoredResume.originalScore}
            tailoredScore={tailoredScore}
          />
          <span className="text-xs text-on-surface-variant ml-2 hidden md:inline">{jobMeta}</span>
        </div>
        <div className="flex items-center gap-2">
          <TemplatePicker value={templateId} onChange={setTemplateId} />
          <button
            onClick={save}
            disabled={loading === "save"}
            className="px-3 py-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors text-body-sm flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            {loading === "save" ? "Saving…" : "Save"}
          </button>
          <button
            onClick={copyPlainText}
            className="px-3 py-2 border border-outline-variant/50 hover:border-secondary hover:text-secondary rounded-full bg-surface-container-lowest text-body-sm flex items-center gap-1 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">content_copy</span>
            Copy
          </button>
          <button
            onClick={downloadPdf}
            disabled={loading === "download"}
            className="px-4 py-2 bg-primary text-on-primary rounded-full text-body-sm flex items-center gap-2 hover:bg-primary/90 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            {loading === "download" ? "Preparing…" : "Download PDF"}
          </button>
        </div>
      </header>

      {(message || error || upgradeMessage) && (
        <div className="px-gutter py-2 border-b border-outline-variant/20 bg-surface-container-lowest">
          {message && <p className="text-body-sm text-secondary">{message}</p>}
          {error && <p className="text-body-sm text-error">{error}</p>}
          {upgradeMessage && (
            <div className="flex items-center justify-between gap-4">
              <p className="text-body-sm text-primary">{upgradeMessage}</p>
              <UpgradeButton className="w-56" currentPlan={initial.plan} />
            </div>
          )}
        </div>
      )}

      <main className="flex-1 flex overflow-hidden">
        {/* Section nav */}
        <aside className="w-56 border-r border-outline-variant/20 bg-surface flex flex-col p-stack-md gap-1 flex-shrink-0">
          <h2 className="font-label-uppercase text-label-uppercase text-on-surface-variant mb-2 px-2">Sections</h2>
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-body-sm text-left transition-colors ${
                activeSection === s.key
                  ? "bg-secondary-container text-on-secondary-container font-medium"
                  : "text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{s.icon}</span>
              {s.label}
            </button>
          ))}
          <div className="mt-auto pt-4 border-t border-outline-variant/20 text-xs text-on-surface-variant px-2">
            Review carefully before downloading. You&apos;re always in control of the final content.
          </div>
        </aside>

        {/* Editor pane */}
        <section className="flex-1 bg-surface-container-low overflow-y-auto">
          <div className="max-w-3xl mx-auto py-stack-lg px-gutter pb-32">
            {activeSection === "contact" && (
              <ContactEditor value={resumeJson.contact} onChange={(contact) => patchJson({ contact })} />
            )}
            {activeSection === "summary" && (
              <SummaryEditor value={resumeJson.summary} onChange={(summary) => patchJson({ summary })} />
            )}
            {activeSection === "skills" && (
              <SkillsEditor value={resumeJson.skills} onChange={(skills) => patchJson({ skills })} />
            )}
            {activeSection === "experience" && (
              <ExperienceEditor
                value={resumeJson.workExperience}
                onChange={(workExperience) => patchJson({ workExperience })}
              />
            )}
            {activeSection === "projects" && (
              <ProjectsEditor value={resumeJson.projects} onChange={(projects) => patchJson({ projects })} />
            )}
            {activeSection === "education" && (
              <EducationEditor value={resumeJson.education} onChange={(education) => patchJson({ education })} />
            )}
            {activeSection === "certifications" && (
              <CertificationsEditor
                value={resumeJson.certifications}
                onChange={(certifications) => patchJson({ certifications })}
              />
            )}
          </div>
        </section>

        {/* Live preview + Analysis */}
        <aside className="w-[460px] border-l border-outline-variant/20 bg-surface flex flex-col flex-shrink-0">
          <div className="flex border-b border-outline-variant/20">
            <button
              onClick={() => setPreviewTab("preview")}
              className={`flex-1 py-3 text-body-sm font-medium transition-colors ${
                previewTab === "preview"
                  ? "text-primary border-b-2 border-secondary bg-surface-container-lowest"
                  : "text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              Live preview
            </button>
            <button
              onClick={() => setPreviewTab("analysis")}
              className={`flex-1 py-3 text-body-sm font-medium transition-colors ${
                previewTab === "analysis"
                  ? "text-primary border-b-2 border-secondary bg-surface-container-lowest"
                  : "text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              Analysis
            </button>
          </div>

          {previewTab === "preview" ? (
            <div className="flex-1 overflow-y-auto p-stack-md bg-surface-container-high/40">
              <div
                className="bg-white shadow-lg ring-1 ring-black/10 mx-auto"
                style={{ width: 420, transformOrigin: "top center" }}
              >
                <div style={{ transform: "scale(0.53)", transformOrigin: "top left", width: 794 }}>
                  <ResumeDocument template={template} data={resumeData} />
                </div>
              </div>
            </div>
          ) : (
            <AnalysisPanel resume={{ ...initial.tailoredResume, tailoredScore }} />
          )}
        </aside>
      </main>
    </div>
  )
}

/* ----------------------------- sub-components ----------------------------- */

function ScorePill({ originalScore, tailoredScore }: { originalScore: number; tailoredScore: number }) {
  const lift = tailoredScore - originalScore
  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col">
        <span className="font-label-uppercase text-label-uppercase text-on-surface-variant">Original</span>
        <span className="font-headline-sm text-headline-sm text-on-surface-variant opacity-70">{originalScore}%</span>
      </div>
      <span className="material-symbols-outlined text-outline-variant">arrow_forward</span>
      <div className="flex flex-col">
        <span className="font-label-uppercase text-label-uppercase text-secondary">Tailored</span>
        <span className="font-headline-sm text-headline-sm text-secondary">
          {tailoredScore}%
          {lift > 0 && (
            <span className="text-xs text-[#10B981] ml-1 align-middle">+{lift}</span>
          )}
        </span>
      </div>
    </div>
  )
}

function TemplatePicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <label className="hidden lg:flex items-center gap-2 text-body-sm text-on-surface-variant border border-outline-variant/40 rounded-full px-3 py-1.5 bg-surface-container-lowest">
      <span className="material-symbols-outlined text-[16px] text-secondary">style</span>
      <span className="hidden xl:inline">Template:</span>
      <select
        className="bg-transparent outline-none text-body-sm text-primary"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {resumeTemplates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </label>
  )
}

const inputClass =
  "w-full rounded border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 text-body-sm outline-none focus:border-secondary"

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-xs text-on-surface-variant font-medium">{children}</span>
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-stack-md shadow-sm">
      <h2 className="font-headline-sm text-headline-sm text-primary">{title}</h2>
      {subtitle && <p className="text-body-sm text-on-surface-variant mt-1">{subtitle}</p>}
      <div className="mt-stack-md flex flex-col gap-stack-md">{children}</div>
    </section>
  )
}

function ContactEditor({
  value,
  onChange,
}: {
  value: TailoredResumeJson["contact"]
  onChange: (next: TailoredResumeJson["contact"]) => void
}) {
  function set<K extends keyof TailoredResumeJson["contact"]>(
    key: K,
    val: TailoredResumeJson["contact"][K],
  ) {
    onChange({ ...value, [key]: val })
  }
  return (
    <SectionCard title="Contact" subtitle="Shown in the header of the rendered resume.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <FieldLabel>Full name</FieldLabel>
          <input className={inputClass} value={value.fullName} onChange={(e) => set("fullName", e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <FieldLabel>Email</FieldLabel>
          <input className={inputClass} value={value.email} onChange={(e) => set("email", e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <FieldLabel>Phone</FieldLabel>
          <input className={inputClass} value={value.phone} onChange={(e) => set("phone", e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <FieldLabel>Location</FieldLabel>
          <input className={inputClass} value={value.location} onChange={(e) => set("location", e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <FieldLabel>LinkedIn</FieldLabel>
          <input className={inputClass} value={value.linkedIn} onChange={(e) => set("linkedIn", e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <FieldLabel>GitHub</FieldLabel>
          <input className={inputClass} value={value.github} onChange={(e) => set("github", e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <FieldLabel>Portfolio / website</FieldLabel>
          <input className={inputClass} value={value.portfolio} onChange={(e) => set("portfolio", e.target.value)} />
        </label>
      </div>
    </SectionCard>
  )
}

function SummaryEditor({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  return (
    <SectionCard title="Summary" subtitle="3-5 lines selling the rest of the resume.">
      <textarea
        className={`${inputClass} min-h-[180px] resize-y font-body-base text-body-base leading-6`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </SectionCard>
  )
}

function SkillsEditor({
  value,
  onChange,
}: {
  value: TailoredResumeJson["skills"]
  onChange: (next: TailoredResumeJson["skills"]) => void
}) {
  function setGroup(key: keyof TailoredResumeJson["skills"], raw: string) {
    onChange({
      ...value,
      [key]: raw
        .split(/[,\n]/)
        .map((v) => v.trim())
        .filter(Boolean),
    })
  }
  return (
    <SectionCard title="Skills" subtitle="Comma-separated. Categories with no entries are hidden in the rendered resume.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {SKILL_GROUPS.map(({ key, label }) => (
          <label key={key} className="flex flex-col gap-1">
            <FieldLabel>{label}</FieldLabel>
            <input
              className={inputClass}
              value={value[key].join(", ")}
              onChange={(e) => setGroup(key, e.target.value)}
            />
          </label>
        ))}
      </div>
    </SectionCard>
  )
}

function ExperienceEditor({
  value,
  onChange,
}: {
  value: ExperienceItem[]
  onChange: (next: ExperienceItem[]) => void
}) {
  function patch(index: number, p: Partial<ExperienceItem>) {
    onChange(value.map((entry, i) => (i === index ? { ...entry, ...p } : entry)))
  }
  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }
  return (
    <SectionCard title="Experience" subtitle="Edit role, dates, and bullets. Bullets are one per line.">
      <div className="flex flex-col gap-stack-md">
        {value.map((entry, index) => (
          <div key={index} className="rounded-lg border border-outline-variant/30 p-stack-md bg-surface">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <FieldLabel>Job title</FieldLabel>
                <input className={inputClass} value={entry.jobTitle} onChange={(e) => patch(index, { jobTitle: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1">
                <FieldLabel>Company</FieldLabel>
                <input className={inputClass} value={entry.company} onChange={(e) => patch(index, { company: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1">
                <FieldLabel>Location</FieldLabel>
                <input className={inputClass} value={entry.location} onChange={(e) => patch(index, { location: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1">
                <FieldLabel>Start</FieldLabel>
                <input className={inputClass} value={entry.startDate} onChange={(e) => patch(index, { startDate: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1">
                <FieldLabel>End</FieldLabel>
                <input
                  className={`${inputClass} disabled:opacity-50`}
                  value={entry.currentRole ? "Present" : entry.endDate}
                  disabled={entry.currentRole}
                  onChange={(e) => patch(index, { endDate: e.target.value })}
                />
              </label>
              <label className="flex items-center gap-2 text-body-sm">
                <input
                  type="checkbox"
                  checked={entry.currentRole}
                  onChange={(e) => patch(index, { currentRole: e.target.checked })}
                />
                Current role
              </label>
            </div>
            <label className="flex flex-col gap-1 mt-3">
              <FieldLabel>Bullets (one per line)</FieldLabel>
              <textarea
                className={`${inputClass} min-h-[140px] resize-y leading-6`}
                value={entry.bullets.join("\n")}
                onChange={(e) =>
                  patch(index, {
                    bullets: e.target.value.split(/\n+/).map((b) => b.replace(/^[•\-*]\s*/, "")).filter(Boolean),
                  })
                }
              />
            </label>
            <div className="mt-2 text-right">
              <button type="button" onClick={() => remove(index)} className="text-xs text-error hover:underline">
                Remove role
              </button>
            </div>
          </div>
        ))}
        {value.length === 0 && <p className="text-body-sm text-on-surface-variant">No work experience yet.</p>}
      </div>
    </SectionCard>
  )
}

function ProjectsEditor({
  value,
  onChange,
}: {
  value: ProjectItem[]
  onChange: (next: ProjectItem[]) => void
}) {
  function patch(index: number, p: Partial<ProjectItem>) {
    onChange(value.map((entry, i) => (i === index ? { ...entry, ...p } : entry)))
  }
  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }
  return (
    <SectionCard title="Projects" subtitle="Edit project name, description, tech stack, and highlights.">
      <div className="flex flex-col gap-stack-md">
        {value.map((entry, index) => (
          <div key={index} className="rounded-lg border border-outline-variant/30 p-stack-md bg-surface">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <FieldLabel>Name</FieldLabel>
                <input className={inputClass} value={entry.name} onChange={(e) => patch(index, { name: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1">
                <FieldLabel>Technologies (comma-separated)</FieldLabel>
                <input
                  className={inputClass}
                  value={entry.technologies.join(", ")}
                  onChange={(e) =>
                    patch(index, {
                      technologies: e.target.value.split(/[,\n]/).map((s) => s.trim()).filter(Boolean),
                    })
                  }
                />
              </label>
            </div>
            <label className="flex flex-col gap-1 mt-3">
              <FieldLabel>Description</FieldLabel>
              <input className={inputClass} value={entry.description} onChange={(e) => patch(index, { description: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1 mt-3">
              <FieldLabel>Highlights (one per line)</FieldLabel>
              <textarea
                className={`${inputClass} min-h-[100px] resize-y leading-6`}
                value={entry.bullets.join("\n")}
                onChange={(e) =>
                  patch(index, {
                    bullets: e.target.value.split(/\n+/).map((b) => b.replace(/^[•\-*]\s*/, "")).filter(Boolean),
                  })
                }
              />
            </label>
            <div className="mt-2 text-right">
              <button type="button" onClick={() => remove(index)} className="text-xs text-error hover:underline">
                Remove project
              </button>
            </div>
          </div>
        ))}
        {value.length === 0 && <p className="text-body-sm text-on-surface-variant">No projects yet.</p>}
      </div>
    </SectionCard>
  )
}

function EducationEditor({
  value,
  onChange,
}: {
  value: EducationItem[]
  onChange: (next: EducationItem[]) => void
}) {
  function patch(index: number, p: Partial<EducationItem>) {
    onChange(value.map((entry, i) => (i === index ? { ...entry, ...p } : entry)))
  }
  return (
    <SectionCard title="Education">
      <div className="flex flex-col gap-stack-md">
        {value.map((entry, index) => (
          <div key={index} className="rounded-lg border border-outline-variant/30 p-stack-md bg-surface grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <FieldLabel>School</FieldLabel>
              <input className={inputClass} value={entry.school} onChange={(e) => patch(index, { school: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1">
              <FieldLabel>Degree</FieldLabel>
              <input className={inputClass} value={entry.degree} onChange={(e) => patch(index, { degree: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1">
              <FieldLabel>Location</FieldLabel>
              <input className={inputClass} value={entry.location} onChange={(e) => patch(index, { location: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1">
              <FieldLabel>Graduation</FieldLabel>
              <input className={inputClass} value={entry.graduationDate} onChange={(e) => patch(index, { graduationDate: e.target.value })} />
            </label>
          </div>
        ))}
        {value.length === 0 && <p className="text-body-sm text-on-surface-variant">No education entries.</p>}
      </div>
    </SectionCard>
  )
}

function CertificationsEditor({
  value,
  onChange,
}: {
  value: CertificationItem[]
  onChange: (next: CertificationItem[]) => void
}) {
  return (
    <SectionCard title="Certifications" subtitle="One per line.">
      <textarea
        className={`${inputClass} min-h-[160px] resize-y leading-6`}
        value={value.map((c) => c.name).join("\n")}
        onChange={(e) =>
          onChange(
            e.target.value
              .split(/\n+/)
              .map((line) => line.trim())
              .filter(Boolean)
              .map((name, index) => ({
                id: value[index]?.id ?? `${index}`,
                name,
                issuer: value[index]?.issuer ?? "",
                date: value[index]?.date ?? "",
              })),
          )
        }
      />
    </SectionCard>
  )
}

function AnalysisPanel({ resume }: { resume: TailoredResume }) {
  const found = resume.keywordCoverage.filter((k) => k.status === "found_and_used")
  const needs = resume.keywordCoverage.filter((k) => k.status === "needs_confirmation")
  const missing = resume.keywordCoverage.filter((k) => k.status !== "found_and_used" && k.status !== "needs_confirmation")
  return (
    <div className="flex-1 overflow-y-auto p-stack-md bg-surface-container-low">
      <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-stack-md mb-stack-md">
        <h3 className="font-label-uppercase text-label-uppercase text-on-surface-variant mb-2">Score</h3>
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold text-secondary">{resume.tailoredScore}%</span>
          <span className="text-body-sm text-on-surface-variant">
            (was {resume.originalScore}%, lift +{Math.max(resume.tailoredScore - resume.originalScore, 0)})
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-stack-md mb-stack-md">
        <h3 className="font-label-uppercase text-label-uppercase text-on-surface-variant mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">radar</span> Keyword coverage
        </h3>
        <KeywordBadges title="Found" tone="ok" items={found.map((k) => k.keyword)} />
        <KeywordBadges title="Needs proof" tone="warn" items={needs.map((k) => k.keyword)} />
        <KeywordBadges title="Missing" tone="muted" items={missing.map((k) => k.keyword)} />
      </div>

      <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-stack-md">
        <h3 className="font-label-uppercase text-label-uppercase text-on-surface-variant mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">list_alt</span> Change log
        </h3>
        {resume.changeLog.length === 0 && (
          <p className="text-body-sm text-on-surface-variant">No safe rewrites recorded yet.</p>
        )}
        <ul className="flex flex-col gap-2">
          {resume.changeLog.slice(0, 30).map((entry) => (
            <li key={entry.id} className="text-body-sm text-on-surface-variant">
              <span className="font-medium text-primary">{entry.section}</span>
              {entry.keyword && <span> · {entry.keyword}</span>}
              <span className="block text-xs text-on-surface-variant/80 mt-0.5">{entry.reason}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function KeywordBadges({ title, tone, items }: { title: string; tone: "ok" | "warn" | "muted"; items: string[] }) {
  if (items.length === 0) return null
  const colors =
    tone === "ok"
      ? "bg-green-500/10 text-green-700 border-green-500/30"
      : tone === "warn"
        ? "bg-amber-500/10 text-amber-700 border-amber-500/30"
        : "bg-surface-container-high text-on-surface-variant border-outline-variant/30"
  return (
    <div className="mb-3">
      <div className="text-xs text-on-surface-variant mb-1">
        {title} <span className="opacity-60">({items.length})</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((kw) => (
          <span key={kw} className={`px-2 py-0.5 rounded text-[11px] font-medium border ${colors}`}>
            {kw}
          </span>
        ))}
      </div>
    </div>
  )
}
