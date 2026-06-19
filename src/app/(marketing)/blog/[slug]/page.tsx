import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { Button } from "@/components/ui/Button"
import { AdSlot } from "@/components/ads/AdSlot"
import { pageMetadata, JsonLd, breadcrumbLd, articleLd } from "@/lib/seo"
import { blogPosts, getBlogPost, blogAccentClasses } from "@/lib/blog"

type Params = { slug: string }

/** Pre-render every blog post at build time. */
export function generateStaticParams(): Params[] {
  return blogPosts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) return pageMetadata({ title: "Article not found", description: "This article could not be found.", path: `/blog/${slug}`, index: false })
  return pageMetadata({ title: post.title, description: post.excerpt, path: `/blog/${post.slug}` })
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
}

export default async function BlogPostPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) notFound()

  const accent = blogAccentClasses[post.accent]
  const path = `/blog/${post.slug}`
  const related = blogPosts.filter((other) => other.slug !== post.slug).slice(0, 3)

  return (
    <article className="max-w-[760px] mx-auto px-margin-page py-stack-xl w-full flex flex-col gap-stack-lg">
      <JsonLd data={breadcrumbLd([{ name: "Blog", path: "/blog" }, { name: post.title, path }])} />
      <JsonLd data={articleLd({ headline: post.title, description: post.excerpt, path, datePublished: post.date })} />

      <nav className="font-body-sm text-body-sm text-on-surface-variant">
        <Link href="/blog" className="hover:text-secondary transition-colors">&larr; All articles</Link>
      </nav>

      <header className="flex flex-col gap-stack-sm">
        <span className={`font-label-uppercase text-label-uppercase tracking-widest ${accent.label}`}>{post.category}</span>
        <h1 className="font-display-lg-mobile text-display-lg-mobile md:font-display-lg md:text-display-lg text-primary leading-tight">
          {post.title}
        </h1>
        <div className="flex items-center gap-3 font-body-sm text-body-sm text-on-surface-variant">
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          <span aria-hidden>·</span>
          <span>{post.readMinutes} min read</span>
        </div>
      </header>

      <p className="font-body-base text-body-base text-on-surface text-lg leading-relaxed">{post.intro}</p>

      <div className="w-full">
        <AdSlot slot="content" />
      </div>

      <div className="flex flex-col gap-stack-lg">
        {post.sections.map((section) => (
          <section key={section.heading} className="flex flex-col gap-stack-sm">
            <h2 className="font-headline-md text-headline-md font-bold text-primary">{section.heading}</h2>
            {section.paragraphs.map((paragraph, index) => (
              <p key={index} className="font-body-base text-body-base text-on-surface-variant leading-relaxed">
                {paragraph}
              </p>
            ))}
            {section.bullets?.length ? (
              <ul className="flex flex-col gap-2 pl-5 list-disc marker:text-secondary">
                {section.bullets.map((bullet, index) => (
                  <li key={index} className="font-body-base text-body-base text-on-surface-variant">{bullet}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>

      {/* CTA */}
      <section className="bg-primary-container text-on-primary-container rounded-xl p-stack-lg flex flex-col md:flex-row items-center justify-between gap-stack-md shadow-sm mt-stack-md">
        <div className="flex flex-col gap-1 max-w-xl">
          <h2 className="font-headline-md text-headline-md font-bold text-on-primary-fixed">Put this into practice</h2>
          <p className="font-body-base text-body-base text-on-primary-fixed-variant">
            See exactly which keywords your resume is missing and tailor it to your next role in minutes.
          </p>
        </div>
        <Button size="lg" variant="secondary" className="px-8 whitespace-nowrap shadow-sm font-bold tracking-wider rounded-lg" asChild>
          <Link href="/signup">Try HireTuner Free</Link>
        </Button>
      </section>

      {/* Related */}
      <section className="flex flex-col gap-stack-md border-t border-outline-variant/30 pt-stack-lg">
        <h2 className="font-headline-md text-headline-md font-bold text-primary">Keep reading</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-gutter">
          {related.map((other) => (
            <Link key={other.slug} href={`/blog/${other.slug}`} className="flex flex-col gap-1 group">
              <span className={`font-label-uppercase text-xs ${blogAccentClasses[other.accent].label}`}>{other.category}</span>
              <span className="font-headline-sm text-headline-sm text-primary group-hover:text-secondary transition-colors">{other.title}</span>
            </Link>
          ))}
        </div>
      </section>
    </article>
  )
}
