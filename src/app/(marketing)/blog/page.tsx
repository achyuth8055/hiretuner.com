import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { AdSlot } from "@/components/ads/AdSlot"
import { pageMetadata } from "@/lib/seo"

export const metadata = pageMetadata({
  title: "HireTuner Blog: ATS, Resumes & Job Search Tips",
  description:
    "Practical guides on beating ATS filters, writing keyword-rich resumes, tailoring applications to job descriptions, and running a smarter, faster job search.",
  path: "/blog",
})

const ARTICLES = [
  {
    category: "Career Advice",
    accent: "secondary",
    title: "How to Beat the ATS in 2026",
    excerpt:
      "Applicant Tracking Systems have only gotten smarter. Learn how modern parsers read your resume, which formatting choices quietly sink you, and the exact steps to make sure your application ranks for the roles you want.",
  },
  {
    category: "Resume Tips",
    accent: "tertiary",
    title: "The Anatomy of a Perfect Resume Bullet Point",
    excerpt:
      "Stop opening lines with weak verbs like “responsible for.” We break down the action-impact-metric formula that turns vague duties into achievements recruiters and ATS scanners both reward.",
  },
  {
    category: "Job Search",
    accent: "error",
    title: "Why You Keep Getting Auto-Rejected (and How to Fix It)",
    excerpt:
      "The application black hole is rarely about your qualifications. We unpack the most common reasons resumes get filtered out before a human ever reads them, and how to diagnose your own.",
  },
  {
    category: "Keywords",
    accent: "secondary",
    title: "Keyword Matching 101: Why “Java Expert” Loses to “J2EE”",
    excerpt:
      "Two candidates with identical skills can score very differently in an ATS. Here is how keyword extraction actually works and how to mirror a job description without keyword stuffing.",
  },
  {
    category: "Resume Tips",
    accent: "tertiary",
    title: "Tailoring Your Resume to a Job Description in Minutes",
    excerpt:
      "Customizing every application by hand is exhausting. Learn a repeatable workflow for tailoring your resume to each posting quickly, while keeping every claim honest and verifiable.",
  },
  {
    category: "Career Advice",
    accent: "error",
    title: "Resume Formatting Mistakes That Confuse ATS Parsers",
    excerpt:
      "Columns, tables, headers, and creative fonts can look great to humans and unreadable to software. See which design choices to avoid so your experience parses cleanly every time.",
  },
  {
    category: "Job Search",
    accent: "secondary",
    title: "How Many Jobs Should You Apply To Each Week?",
    excerpt:
      "Volume matters, but so does fit. We look at what a realistic, sustainable application pace looks like and how tailoring faster lets you apply to more of the right roles.",
  },
  {
    category: "Career Changers",
    accent: "tertiary",
    title: "Translating Past Experience Into a New Field's Language",
    excerpt:
      "Switching industries does not mean starting over. Learn how to reframe transferable skills using the vocabulary of your target role so both ATS filters and hiring managers take notice.",
  },
]

const ACCENT = {
  secondary: { label: "text-secondary", overlay: "bg-secondary/10 group-hover:bg-secondary/20" },
  tertiary: { label: "text-tertiary-fixed-dim", overlay: "bg-tertiary-container/10 group-hover:bg-tertiary-container/20" },
  error: { label: "text-error", overlay: "bg-error-container/20 group-hover:bg-error-container/40" },
} as const

export default function Blog() {
  return (
    <div className="max-w-[1200px] mx-auto px-margin-page py-stack-xl flex flex-col gap-stack-xl">
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
        {ARTICLES.map((article) => {
          const accent = ACCENT[article.accent as keyof typeof ACCENT]
          return (
            <Link key={article.title} href="/blog" className="flex flex-col gap-4 group">
              <div className="w-full h-48 bg-surface-container-high rounded-lg overflow-hidden relative">
                <div className={`absolute inset-0 transition-colors ${accent.overlay}`}></div>
              </div>
              <div>
                <span className={`font-label-uppercase text-xs mb-2 block ${accent.label}`}>{article.category}</span>
                <h2 className="font-headline-md text-primary group-hover:text-secondary transition-colors text-lg">{article.title}</h2>
                <p className="font-body-sm text-on-surface-variant mt-2">{article.excerpt}</p>
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
