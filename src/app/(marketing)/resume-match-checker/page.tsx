import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { ResumeMatchTool } from "@/components/app/PublicTools"
import { pageMetadata } from "@/lib/seo"

export const metadata = pageMetadata({
  title: "Resume Match Checker: Compare Resume to Job Description",
  description: "Paste your resume and a job description to get an estimated match score, missing keywords, and clear suggestions to tailor your resume for the role.",
  path: "/resume-match-checker",
})

export default function ResumeMatchCheckerPage() {
  return (
    <>
      <section className="max-w-[1200px] mx-auto px-margin-page pt-stack-xl pb-stack-lg text-center">
        <h1 className="font-display-lg text-display-lg text-primary mb-stack-sm">Resume Match Checker</h1>
        <p className="font-body-base text-body-base text-on-surface-variant max-w-2xl mx-auto">
          Paste your resume and a job description to analyze keyword gaps and estimated alignment before you apply.
        </p>
      </section>

      <section className="max-w-[1200px] mx-auto px-margin-page pb-stack-xl">
        <ResumeMatchTool />
      </section>

      <section className="max-w-[1200px] mx-auto px-margin-page pb-stack-xl">
        <div className="bg-primary-container text-on-primary-container rounded-xl p-stack-lg flex flex-col md:flex-row justify-between gap-stack-md">
          <div>
            <h2 className="font-headline-md text-headline-md">Ready to tailor the resume?</h2>
            <p className="font-body-sm text-body-sm text-on-primary-container/80 mt-1">
              Create a free account to save results, generate tailored resumes, and track applications.
            </p>
          </div>
          <Button variant="secondary" asChild>
            <Link href="/signup">Generate Tailored Resume</Link>
          </Button>
        </div>
      </section>
    </>
  )
}
