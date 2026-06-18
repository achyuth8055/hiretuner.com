import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { BulletGeneratorTool } from "@/components/app/PublicTools"
import { pageMetadata } from "@/lib/seo"

export const metadata = pageMetadata({
  title: "Resume Bullet Point Generator",
  description: "Turn weak, vague resume bullets into stronger, role-specific, ATS-friendly options that highlight measurable impact and the right keywords for the job.",
  path: "/resume-bullet-point-generator",
})

export default function ResumeBulletPointGeneratorPage() {
  return (
    <main className="flex-grow w-full max-w-[1200px] mx-auto px-margin-page py-12 md:py-24">
      <div className="text-center mb-16 max-w-3xl mx-auto">
        <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary mb-6">
          Elevate Your Experience.
        </h1>
        <p className="font-body-base text-body-base text-on-surface-variant text-lg">
          Transform weak bullet points into stronger, role-specific bullets with metric suggestions and unsupported-claim warnings.
        </p>
      </div>

      <BulletGeneratorTool />

      <section className="mt-stack-xl bg-primary-container text-on-primary-container rounded-xl p-stack-lg flex flex-col md:flex-row justify-between gap-stack-md">
        <div>
          <h2 className="font-headline-md text-headline-md">Save bullets to your master resume</h2>
          <p className="font-body-sm text-body-sm text-on-primary-container/80 mt-1">
            Create a free account to manage your master profile and tailor full resumes.
          </p>
        </div>
        <Button variant="secondary" asChild>
          <Link href="/signup">Add to My Master Resume</Link>
        </Button>
      </section>
    </main>
  )
}
