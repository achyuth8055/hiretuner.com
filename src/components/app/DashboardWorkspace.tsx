"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { UpgradeButton } from "@/components/app/UpgradeButton"
import type {
  Application,
  JobDescription,
  KeywordCoverageItem,
  MasterResume,
  PlanType,
  ResumeMatchScore,
  Subscription,
  TailoredResume,
  Usage,
} from "@/lib/rolefit-types"

type PlanLimits = {
  jdScans: number
  tailoredResumes: number
  pdfDownloads: number | null
}

type DashboardWorkspaceProps = {
  initial: {
    user: { id: string; name: string; email: string }
    plan: PlanType
    limits: PlanLimits
    subscription: Subscription | null
    usage: Usage
    masterResume: MasterResume | null
    applications: Application[]
    tailoredResumes: TailoredResume[]
    missingSkillsInsight: string[]
    averageScoreLift: number
  }
}

type AnalysisState = {
  jobDescription: JobDescription
  score: ResumeMatchScore | null
  keywordCoverage: KeywordCoverageItem[]
  requiresMasterResume: boolean
}

type ApiResponse<T> = {
  ok?: boolean
  data?: T
  error?: { message?: string; code?: string; details?: unknown }
}

export function DashboardWorkspace({ initial }: DashboardWorkspaceProps) {
  const [masterResume, setMasterResume] = useState(initial.masterResume)
  const [applications, setApplications] = useState(initial.applications)
  const [usage, setUsage] = useState(initial.usage)
  const [file, setFile] = useState<File | null>(null)
  const [uploadState, setUploadState] = useState<"empty" | "selected" | "uploading" | "parsing" | "success" | "error">(
    initial.masterResume ? "success" : "empty"
  )
  const [jobTitle, setJobTitle] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [jobUrl, setJobUrl] = useState("")
  const [rawText, setRawText] = useState("")
  const [analysis, setAnalysis] = useState<AnalysisState | null>(null)
  const [loading, setLoading] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [upgradeMessage, setUpgradeMessage] = useState("")

  const appResumeById = useMemo(() => {
    const map = new Map<string, TailoredResume>()
    initial.tailoredResumes.forEach((resume) => map.set(resume.id, resume))
    return map
  }, [initial.tailoredResumes])

  async function uploadResume(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setSuccess("")

    if (!file) {
      setError("Choose a PDF, DOCX, or TXT resume first.")
      setUploadState("error")
      return
    }

    const formData = new FormData()
    formData.set("file", file)
    setUploadState("uploading")
    setLoading("upload")

    try {
      setUploadState("parsing")
      const response = await fetch("/api/resumes/master", { method: "POST", body: formData })
      const json = (await response.json()) as ApiResponse<{ masterResume: MasterResume }>

      if (!response.ok || !json.ok || !json.data?.masterResume) {
        throw new Error(json.error?.message ?? "Resume upload failed.")
      }

      setMasterResume(json.data.masterResume)
      setUploadState("success")
      setSuccess("Master resume parsed and saved.")
    } catch (reason) {
      setUploadState("error")
      setError(reason instanceof Error ? reason.message : "Resume upload failed.")
    } finally {
      setLoading("")
    }
  }

  async function analyzeJob(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setSuccess("")
    setUpgradeMessage("")
    setLoading("analysis")

    try {
      const response = await fetch("/api/job-descriptions/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobTitle, companyName, jobUrl, rawText }),
      })
      const json = (await response.json()) as ApiResponse<AnalysisState>

      if (response.status === 402) {
        setUpgradeMessage(json.error?.message ?? "Upgrade required.")
        return
      }

      if (!response.ok || !json.ok || !json.data) {
        throw new Error(json.error?.message ?? "Job description analysis failed.")
      }

      setAnalysis(json.data)
      setUsage((current) => ({ ...current, jdScansUsed: current.jdScansUsed + 1 }))
      setSuccess("Job description analyzed. Review the score and keyword gap below.")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Job description analysis failed.")
    } finally {
      setLoading("")
    }
  }

  async function generateTailoredResume() {
    if (!analysis) return
    setError("")
    setSuccess("")
    setUpgradeMessage("")
    setLoading("tailor")

    const confirmedSkills = analysis.keywordCoverage
      .filter((item) => item.confirmed)
      .map((item) => item.keyword)

    try {
      const response = await fetch("/api/tailored-resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescriptionId: analysis.jobDescription.id, confirmedSkills }),
      })
      const json = (await response.json()) as ApiResponse<{
        tailoredResume: TailoredResume
        application: Application
      }>

      if (response.status === 402) {
        setUpgradeMessage(json.error?.message ?? "Upgrade required.")
        return
      }

      if (!response.ok || !json.ok || !json.data) {
        throw new Error(json.error?.message ?? "Resume generation failed.")
      }

      window.location.href = `/editor?id=${json.data.tailoredResume.id}`
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Resume generation failed.")
    } finally {
      setLoading("")
    }
  }

  async function updateStatus(applicationId: string, status: Application["status"]) {
    const response = await fetch(`/api/applications/${applicationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    const json = (await response.json()) as ApiResponse<{ application: Application }>

    if (response.ok && json.ok && json.data?.application) {
      setApplications((items) =>
        items.map((item) => (item.id === applicationId ? json.data!.application : item))
      )
    } else {
      setError(json.error?.message ?? "Unable to update application status.")
    }
  }

  const jdPercent = Math.min(100, Math.round((usage.jdScansUsed / initial.limits.jdScans) * 100))
  const tailorPercent = Math.min(
    100,
    Math.round((usage.tailoredResumesUsed / initial.limits.tailoredResumes) * 100)
  )

  return (
    <div className="p-gutter flex-1 overflow-y-auto max-w-[1400px] mx-auto w-full">
      <div className="mb-stack-lg flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h2 className="font-headline-md text-headline-md text-primary">Your job search workspace</h2>
          <p className="font-body-base text-body-base text-on-surface-variant mt-1">
            Track tailored applications and monitor your resume performance.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/editor">Open Latest Resume</Link>
          </Button>
        </div>
      </div>

      {(error || success || upgradeMessage) && (
        <div className="mb-stack-md grid gap-2">
          {error && <div className="rounded border border-error/30 bg-error/5 p-3 text-body-sm text-error">{error}</div>}
          {success && (
            <div className="rounded border border-[#10B981]/30 bg-[#10B981]/5 p-3 text-body-sm text-primary">
              {success}
            </div>
          )}
          {upgradeMessage && (
            <div className="rounded border border-secondary/30 bg-secondary/5 p-3 text-body-sm text-primary flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span>{upgradeMessage}</span>
              <UpgradeButton className="sm:w-56" />
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter mb-stack-xl">
        <MetricCard icon="document_scanner" label="JD Scans Used" value={usage.jdScansUsed} total={initial.limits.jdScans} percent={jdPercent} />
        <MetricCard icon="auto_fix_high" label="Tailored Resumes" value={usage.tailoredResumesUsed} total={initial.limits.tailoredResumes} percent={tailorPercent} />
        <MetricCard icon="trending_up" label="Avg. Score Lift" value={`+${initial.averageScoreLift}%`} />
        <MetricCard icon="checklist" label="Apps Tracked" value={applications.length} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-gutter mb-stack-xl">
        <form onSubmit={uploadResume} className="bg-surface-container-lowest border border-outline-variant/50 rounded-lg p-stack-md shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-label-uppercase text-label-uppercase text-primary">Master Resume</h3>
            <span className="text-xs text-on-surface-variant">{uploadState.replace("_", " ")}</span>
          </div>
          <label
            htmlFor="master-resume-file"
            onDragOver={(event) => {
              event.preventDefault()
              event.stopPropagation()
            }}
            onDrop={(event) => {
              event.preventDefault()
              event.stopPropagation()
              const dropped = event.dataTransfer.files?.[0]
              if (!dropped) return
              const ok = /\.(pdf|docx|txt)$/i.test(dropped.name)
              if (!ok) {
                setError("Only PDF, DOCX, or TXT files are supported.")
                setUploadState("error")
                return
              }
              setFile(dropped)
              setUploadState("selected")
              setError("")
            }}
            className="block cursor-pointer border-2 border-dashed border-outline-variant/50 hover:border-secondary rounded-lg p-stack-md bg-surface text-center transition-colors"
          >
            <input
              id="master-resume-file"
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={(event) => {
                const picked = event.target.files?.[0] ?? null
                setFile(picked)
                setUploadState(picked ? "selected" : "empty")
                if (picked) setError("")
              }}
              className="sr-only"
            />
            <div className="flex flex-col items-center gap-1">
              <span className="material-symbols-outlined text-secondary text-3xl">upload_file</span>
              {file ? (
                <>
                  <span className="font-medium text-primary text-body-sm">{file.name}</span>
                  <span className="text-xs text-on-surface-variant">
                    {(file.size / 1024).toFixed(1)} KB — click to replace, or drop a new file
                  </span>
                </>
              ) : (
                <>
                  <span className="font-medium text-primary text-body-sm">
                    Drop your resume here, or click to browse
                  </span>
                  <span className="text-xs text-on-surface-variant">
                    Supports PDF, DOCX, and TXT up to 5MB
                  </span>
                </>
              )}
            </div>
          </label>
          {masterResume ? (
            <div className="mt-4 rounded bg-surface-bright border border-outline-variant/20 p-3 text-body-sm">
              <div className="font-medium text-primary">{masterResume.structuredProfile.contact.fullName || "Parsed resume"}</div>
              <div className="text-on-surface-variant text-xs mt-1">
                {masterResume.originalFileName || "Manual profile"} · {masterResume.parsedText.length.toLocaleString()} characters parsed
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded bg-surface-bright border border-outline-variant/20 p-3 text-body-sm text-on-surface-variant">
              Empty state: upload your master resume before generating tailored resumes.
            </div>
          )}
          <Button className="w-full mt-4" disabled={loading === "upload" || !file} type="submit">
            {loading === "upload"
              ? "Parsing..."
              : !file
                ? "Choose a resume to upload"
                : masterResume
                  ? "Replace Master Resume"
                  : "Upload Resume"}
          </Button>
        </form>

        <form onSubmit={analyzeJob} className="xl:col-span-2 bg-surface-container-lowest border border-outline-variant/50 rounded-lg p-stack-md shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-label-uppercase text-label-uppercase text-primary">Tailor New Resume</h3>
            <span className="text-xs text-on-surface-variant">JD analysis</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <input className="rounded border border-outline-variant/50 bg-background px-3 py-2 text-body-sm outline-none focus:border-secondary" placeholder="Job title" value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} />
            <input className="rounded border border-outline-variant/50 bg-background px-3 py-2 text-body-sm outline-none focus:border-secondary" placeholder="Company" value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
            <input className="rounded border border-outline-variant/50 bg-background px-3 py-2 text-body-sm outline-none focus:border-secondary" placeholder="Job URL" value={jobUrl} onChange={(event) => setJobUrl(event.target.value)} />
          </div>
          <textarea
            className="w-full min-h-[180px] rounded border border-outline-variant/50 bg-background p-3 text-body-sm outline-none focus:border-secondary resize-y"
            placeholder="Paste the full job description here, including responsibilities, required skills, preferred qualifications, tools, technologies, and company details."
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
            required
          />
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <Button disabled={loading === "analysis"} type="submit">
              {loading === "analysis" ? "Analyzing..." : "Analyze Job Description"}
            </Button>
            <Button disabled={!analysis || loading === "tailor"} type="button" variant="secondary" onClick={generateTailoredResume}>
              {loading === "tailor" ? "Generating..." : "Generate Tailored Resume"}
            </Button>
          </div>
        </form>
      </div>

      {analysis && (
        <div className="bg-surface-container-lowest border border-outline-variant/50 rounded-lg p-stack-md shadow-sm mb-stack-xl">
          <div className="flex flex-col lg:flex-row gap-gutter">
            <div className="lg:w-72">
              <h3 className="font-label-uppercase text-label-uppercase text-primary mb-2">Analysis Complete</h3>
              <div className="font-headline-md text-headline-md text-primary">
                {analysis.score?.originalScore ?? 0}%
              </div>
              <p className="text-body-sm text-on-surface-variant mt-1">
                Estimated resume match score for {analysis.jobDescription.jobTitle || "this role"}.
              </p>
            </div>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <KeywordBlock title="Required Skills" keywords={analysis.jobDescription.analysis.requiredSkills} />
              <KeywordBlock title="Needs Confirmation" keywords={analysis.keywordCoverage.filter((item) => item.status === "needs_confirmation").map((item) => item.keyword)} />
            </div>
          </div>
          {analysis.score && (
            <p className="text-xs text-on-surface-variant mt-4">{analysis.score.disclaimer}</p>
          )}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-gutter">
        <div className="flex-1 bg-surface-container-lowest border border-outline-variant/50 rounded-lg shadow-sm overflow-hidden flex flex-col">
          <div className="p-stack-md border-b border-outline-variant/30 flex justify-between items-center bg-surface-bright">
            <h3 className="font-label-uppercase text-label-uppercase text-primary">Recent Applications</h3>
            <span className="text-body-sm text-on-surface-variant">{applications.length} total</span>
          </div>
          {applications.length === 0 ? (
            <div className="p-stack-xl text-center">
              <h4 className="font-headline-md text-headline-md text-primary">No applications yet</h4>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
                Paste your first job description and generate a tailored resume in minutes.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-body-sm text-body-sm">
                <thead className="bg-surface-container-low text-on-surface-variant border-b border-outline-variant/30">
                  <tr>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Company & Role</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Match Lift</th>
                    <th className="px-4 py-3 font-medium hidden sm:table-cell">Version</th>
                    <th className="px-4 py-3 font-medium hidden md:table-cell">Date</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {applications.slice(0, 8).map((application) => {
                    const resume = appResumeById.get(application.tailoredResumeId)
                    return (
                      <tr key={application.id} className="hover:bg-surface-container-lowest/50 transition-colors group">
                        <td className="px-4 py-3">
                          <div className="font-medium text-primary">{application.companyName || "Unknown company"}</div>
                          <div className="text-on-surface-variant text-xs mt-0.5">{application.jobTitle || "Untitled role"}</div>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            className="rounded border border-outline-variant/40 bg-background px-2 py-1 text-xs"
                            value={application.status}
                            onChange={(event) => updateStatus(application.id, event.target.value as Application["status"])}
                          >
                            {["Saved", "Applied", "Interview", "Rejected", "Offer"].map((status) => (
                              <option key={status}>{status}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          {resume ? (
                            <div className="flex items-center gap-2">
                              <span className="text-on-surface-variant line-through text-xs">{resume.originalScore}%</span>
                              <span className="material-symbols-outlined text-[12px] text-outline">arrow_right_alt</span>
                              <span className="font-medium text-[#10B981]">{resume.tailoredScore}%</span>
                            </div>
                          ) : (
                            <span className="text-on-surface-variant">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-on-surface-variant hidden sm:table-cell">
                          {resume ? `v${resume.versionNumber}` : "-"}
                        </td>
                        <td className="px-4 py-3 text-on-surface-variant hidden md:table-cell">
                          {new Date(application.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link className="text-secondary hover:underline" href={`/editor?id=${application.tailoredResumeId}`}>
                            Edit
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="w-full lg:w-80 flex flex-col gap-gutter">
          <div className="bg-surface-container-lowest border border-outline-variant/50 rounded-lg p-stack-md shadow-sm">
            <h4 className="font-label-uppercase text-label-uppercase text-primary mb-4">Plan Usage</h4>
            <UsageBar label="JD scans" value={usage.jdScansUsed} total={initial.limits.jdScans} />
            <UsageBar label="Tailor credits" value={usage.tailoredResumesUsed} total={initial.limits.tailoredResumes} />
            <div className="bg-surface-bright rounded p-3 my-4 border border-outline-variant/20">
              <p className="font-body-sm text-body-sm text-on-surface-variant text-xs">
                You are on the <span className="font-medium text-primary">{initial.plan === "starter" ? "Starter Plan" : "Free Plan"}</span>.
                {initial.plan === "free" ? " Upgrade to download PDFs and unlock full limits." : " Starter features are active."}
              </p>
            </div>
            <UpgradeButton />
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant/50 rounded-lg p-stack-md shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-secondary text-sm">lightbulb</span>
              <h4 className="font-label-uppercase text-label-uppercase text-primary">Missing Skills Insight</h4>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant text-xs mb-3">
              Based on recent JD scans, these keywords are frequently missing from your master resume:
            </p>
            <div className="flex flex-wrap gap-2">
              {(initial.missingSkillsInsight.length > 0 ? initial.missingSkillsInsight : ["Docker", "AWS", "CI/CD"]).map((skill) => (
                <span key={skill} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-surface-container-high text-on-surface-variant border border-outline-variant/30">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  icon,
  label,
  value,
  total,
  percent,
}: {
  icon: string
  label: string
  value: number | string
  total?: number
  percent?: number
}) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant/50 rounded-lg p-stack-md flex flex-col justify-between shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <span className="font-label-uppercase text-label-uppercase text-on-surface-variant">{label}</span>
        <span className="material-symbols-outlined text-secondary text-sm">{icon}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-headline-md text-headline-md text-primary">{value}</span>
        {total !== undefined && <span className="font-body-sm text-body-sm text-on-surface-variant">/ {total}</span>}
      </div>
      {percent !== undefined && (
        <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-3 overflow-hidden">
          <div className="bg-secondary h-full rounded-full" style={{ width: `${percent}%` }} />
        </div>
      )}
    </div>
  )
}

function KeywordBlock({ title, keywords }: { title: string; keywords: string[] }) {
  return (
    <div>
      <h4 className="font-label-uppercase text-label-uppercase text-on-surface-variant mb-2">{title}</h4>
      <div className="flex flex-wrap gap-2">
        {keywords.length === 0 ? (
          <span className="text-body-sm text-on-surface-variant">None detected.</span>
        ) : (
          keywords.map((keyword) => (
            <span key={keyword} className="px-2.5 py-1 rounded text-xs font-medium bg-surface-container-high text-primary border border-outline-variant/30">
              {keyword}
            </span>
          ))
        )}
      </div>
    </div>
  )
}

function UsageBar({ label, value, total }: { label: string; value: number; total: number }) {
  const percent = Math.min(100, Math.round((value / total) * 100))
  return (
    <div className="mb-4">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-on-surface-variant">{label}</span>
        <span className="font-medium">
          {value}/{total}
        </span>
      </div>
      <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
        <div className="bg-secondary h-full rounded-full" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
