import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { AdSlot } from "@/components/ads/AdSlot"
import { pageMetadata, JsonLd, breadcrumbLd, webPageLd } from "@/lib/seo"
import { blogPosts, blogAccentClasses } from "@/lib/blog"

const TITLE = "HireTuner Blog: ATS, Resumes & Job Search Tips"
const DESCRIPTION =
  "Practical guides on beating ATS filters, writing keyword-rich resumes, tailoring applications to job descriptions, and running a smarter, faster job search."
const PATH = "/blog"

export const metadata = pageMetadata({ title: TITLE, description: DESCRIPTION, path: PATH })

export default function Blog() {
  return (
    <div className="max-w-[1200px] mx-auto px-margin-page py-stack-xl flex flex-col gap-stack-xl">
      <JsonLd data={breadcrumbLd([{ name: "Blog", path: PATH }])} />
      <JsonLd data={webPageLd({ name: TITLE, description: DESCRIPTION, path: PATH, type: "CollectionPage" })} />
      <header className="flex flex-col gap-stack-md max-w-[800px]">
        <span className="font-label-uppercase text-label-uppercase text-secondary tracking-widest">The HireTuner blog</span>
        <h1 className="font-display-lg-mobile text-display-lg-mobile md:font-display-lg md:text-display-lg text-primary">
          Insights and strategies for a smarter job search.
        </h1>
        <p className="font-body-base text-body-base text-on-surface-variant">
          Landing interviews in 2026 is as much about understanding the systems behind hiring as it is about your
          experience. Most resumes are read first by software, ranked against a job description, and only then passed to a
          human, if they make the cut. Our blog is where we share practical, no-fluff guidance on how that process
          actually works: how Applicant Tracking Systems parse and score your resume, how to align your wording with a
          posting without ever exaggerating, and how to run a faster, less frustrating job hunt. Every article is written
          to help you get seen for the roles you&apos;re genuinely qualified for.
        </p>
      </header>

      <div className="max-w-[1200px] mx-auto px-margin-page w-full">
        <AdSlot slot="content" />
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
        {blogPosts.map((post) => {
          const accent = blogAccentClasses[post.accent]
          return (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="flex flex-col gap-4 group">
              <div className="w-full h-48 bg-surface-container-high rounded-lg overflow-hidden relative">
                <div className={`absolute inset-0 transition-colors ${accent.overlay}`}></div>
              </div>
              <div>
                <span className={`font-label-uppercase text-xs mb-2 block ${accent.label}`}>{post.category}</span>
                <h2 className="font-headline-md text-primary group-hover:text-secondary transition-colors text-lg">{post.title}</h2>
                <p className="font-body-sm text-on-surface-variant mt-2">{post.excerpt}</p>
                <span className="font-label-uppercase text-xs mt-3 inline-block text-on-surface-variant">{post.readMinutes} min read</span>
              </div>
            </Link>
          )
        })}
      </section>

      <section className="bg-primary-container text-on-primary-container rounded-xl p-stack-xl flex flex-col md:flex-row items-center justify-between gap-stack-lg shadow-sm">
        <div className="flex flex-col gap-stack-sm max-w-xl">
          <h2 className="font-headline-md text-headline-md font-bold text-on-primary-fixed">Put these tips into practice</h2>
          <p className="font-body-base text-body-base text-on-primary-fixed-variant">
            Reading about ATS filters is one thing, beating them is another. Try HireTuner free to see exactly which
            keywords your resume is missing and tailor it to your next role in minutes.
          </p>
        </div>
        <Button size="lg" variant="secondary" className="px-8 whitespace-nowrap shadow-sm font-bold tracking-wider rounded-lg" asChild>
          <Link href="/signup">Start Tailoring Free</Link>
        </Button>
      </section>
    </div>
  )
}
