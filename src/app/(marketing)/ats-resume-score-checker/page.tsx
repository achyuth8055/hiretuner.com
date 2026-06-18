import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { AtsScoreTool } from "@/components/app/PublicTools"
import { pageMetadata } from "@/lib/seo"

export const metadata = pageMetadata({
  title: "Free ATS Resume Score Checker",
  description: "Check your resume's estimated ATS score in seconds. See formatting, section completeness, keyword strength, and the top issues holding your resume back.",
  path: "/ats-resume-score-checker",
})

export default function AtsResumeScoreChecker() {
  return (
    <>
      <section className="max-w-[1200px] mx-auto px-margin-page py-stack-xl w-full text-center flex flex-col items-center">
        <h1 className="font-display-lg text-display-lg md:text-display-lg text-display-lg-mobile font-bold text-primary mb-stack-sm max-w-3xl leading-tight">
          Free ATS Resume Score Checker
        </h1>
        <p className="font-body-base text-body-base text-on-surface-variant max-w-2xl mb-stack-lg">
          Instantly evaluate your resume with an estimated ATS-style score and actionable improvements.
        </p>
      </section>

      <section className="max-w-[1200px] mx-auto px-margin-page pb-stack-xl w-full">
        <AtsScoreTool />
      </section>

      <section className="max-w-[1200px] mx-auto px-margin-page py-stack-xl w-full border-t border-outline-variant/20">
        <div className="bg-primary-container text-on-primary-container rounded-xl p-stack-xl flex flex-col md:flex-row items-center justify-between gap-stack-lg shadow-sm">
          <div className="flex flex-col gap-stack-sm max-w-xl">
            <h2 className="font-headline-md text-headline-md font-bold text-on-primary-fixed">Need a higher score?</h2>
            <p className="font-body-base text-body-base text-on-primary-fixed-variant">
              Tailor your resume to a job description with keyword gap analysis, safe suggestions, and application tracking.
            </p>
          </div>
          <Button size="lg" variant="secondary" className="px-8 py-4 whitespace-nowrap shadow-sm font-bold tracking-wider rounded-lg h-auto" asChild>
            <Link href="/signup">Tailor Resume to a Job Description</Link>
          </Button>
        </div>
      </section>
    </>
  )
}
