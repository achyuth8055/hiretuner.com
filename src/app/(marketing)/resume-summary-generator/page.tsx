import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { SummaryGeneratorTool } from "@/components/app/PublicTools"
import { pageMetadata } from "@/lib/seo"

export const metadata = pageMetadata({
  title: "Resume Summary Generator",
  description: "Generate conservative, balanced, keyword-rich, or short ATS-friendly resume summaries tailored to your target role in seconds. Pick the tone that fits.",
  path: "/resume-summary-generator",
})

export default function ResumeSummaryGeneratorPage() {
  return (
    <main className="flex-grow w-full max-w-[1200px] mx-auto px-margin-page py-12 md:py-24">
      <div className="text-center mb-16 max-w-3xl mx-auto">
        <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary mb-6">
          Resume Summary Generator
        </h1>
        <p className="font-body-base text-body-base text-on-surface-variant text-lg">
          Generate role-specific resume summaries from your target role, experience, skills, and optional job description.
        </p>
      </div>
      <SummaryGeneratorTool />
      <section className="mt-stack-xl bg-primary-container text-on-primary-container rounded-xl p-stack-lg flex flex-col md:flex-row justify-between gap-stack-md">
        <div>
          <h2 className="font-headline-md text-headline-md">Create your master resume profile</h2>
          <p className="font-body-sm text-body-sm text-on-primary-container/80 mt-1">
            Save summaries and use them in tailored resume workflows.
          </p>
        </div>
        <Button variant="secondary" asChild>
          <Link href="/signup">Create My Master Resume Profile</Link>
        </Button>
      </section>
    </main>
  )
}
