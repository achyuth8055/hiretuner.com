import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { InterviewQuestionsTool } from "@/components/app/PublicTools"
import { pageMetadata, JsonLd, breadcrumbLd, webApplicationLd } from "@/lib/seo"

const TITLE = "Interview Question Generator"
const DESCRIPTION =
  "Generate technical, behavioral, role-specific, and resume-based interview questions from any job description so you can practice and prepare with confidence."
const PATH = "/interview-question-generator"

export const metadata = pageMetadata({ title: TITLE, description: DESCRIPTION, path: PATH })

export default function InterviewQuestionGeneratorPage() {
  return (
    <main className="flex-grow w-full max-w-[1200px] mx-auto px-margin-page py-12 md:py-24">
      <JsonLd data={breadcrumbLd([{ name: "Interview Question Generator", path: PATH }])} />
      <JsonLd data={webApplicationLd({ name: TITLE, description: DESCRIPTION, path: PATH })} />
      <div className="text-center mb-16 max-w-3xl mx-auto">
        <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary mb-6">
          Interview Question Generator
        </h1>
        <p className="font-body-base text-body-base text-on-surface-variant text-lg">
          Paste a job description to generate likely technical, behavioral, role-specific, and resume-based interview questions.
        </p>
      </div>
      <InterviewQuestionsTool />
      <section className="mt-stack-xl bg-primary-container text-on-primary-container rounded-xl p-stack-lg flex flex-col md:flex-row justify-between gap-stack-md">
        <div>
          <h2 className="font-headline-md text-headline-md">Tailor your resume for this job</h2>
          <p className="font-body-sm text-body-sm text-on-primary-container/80 mt-1">
            Use the same job description to improve resume alignment before the interview stage.
          </p>
        </div>
        <Button variant="secondary" asChild>
          <Link href="/signup">Tailor Resume for This Job</Link>
        </Button>
      </section>
    </main>
  )
}
