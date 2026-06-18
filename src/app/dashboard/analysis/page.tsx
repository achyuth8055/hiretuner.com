import Link from "next/link"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { getCurrentUser } from "@/lib/auth"
import { getActiveMasterResume, readDatabase } from "@/lib/database"
import { buildKeywordCoverage, scoreResumeAgainstJob } from "@/lib/resume-engine"

export default async function AnalysisPage() {
  const auth = await getCurrentUser()

  if (!auth) {
    redirect("/login")
  }

  const database = readDatabase()
  const latestJob = database.jobDescriptions
    .filter((job) => job.userId === auth.user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  const masterResume = getActiveMasterResume(auth.user.id)
  const score = latestJob && masterResume
    ? scoreResumeAgainstJob(masterResume.parsedText, masterResume.structuredProfile, latestJob.analysis)
    : null
  const coverage = latestJob && masterResume ? buildKeywordCoverage(masterResume.parsedText, latestJob.analysis) : []

  if (!latestJob) {
    return (
      <div className="flex-1 w-full p-margin-page max-w-[1400px] mx-auto">
        <div className="bg-surface-container-lowest border border-outline-variant/50 rounded-lg p-stack-xl text-center">
          <h1 className="font-headline-md text-headline-md text-primary">No job analysis yet</h1>
          <p className="text-body-sm text-on-surface-variant mt-2">
            Paste a job description from the dashboard to generate the first analysis.
          </p>
          <Button className="mt-6" asChild>
            <Link href="/dashboard">Analyze a Job Description</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 w-full p-margin-page pb-32 max-w-[1400px] mx-auto">
      <header className="mb-stack-lg flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-label-uppercase text-label-uppercase text-secondary tracking-widest">Analysis Complete</span>
            <span className="text-sm text-on-surface-variant">
              {new Date(latestJob.createdAt).toLocaleString()}
            </span>
          </div>
          <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary mb-2">
            Job Description Analysis
          </h1>
          <p className="text-body-base font-body-base text-on-surface-variant max-w-2xl">
            Detailed breakdown for <strong className="text-primary font-semibold">{latestJob.jobTitle || latestJob.analysis.jobTitle}</strong>
            {latestJob.companyName ? (
              <>
                {" "}at <strong className="text-primary font-semibold">{latestJob.companyName}</strong>
              </>
            ) : null}
            .
          </p>
        </div>
        <div className="flex gap-3 mt-4 md:mt-0">
          <Button variant="outline" asChild>
            <Link href="/dashboard">Edit JD</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard">Generate Tailored Resume</Link>
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter mb-stack-xl">
        <SummaryCard label="Role Detected" value={latestJob.analysis.roleCategory} icon="work" />
        <SummaryCard label="Company" value={latestJob.companyName || "Not specified"} icon="domain" />
        <SummaryCard label="Experience Level" value={latestJob.analysis.experienceLevel} icon="trending_up" />
        <SummaryCard label="Original Match" value={score ? `${score.originalScore}%` : "Upload resume"} icon="analytics" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter mb-stack-xl">
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/50 p-stack-lg shadow-sm flex flex-col items-center justify-center min-h-[300px]">
          <h2 className="font-label-uppercase text-label-uppercase text-on-surface-variant mb-6">
            Estimated Resume Match Score
          </h2>
          <div className="text-5xl font-bold text-primary">{score ? `${score.originalScore}%` : "--"}</div>
          <p className="text-body-sm text-center text-on-surface-variant mt-6 max-w-[260px]">
            {score?.disclaimer ?? "Upload a master resume to calculate score."}
          </p>
        </div>

        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/50 p-stack-lg shadow-sm col-span-1 lg:col-span-2">
          <h2 className="font-label-uppercase text-label-uppercase text-on-surface-variant mb-6">Analysis Breakdown</h2>
          {score ? (
            <div className="flex flex-col gap-5">
              {Object.entries(score.breakdown).map(([label, value]) => (
                <div key={label}>
                  <div className="flex justify-between text-body-sm mb-2">
                    <span className="font-semibold text-primary">{label.replace(/([A-Z])/g, " $1")}</span>
                    <span className="text-secondary font-medium">{value}%</span>
                  </div>
                  <div className="w-full bg-surface-container-high rounded-full h-1.5">
                    <div className="bg-secondary h-1.5 rounded-full" style={{ width: `${value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-body-sm text-on-surface-variant">No score available until a master resume is uploaded.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
        <KeywordPanel title="Required Skills" keywords={latestJob.analysis.requiredSkills} />
        <KeywordPanel title="Keyword Gap" keywords={coverage.filter((item) => item.status === "needs_confirmation" || item.status === "not_recommended").map((item) => item.keyword)} />
      </div>
    </div>
  )
}

function SummaryCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="bg-surface-container-lowest p-stack-md rounded-xl border border-outline-variant/50 shadow-sm">
      <span className="font-label-uppercase text-label-uppercase text-on-surface-variant mb-2 flex items-center gap-2">
        <span className="material-symbols-outlined text-[16px]">{icon}</span>
        {label}
      </span>
      <span className="text-lg font-headline-md text-primary font-semibold">{value}</span>
    </div>
  )
}

function KeywordPanel({ title, keywords }: { title: string; keywords: string[] }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/50 p-stack-lg shadow-sm">
      <h3 className="font-label-uppercase text-label-uppercase text-on-surface-variant mb-6 border-b border-outline-variant/20 pb-2">
        {title}
      </h3>
      <div className="flex flex-wrap gap-2">
        {keywords.length === 0 ? (
          <span className="text-body-sm text-on-surface-variant">None detected.</span>
        ) : (
          keywords.map((keyword) => (
            <span key={keyword} className="px-3 py-1 bg-surface-container border border-outline-variant/30 rounded-md text-body-sm font-medium text-primary shadow-sm">
              {keyword}
            </span>
          ))
        )}
      </div>
    </div>
  )
}
