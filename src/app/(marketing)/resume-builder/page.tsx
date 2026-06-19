import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { AdSlot } from "@/components/ads/AdSlot"
import { pageMetadata, JsonLd, breadcrumbLd, webApplicationLd, faqLd } from "@/lib/seo"

const TITLE = "Free Resume Builder"
const DESCRIPTION =
  "Build a clean, ATS-friendly resume in minutes. Pick a recruiter-approved template, write stronger bullet points, and export a one-page resume tailored to the job you want."
const PATH = "/resume-builder"

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "resume builder",
    "free resume builder",
    "ATS resume builder",
    "online resume maker",
    "resume template",
    "professional resume builder",
  ],
})

const FEATURES = [
  {
    icon: "verified",
    title: "ATS-friendly by default",
    body: "Every template uses a single-column, machine-readable layout so applicant tracking systems parse your name, titles, and skills correctly.",
  },
  {
    icon: "auto_awesome",
    title: "Stronger bullet points",
    body: "Turn plain job duties into measurable, action-led achievements with built-in suggestions that keep the wording truthful to your real experience.",
  },
  {
    icon: "tune",
    title: "Tailored to each job",
    body: "Paste a job description and see which keywords you are missing, then weave them in so your resume matches what recruiters actually search for.",
  },
  {
    icon: "bolt",
    title: "Ready in minutes",
    body: "Start from a structured outline instead of a blank page. Fill in your details, reorder sections, and export a polished resume the same day.",
  },
  {
    icon: "description",
    title: "One page that fits",
    body: "Smart spacing keeps early-career resumes to a focused single page and lets senior candidates extend cleanly without awkward gaps.",
  },
  {
    icon: "download",
    title: "Clean exports",
    body: "Download a crisp PDF that looks identical whether a human or a parser opens it — no broken tables, columns, or hidden text.",
  },
]

const STEPS = [
  {
    step: "1",
    title: "Add your experience",
    body: "Enter your roles, education, and skills once. HireTuner saves them as a master profile you can reuse for every future application.",
  },
  {
    step: "2",
    title: "Pick a template",
    body: "Choose a recruiter-approved, ATS-safe layout. Switch templates anytime — your content stays exactly where it is.",
  },
  {
    step: "3",
    title: "Tailor to the job",
    body: "Paste the job description, review the keyword gaps, and sharpen your bullet points until your resume mirrors the role.",
  },
  {
    step: "4",
    title: "Export and apply",
    body: "Download a clean PDF, then track where you sent it with the built-in application tracker so nothing slips through the cracks.",
  },
]

const FAQ = [
  {
    q: "Is the resume builder really free?",
    a: "Yes. You can build, edit, and download a complete resume for free. Paid plans add higher usage limits, an ad-free experience, and advanced tailoring tools, but the core builder costs nothing.",
  },
  {
    q: "Are the resumes ATS-friendly?",
    a: "Every template is designed as a single-column, parser-safe layout with standard section headings. That means applicant tracking systems can read your contact details, job titles, dates, and skills without scrambling them.",
  },
  {
    q: "What is the difference between a resume and a CV?",
    a: "A resume is a concise one-to-two page summary tailored to a specific job, common in the US and Canada. A CV is a longer, comprehensive record of your academic and professional history. If you need the longer format, use our CV builder instead.",
  },
  {
    q: "Can I tailor one resume to different jobs?",
    a: "That is exactly what HireTuner is built for. Save one master profile, then generate a tailored version for each job description with the right keywords and emphasis — without rewriting everything from scratch.",
  },
  {
    q: "Will the AI invent experience I do not have?",
    a: "No. The suggestions only rephrase and strengthen the real experience you provide. You stay in control of every line, and nothing is added that you did not write.",
  },
]

