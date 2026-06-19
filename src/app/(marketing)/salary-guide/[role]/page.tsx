import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { Button } from "@/components/ui/Button"
import { pageMetadata, JsonLd, breadcrumbLd, articleLd } from "@/lib/seo"
import { salaryGuides, getSalaryGuide } from "@/lib/salary-guides"

type Params = { role: string }

export function generateStaticParams(): Params[] {
  return salaryGuides.map((guide) => ({ role: guide.slug }))
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { role } = await params
  const guide = getSalaryGuide(role)
  if (!guide) {
    return pageMetadata({ title: "Salary guide not found", description: "This salary guide could not be found.", path: `/salary-guide/${role}`, index: false })
  }
  const title = `${guide.role} Salary Guide 2026`
  return pageMetadata({
    title,
    description: `${guide.role} salaries by experience level, the skills that raise pay, and how to tailor your resume for top-paying ${guide.role} roles.`,
    path: `/salary-guide/${guide.slug}`,
    keywords: [`${guide.role} salary`, `${guide.role} salary guide`, `${guide.stream} salary`, "tech salary 2026"],
  })
}

export default async function SalaryGuidePage({ params }: { params: Promise<Params> }) {
  const { role } = await params
  const guide = getSalaryGuide(role)
  if (!guide) notFound()

  const path = `/salary-guide/${guide.slug}`
  const title = `${guide.role} Salary Guide 2026`
  const related = salaryGuides.filter((other) => other.slug !== guide.slug && other.stream === guide.stream).slice(0, 3)
  const fallbackRelated = related.length ? related : salaryGuides.filter((other) => other.slug !== guide.slug).slice(0, 3)

  return (
    <main className="flex-grow">
      <JsonLd data={breadcrumbLd([{ name: "Salary Guides", path: "/salary-guide" }, { name: guide.role, path }])} />
      <JsonLd
        data={articleLd({
          headline: title,
          description: guide.blurb,
          path,
          datePublished: "2026-01-15",
          dateModified: "2026-06-18",
        })}
      />

      {/* Hero */}
      <section className="max-w-[1100px] mx-auto px-margin-page py-stack-xl flex flex-col gap-stack-md">
        <nav className="font-body-sm text-body-sm text-on-surface-variant">
          <Link href="/salary-guide" className="hover:text-secondary transition-colors">&larr; All salary guides</Link>
        </nav>
        <span className="font-label-uppercase text-label-uppercase tracking-widest text-secondary">{guide.stream}</span>
        <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary">
          {guide.role} Salary Guide
        </h1>
        <p className="font-body-base text-body-base text-on-surface-variant max-w-3xl text-lg">{guide.blurb}</p>
      </section>

      {/* Salary by level */}
      <section className="max-w-[1100px] mx-auto px-margin-page pb-stack-xl w-full">
        <h2 className="font-headline-md text-headline-md font-bold text-primary mb-stack-md">{guide.role} salary by experience level</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-stack-md">
          {guide.levels.map((level) => (
            <div key={level.level} className="bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/30 rounded-xl p-stack-lg flex flex-col gap-stack-xs shadow-sm">
              <span className="font-label-uppercase text-label-uppercase text-on-surface-variant">{level.level}</span>
              <span className="font-headline-sm text-headline-sm font-bold text-primary">{level.range}</span>
            </div>
          ))}
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-stack-sm">
          Figures are broad market estimates in USD for full-time roles and vary by company, location, and individual experience.
        </p>
      </section>

      {/* Skills + factors */}
      <section className="max-w-[1100px] mx-auto px-margin-page pb-stack-xl w-full grid grid-cols-1 md:grid-cols-2 gap-stack-lg border-t border-outline-variant/20 pt-stack-lg">
        <div>
          <h2 className="font-headline-md text-headline-md font-bold text-primary mb-stack-sm">In-demand {guide.role} skills</h2>
          <div className="flex flex-wrap gap-2">
            {guide.skills.map((skill) => (
              <span key={skill} className="bg-secondary-container/40 text-on-secondary-container px-3 py-1 rounded-full font-body-sm text-body-sm">
                {skill}
              </span>
            ))}
          </div>
        </div>
        <div>
          <h2 className="font-headline-md text-headline-md font-bold text-primary mb-stack-sm">What moves your pay</h2>
          <ul className="flex flex-col gap-2 pl-5 list-disc marker:text-secondary">
            {guide.factors.map((factor) => (
              <li key={factor} className="font-body-base text-body-base text-on-surface-variant">{factor}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary text-on-primary py-stack-xl">
        <div className="max-w-[1100px] mx-auto px-margin-page text-center flex flex-col gap-stack-md items-center">
          <h2 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg">Ready to earn your range?</h2>
          <p className="font-body-base text-body-base max-w-2xl opacity-90">
            Tailor your resume to the highest-paying {guide.role} roles, with the keywords recruiters actually search for.
          </p>
          <Button size="lg" variant="secondary" className="mt-stack-sm px-8 py-4 h-auto font-bold tracking-wider rounded-lg" asChild>
            <Link href="/signup">Tailor My Resume Free</Link>
          </Button>
        </div>
      </section>

      {/* Related guides */}
      <section className="max-w-[1100px] mx-auto px-margin-page py-stack-xl w-full">
        <h2 className="font-headline-md text-headline-md font-bold text-primary mb-stack-md">Other salary guides</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-gutter">
          {fallbackRelated.map((other) => (
            <Link key={other.slug} href={`/salary-guide/${other.slug}`} className="flex flex-col gap-1 group border border-outline-variant/30 rounded-xl p-stack-md hover:border-secondary transition-colors">
              <span className="font-label-uppercase text-xs text-secondary">{other.stream}</span>
              <span className="font-headline-sm text-headline-sm text-primary group-hover:text-secondary transition-colors">{other.role}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
