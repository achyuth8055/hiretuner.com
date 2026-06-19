import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { pageMetadata, JsonLd, breadcrumbLd, webPageLd } from "@/lib/seo"
import { salaryGuides, salaryStreams } from "@/lib/salary-guides"

const TITLE = "Tech Salary Guides 2026"
const DESCRIPTION =
  "Salary guides for developers and tech roles across every stream — backend, frontend, data, ML, DevOps, mobile, design and more. See pay by experience level and the skills that raise it."
const PATH = "/salary-guide"

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: ["tech salary guide", "developer salary 2026", "software engineer salary", "data scientist salary", "salary by role"],
})

export default function SalaryGuideIndexPage() {
  return (
    <main className="flex-grow max-w-[1100px] mx-auto px-margin-page py-stack-xl w-full flex flex-col gap-stack-xl">
      <JsonLd data={breadcrumbLd([{ name: "Salary Guides", path: PATH }])} />
      <JsonLd data={webPageLd({ name: TITLE, description: DESCRIPTION, path: PATH, type: "CollectionPage" })} />

      <header className="flex flex-col gap-stack-md max-w-3xl">
        <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary">
          Tech salary guides for every stream
        </h1>
        <p className="font-body-base text-body-base text-on-surface-variant text-lg">
          Whatever you build, know your worth. Browse salary guides across {salaryStreams.length} disciplines — each with
          pay by experience level, the skills that move it, and how to tailor your resume for the best-paying roles.
        </p>
      </header>

      {salaryStreams.map((stream) => (
        <section key={stream} className="flex flex-col gap-stack-md">
          <h2 className="font-headline-md text-headline-md font-bold text-primary border-b border-outline-variant/30 pb-stack-xs">{stream}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter">
            {salaryGuides
              .filter((guide) => guide.stream === stream)
              .map((guide) => (
                <Link
                  key={guide.slug}
                  href={`/salary-guide/${guide.slug}`}
                  className="flex flex-col gap-stack-xs group border border-outline-variant/30 rounded-xl p-stack-lg bg-surface-container-lowest dark:bg-surface-container-low hover:border-secondary hover:shadow-md transition-all"
                >
                  <span className="font-headline-sm text-headline-sm font-bold text-primary group-hover:text-secondary transition-colors">{guide.role}</span>
                  <span className="font-body-base text-body-base text-secondary">{guide.levels[1].range}</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">Mid-level estimate · {guide.levels.length} levels</span>
                </Link>
              ))}
          </div>
        </section>
      ))}

      <section className="bg-primary-container text-on-primary-container rounded-xl p-stack-xl flex flex-col md:flex-row items-center justify-between gap-stack-lg shadow-sm">
        <div className="flex flex-col gap-stack-sm max-w-xl">
          <h2 className="font-headline-md text-headline-md font-bold text-on-primary-fixed">Aim for the top of your range</h2>
          <p className="font-body-base text-body-base text-on-primary-fixed-variant">
            Tailor your resume to the highest-paying roles in your field with the keywords recruiters search for.
          </p>
        </div>
        <Button size="lg" variant="secondary" className="px-8 whitespace-nowrap shadow-sm font-bold tracking-wider rounded-lg" asChild>
          <Link href="/signup">Tailor My Resume Free</Link>
        </Button>
      </section>
    </main>
  )
}