export default function ResumeBuilderPage() {
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: "Resume Builder", path: PATH }])} />
      <JsonLd data={webApplicationLd({ name: TITLE, description: DESCRIPTION, path: PATH })} />
      <JsonLd data={faqLd(FAQ.map((item) => ({ q: item.q, a: item.a })))} />

      {/* Hero — text/CSS only to keep LCP fast */}
      <section className="max-w-[1200px] mx-auto px-margin-page py-stack-xl w-full text-center flex flex-col items-center">
        <span className="font-label-uppercase text-label-uppercase uppercase tracking-wide text-secondary bg-secondary-container/40 px-3 py-1 rounded-full mb-stack-md">
          Free Resume Builder
        </span>
        <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg font-bold text-primary mb-stack-sm max-w-3xl leading-tight">
          Build an ATS-friendly resume that lands interviews
        </h1>
        <p className="font-body-base text-body-base text-on-surface-variant max-w-2xl mb-stack-lg text-lg">
          Start from a structured outline, write stronger bullet points, and tailor every section to the
          job you want — then export a clean, recruiter-ready resume in minutes.
        </p>
        <div className="flex flex-col sm:flex-row gap-stack-sm">
          <Button size="lg" className="px-8 py-4 h-auto font-bold tracking-wider rounded-lg" asChild>
            <Link href="/signup">Build My Resume Free</Link>
          </Button>
          <Button size="lg" variant="outline" className="px-8 py-4 h-auto font-bold tracking-wider rounded-lg" asChild>
            <Link href="/resume-templates">Browse 30+ Templates</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-[1200px] mx-auto px-margin-page py-stack-xl w-full border-t border-outline-variant/20">
        <h2 className="font-headline-md text-headline-md font-bold text-primary text-center mb-stack-lg">
          Everything you need to write a better resume
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-stack-lg">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/30 rounded-xl p-stack-lg flex flex-col gap-stack-sm shadow-sm"
            >
              <span className="material-symbols-outlined text-secondary text-[28px]">{feature.icon}</span>
              <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">{feature.title}</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">{feature.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-[1200px] mx-auto px-margin-page py-stack-xl w-full border-t border-outline-variant/20">
        <h2 className="font-headline-md text-headline-md font-bold text-primary text-center mb-stack-lg">
          How the resume builder works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-stack-lg">
          {STEPS.map((item) => (
            <div key={item.step} className="flex flex-col gap-stack-sm">
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-on-primary font-bold">
                {item.step}
              </span>
              <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">{item.title}</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Ad — below the fold, content slot */}
      <section className="max-w-[1200px] mx-auto px-margin-page py-stack-lg w-full">
        <AdSlot slot="content" />
      </section>

      {/* ATS explainer */}
      <section className="max-w-[1200px] mx-auto px-margin-page py-stack-xl w-full border-t border-outline-variant/20">
        <div className="max-w-3xl mx-auto flex flex-col gap-stack-md">
          <h2 className="font-headline-md text-headline-md font-bold text-primary">
            Why an ATS-friendly resume matters
          </h2>
          <p className="font-body-base text-body-base text-on-surface-variant">
            Most mid-size and large employers run resumes through an applicant tracking system before a
            human ever sees them. If the layout uses multiple columns, text boxes, or graphics, the parser
            can misread your job titles and dates — or drop whole sections. A resume that looks beautiful
            but parses badly still gets filtered out.
          </p>
          <p className="font-body-base text-body-base text-on-surface-variant">
            HireTuner sidesteps that problem. Each template keeps a clean, single-column structure with
            standard headings the parser expects, so your strongest achievements actually reach the
            recruiter. Pair the builder with our{" "}
            <Link href="/ats-resume-score-checker" className="text-secondary underline underline-offset-2">
              ATS resume score checker
            </Link>{" "}
            and{" "}
            <Link href="/resume-keyword-scanner" className="text-secondary underline underline-offset-2">
              keyword scanner
            </Link>{" "}
            to confirm your resume is both readable and relevant before you apply.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-[1200px] mx-auto px-margin-page py-stack-xl w-full border-t border-outline-variant/20">
        <h2 className="font-headline-md text-headline-md font-bold text-primary text-center mb-stack-lg">
          Resume builder FAQ
        </h2>
        <div className="max-w-3xl mx-auto flex flex-col gap-stack-md">
          {FAQ.map((item) => (
            <div key={item.q} className="border border-outline-variant/30 rounded-xl p-stack-lg bg-surface-container-lowest dark:bg-surface-container-low">
              <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface mb-stack-xs">{item.q}</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-[1200px] mx-auto px-margin-page py-stack-xl w-full">
        <div className="bg-primary-container text-on-primary-container rounded-xl p-stack-xl flex flex-col md:flex-row items-center justify-between gap-stack-lg shadow-sm">
          <div className="flex flex-col gap-stack-sm max-w-xl">
            <h2 className="font-headline-md text-headline-md font-bold text-on-primary-fixed">Ready to build your resume?</h2>
            <p className="font-body-base text-body-base text-on-primary-fixed-variant">
              Create your master profile once, then tailor a sharp, ATS-friendly resume to every job you apply for.
            </p>
          </div>
          <Button size="lg" variant="secondary" className="px-8 py-4 whitespace-nowrap shadow-sm font-bold tracking-wider rounded-lg h-auto" asChild>
            <Link href="/signup">Start Building Free</Link>
          </Button>
        </div>
      </section>
    </>
  )
}
