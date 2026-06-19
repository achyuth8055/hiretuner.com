import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { KeywordScannerTool } from "@/components/app/PublicTools"
import { pageMetadata, JsonLd, breadcrumbLd, webApplicationLd } from "@/lib/seo"

const TITLE = "Resume Keyword Scanner"
const DESCRIPTION =
  "Scan your resume for technical and soft skills, spot missing role keywords, and get placement recommendations to pass keyword-based ATS filters."
const PATH = "/resume-keyword-scanner"

export const metadata = pageMetadata({ title: TITLE, description: DESCRIPTION, path: PATH })

export default function ResumeKeywordScannerPage() {
  return (
    <main className="flex-grow w-full max-w-[1200px] mx-auto px-margin-page py-stack-xl flex flex-col gap-stack-xl">
      <JsonLd data={breadcrumbLd([{ name: "Resume Keyword Scanner", path: PATH }])} />
      <JsonLd data={webApplicationLd({ name: TITLE, description: DESCRIPTION, path: PATH })} />
      <section>
        <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-primary mb-stack-sm">
          Resume Keyword Scanner
        </h1>
        <p className="text-on-surface-variant font-body-base text-body-base max-w-2xl">
          Analyze your resume against target roles, uncover missing keywords, and improve ATS-friendly placement.
        </p>
      </section>

      <KeywordScannerTool />

      <section className="bg-primary-container text-on-primary-container rounded-xl p-stack-lg flex flex-col md:flex-row justify-between gap-stack-md">
        <div>
          <h2 className="font-headline-md text-headline-md">Compare against a job description</h2>
          <p className="font-body-sm text-body-sm text-on-primary-container/80 mt-1">
            Keyword scanning is strongest when paired with a real JD.
          </p>
        </div>
        <Button variant="secondary" asChild>
          <Link href="/resume-match-checker">Compare Against a JD</Link>
        </Button>
      </section>
    </main>
  )
}
