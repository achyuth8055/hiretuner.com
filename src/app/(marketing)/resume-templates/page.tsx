import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { TemplateGallery } from "@/components/resume-templates/TemplateGallery"
import { resumeTemplates } from "@/lib/resume-templates/registry"
import { pageMetadata, JsonLd, breadcrumbLd, webApplicationLd } from "@/lib/seo"

const COUNT = resumeTemplates.length
const TITLE = "Resume & CV Templates"
const DESCRIPTION = `Browse ${COUNT}+ free, ATS-friendly resume and CV templates. Preview each design, pick the one that fits your role, and fill it with your details in minutes.`
const PATH = "/resume-templates"

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "resume templates",
    "CV templates",
    "free resume templates",
    "ATS resume template",
    "professional CV template",
    "modern resume template",
  ],
})

export default function ResumeTemplatesPage() {
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: "Resume & CV Templates", path: PATH }])} />
      <JsonLd data={webApplicationLd({ name: TITLE, description: DESCRIPTION, path: PATH })} />

      {/* Hero - text only, LCP-safe */}
      <section className="max-w-[1200px] mx-auto px-margin-page py-stack-xl w-full text-center flex flex-col items-center">
        <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg font-bold text-primary mb-stack-sm max-w-3xl leading-tight">
          {COUNT}+ free resume &amp; CV templates
        </h1>
        <p className="font-body-base text-body-base text-on-surface-variant max-w-2xl mb-stack-lg text-lg">
          Every template is ATS-friendly, built from clean HTML and CSS - no graphics that break parsing.
          Preview any design, then pick the one that fits the job you want.
        </p>
        <div className="flex flex-col sm:flex-row gap-stack-sm">
          <Button size="lg" className="px-8 py-4 h-auto font-bold tracking-wider rounded-lg" asChild>
            <Link href="/signup">Start With a Template</Link>
          </Button>
          <Button size="lg" variant="outline" className="px-8 py-4 h-auto font-bold tracking-wider rounded-lg" asChild>
            <Link href="/resume-builder">About the Resume Builder</Link>
          </Button>
        </div>
      </section>

      {/* Gallery */}
      <section className="max-w-[1200px] mx-auto px-margin-page pb-stack-xl w-full border-t border-outline-variant/20 pt-stack-lg">
        <TemplateGallery />
      </section>

      {/* CTA */}
      <section className="max-w-[1200px] mx-auto px-margin-page py-stack-xl w-full">
        <div className="bg-primary-container text-on-primary-container rounded-xl p-stack-xl flex flex-col md:flex-row items-center justify-between gap-stack-lg shadow-sm">
          <div className="flex flex-col gap-stack-sm max-w-xl">
            <h2 className="font-headline-md text-headline-md font-bold text-on-primary-fixed">Found one you like?</h2>
            <p className="font-body-base text-body-base text-on-primary-fixed-variant">
              Create your profile once, drop it into any template, and switch designs anytime without retyping a thing.
            </p>
          </div>
          <Button size="lg" variant="secondary" className="px-8 py-4 whitespace-nowrap shadow-sm font-bold tracking-wider rounded-lg h-auto" asChild>
            <Link href="/signup">Build My Resume Free</Link>
          </Button>
        </div>
      </section>
    </>
  )
}
