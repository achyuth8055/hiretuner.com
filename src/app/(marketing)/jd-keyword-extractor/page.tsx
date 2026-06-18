import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { JdKeywordTool } from "@/components/app/PublicTools"
import { pageMetadata } from "@/lib/seo"

export const metadata = pageMetadata({
  title: "Job Description Keyword Extractor",
  description: "Extract required and preferred skills, responsibilities, tools, seniority, and work mode from any job description so you can tailor your resume fast.",
  path: "/jd-keyword-extractor",
})

export default function JdKeywordExtractorPage() {
  return (
    <main className="flex-grow flex flex-col items-center justify-start pt-stack-xl pb-stack-xl px-margin-page w-full max-w-[1200px] mx-auto">
      <div className="text-center w-full max-w-3xl mb-stack-xl">
        <h1 className="font-display-lg text-display-lg md:font-display-lg md:text-display-lg text-primary mb-stack-sm tracking-tight">
          Decode Any Job Description
        </h1>
        <p className="font-body-base text-body-base text-on-surface-variant max-w-2xl mx-auto">
          Paste a job description to extract role, required skills, preferred skills, responsibilities, tools, and seniority.
        </p>
      </div>

      <JdKeywordTool />

      <div className="mt-stack-xl w-full bg-primary-container text-on-primary-container rounded-xl p-stack-lg flex flex-col md:flex-row justify-between gap-stack-md">
        <div>
          <h2 className="font-headline-md text-headline-md">Use these keywords safely</h2>
          <p className="font-body-sm text-body-sm text-on-primary-container/80 mt-1">
            Compare the JD against your resume before adding unsupported skills.
          </p>
        </div>
        <Button variant="secondary" asChild>
          <Link href="/resume-match-checker">Compare My Resume Against This JD</Link>
        </Button>
      </div>
    </main>
  )
}
