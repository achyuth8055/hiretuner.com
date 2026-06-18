import Link from "next/link"
import { redirect } from "next/navigation"
import { EditorWorkspace } from "@/components/app/EditorWorkspace"
import { getCurrentUser } from "@/lib/auth"
import { readDatabase } from "@/lib/database"
import { resolvePlan } from "@/lib/http"

export default async function EditorPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  const auth = await getCurrentUser()

  if (!auth) {
    redirect("/login")
  }

  const { id } = await searchParams
  const database = readDatabase()
  const ownedResumes = database.tailoredResumes
    .filter((resume) => resume.userId === auth.user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const tailoredResume = id
    ? ownedResumes.find((resume) => resume.id === id)
    : ownedResumes[0]

  if (!tailoredResume) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-margin-page">
        <div className="max-w-md bg-surface-container-lowest border border-outline-variant/50 rounded-lg p-stack-lg shadow-sm text-center">
          <h1 className="font-headline-md text-headline-md text-primary">No tailored resume yet</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
            Upload your master resume, analyze a job description, and generate your first tailored resume.
          </p>
          <Link className="inline-flex mt-6 bg-primary text-on-primary px-4 py-2 rounded text-body-sm" href="/dashboard">
            Go to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <EditorWorkspace
      initial={{
        plan: resolvePlan(auth.subscription),
        tailoredResume,
        jobDescription:
          database.jobDescriptions.find((jobDescription) => jobDescription.id === tailoredResume.jobDescriptionId) ??
          null,
        application:
          database.applications.find((application) => application.tailoredResumeId === tailoredResume.id) ??
          null,
      }}
    />
  )
}
