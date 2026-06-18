"use client"

import { useState } from "react"
import Link from "next/link"
import { UpgradeButton } from "@/components/app/UpgradeButton"
import type { Application, JobDescription, PlanType, TailoredResume } from "@/lib/rolefit-types"

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

export function EditorWorkspace({ initial }: EditorWorkspaceProps) {
  const [resumeText, setResumeText] = useState(initial.tailoredResume.resumeText)
  const [loading, setLoading] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [upgradeMessage, setUpgradeMessage] = useState("")

  async function save() {
    setLoading("save")
    setMessage("")
    setError("")

    try {
      const response = await fetch(`/api/tailored-resumes/${initial.tailoredResume.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText }),
      })
      const json = (await response.json()) as ApiResponse<{ tailoredResume: TailoredResume }>

      if (!response.ok || !json.ok) {
        throw new Error(json.error?.message ?? "Unable to save resume.")
      }

      setMessage("Resume version saved.")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save resume.")
    } finally {
      setLoading("")
    }
  }

  async function copyPlainText() {
    await navigator.clipboard.writeText(resumeText)
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
      anchor.download = `rolefit-resume-v${initial.tailoredResume.versionNumber}.pdf`
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
      <header className="bg-surface/80 dark:bg-surface-container-highest/80 backdrop-blur-md text-primary docked full-width top-0 sticky z-50 border-b border-outline-variant/30 shadow-sm flex justify-between items-center w-full px-margin-page py-4">
        <div className="flex items-center gap-stack-md">
          <Link href="/dashboard" className="font-headline-md text-headline-md font-bold text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
              auto_awesome
            </span>
            HireTuner
          </Link>
          <div className="h-6 w-px bg-outline-variant/30 mx-2" />
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="font-label-uppercase text-label-uppercase text-on-surface-variant">Original Score</span>
              <span className="font-headline-md text-headline-md text-on-surface-variant opacity-70">
                {initial.tailoredResume.originalScore}%
              </span>
            </div>
            <span className="material-symbols-outlined text-outline-variant">arrow_forward</span>
            <div className="flex flex-col">
              <span className="font-label-uppercase text-label-uppercase text-secondary">Tailored Score</span>
              <span className="font-headline-md text-headline-md text-secondary">
                {initial.tailoredResume.tailoredScore}%
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-stack-md">
          <button onClick={save} disabled={loading === "save"} className="px-4 py-2 text-on-surface-variant hover:bg-surface-container-high rounded transition-colors text-body-sm font-body-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">save</span>
            {loading === "save" ? "Saving..." : "Save Version"}
          </button>
          <button onClick={copyPlainText} className="px-4 py-2 border border-outline-variant/50 hover:border-secondary hover:text-secondary rounded bg-surface-container-lowest text-body-sm font-body-sm flex items-center gap-2 transition-colors">
            <span className="material-symbols-outlined text-[18px]">content_copy</span>
            Copy Plain Text
          </button>
          <button onClick={downloadPdf} disabled={loading === "download"} className="px-4 py-2 bg-primary text-on-primary rounded text-body-sm font-body-sm flex items-center gap-2 hover:bg-primary/90 transition-colors focus:ring-2 focus:ring-secondary focus:outline-none">
            <span className="material-symbols-outlined text-[18px]">download</span>
            {loading === "download" ? "Preparing..." : "Download PDF"}
          </button>
        </div>
      </header>

      {(message || error || upgradeMessage) && (
        <div className="px-margin-page py-2 border-b border-outline-variant/20 bg-surface-container-lowest">
          {message && <p className="text-body-sm text-primary">{message}</p>}
          {error && <p className="text-body-sm text-error">{error}</p>}
          {upgradeMessage && (
            <div className="flex items-center justify-between gap-4">
              <p className="text-body-sm text-primary">{upgradeMessage}</p>
              <UpgradeButton className="w-56" />
            </div>
          )}
        </div>
      )}

      <main className="flex-1 flex overflow-hidden">
        <aside className="w-64 border-r border-outline-variant/20 bg-surface flex flex-col p-stack-md gap-stack-sm flex-shrink-0 z-10">
          <div className="mb-4">
            <h2 className="font-label-uppercase text-label-uppercase text-on-surface-variant mb-2">Sections</h2>
          </div>
          <nav className="flex flex-col gap-1">
            {["Summary", "Skills", "Experience", "Projects", "Education", "Certifications"].map((section) => (
              <button key={section} className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-all text-body-sm font-body-sm text-left">
                <span className="material-symbols-outlined text-[20px]">{section === "Summary" ? "person" : section === "Skills" ? "bolt" : section === "Experience" ? "work" : section === "Projects" ? "rocket_launch" : section === "Education" ? "school" : "workspace_premium"}</span>
                {section}
              </button>
            ))}
          </nav>
          <div className="mt-auto pt-4 border-t border-outline-variant/20">
            <p className="text-xs text-on-surface-variant">
              Review your resume before downloading. You are always in control of the final content.
            </p>
          </div>
        </aside>

        <section className="flex-1 bg-surface-container-low overflow-y-auto relative">
          <div className="max-w-3xl mx-auto py-stack-lg px-gutter pb-32">
            <div className="flex items-center justify-between mb-stack-lg">
              <div>
                <h1 className="font-headline-md text-headline-md text-primary">Structured Resume Editor</h1>
                <p className="text-body-sm text-on-surface-variant">
                  {initial.jobDescription?.jobTitle || "Tailored resume"} {initial.jobDescription?.companyName ? `at ${initial.jobDescription.companyName}` : ""}
                </p>
              </div>
              <span className="text-xs bg-secondary/10 text-secondary border border-secondary/20 px-2 py-1 rounded">
                v{initial.tailoredResume.versionNumber}
              </span>
            </div>
            <textarea
              className="w-full min-h-[720px] bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-stack-lg shadow-sm font-mono text-[13px] leading-6 text-primary outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 resize-y"
              value={resumeText}
              onChange={(event) => setResumeText(event.target.value)}
            />
          </div>
        </section>

        <aside className="w-[400px] border-l border-outline-variant/20 bg-surface flex flex-col flex-shrink-0 relative z-20">
          <div className="flex border-b border-outline-variant/20">
            <button className="flex-1 py-3 text-body-sm font-body-sm font-semibold text-primary border-b-2 border-secondary bg-surface-container-lowest">
              Live Preview
            </button>
            <button className="flex-1 py-3 text-body-sm font-body-sm text-on-surface-variant hover:bg-surface-container-high transition-colors">
              Analysis
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-stack-md bg-surface-container-high/50">
            <div className="bg-white shadow-sm border border-outline-variant/20 p-6 aspect-[8.5/11] w-full text-[10px] font-serif text-gray-800 leading-tight whitespace-pre-wrap">
              {resumeText}
            </div>
          </div>
          <div className="h-64 border-t border-outline-variant/20 bg-surface-container-lowest flex flex-col p-stack-md">
            <h3 className="font-label-uppercase text-label-uppercase text-on-surface-variant mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">radar</span> Keyword Coverage
            </h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {initial.tailoredResume.keywordCoverage.slice(0, 10).map((item) => (
                <span
                  key={`${item.keyword}-${item.status}`}
                  className={`px-2 py-1 rounded text-[11px] font-medium border ${
                    item.status === "found_and_used"
                      ? "bg-green-500/10 text-green-600 border-green-500/20"
                      : item.status === "needs_confirmation"
                        ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                        : "bg-surface-container-high text-on-surface-variant border-outline-variant/30"
                  }`}
                >
                  {item.keyword}
                </span>
              ))}
            </div>
            <div className="mt-auto text-body-sm font-body-sm text-on-surface-variant border-t border-outline-variant/20 pt-2">
              {initial.tailoredResume.changeLog.length} safe tailoring changes logged.
            </div>
          </div>
        </aside>
      </main>
    </div>
  )
}
