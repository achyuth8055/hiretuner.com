import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { AdSlot } from "@/components/ads/AdSlot"
import { pageMetadata, JsonLd, breadcrumbLd, webApplicationLd, faqLd } from "@/lib/seo"

const TITLE = "Free CV Builder"
const DESCRIPTION =
  "Create a professional curriculum vitae online for free. Build a complete, well-structured CV with sections for education, experience, publications, and skills — formatted for academic and international applications."
const PATH = "/cv-builder"

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "CV builder",
    "free CV builder",
    "curriculum vitae builder",
    "online CV maker",
    "academic CV template",
    "professional CV builder",
  ],
})

const SECTIONS = [
  {
    icon: "school",
    title: "Education and credentials",
    body: "List degrees, certifications, and coursework in a clear reverse-chronological order — the foundation recruiters and admissions committees scan first.",
  },
  {
    icon: "work_history",
    title: "Full work and research history",
    body: "A CV captures your complete professional record, not just the highlights. Document roles, responsibilities, and outcomes across your whole career.",
  },
  {
    icon: "menu_book",
    title: "Publications and presentations",
    body: "Add dedicated sections for papers, talks, posters, and grants — essential for academic, scientific, and research applications.",
  },
  {
    icon: "language",
    title: "International-ready formatting",
    body: "Clean, consistent layouts that suit UK, EU, and global conventions, where a multi-page CV is expected rather than a one-page resume.",
  },
  {
    icon: "interests",
    title: "Skills, languages, and awards",
    body: "Showcase technical skills, spoken languages, honors, and affiliations in structured sections that stay readable as your CV grows.",
  },
  {
    icon: "picture_as_pdf",
    title: "Polished PDF export",
    body: "Download a clean, consistently formatted PDF that holds its structure across multiple pages — no broken spacing or misaligned columns.",
  },
]

const STEPS = [
  {
    step: "1",
    title: "Outline your sections",
    body: "Start from a CV-ready structure with education, experience, publications, and skills already laid out, so you never face a blank page.",
  },
  {
    step: "2",
    title: "Fill in your history",
    body: "Add your full academic and professional record. Reorder sections to match the conventions of your field or target country.",
  },
  {
    step: "3",
    title: "Refine the wording",
    body: "Use built-in suggestions to tighten descriptions and keep phrasing consistent across every entry — without overstating anything.",
  },
  {
    step: "4",
    title: "Export and submit",
    body: "Download a clean multi-page PDF ready for university portals, research positions, or international job applications.",
  },
]

const FAQ = [
  {
    q: "What is the difference between a CV and a resume?",
    a: "A CV (curriculum vitae) is a comprehensive, multi-page record of your full academic and professional history, including publications and research. A resume is a concise one-to-two page document tailored to a specific job. In the US and Canada a resume is standard for most roles, while a CV is used for academic, scientific, and many international applications.",
  },
  {
    q: "Is the CV builder free to use?",
    a: "Yes. You can create, edit, and download a complete CV for free. Paid plans add higher limits, an ad-free experience, and advanced tailoring tools, but building and exporting a CV costs nothing.",
  },
  {
    q: "How long should my CV be?",
    a: "Unlike a resume, a CV can run several pages because it documents your complete history. Early-career applicants often have two pages, while experienced researchers and academics may have considerably more. The builder keeps spacing consistent however long it grows.",
  },
  {
    q: "Can I use this CV for academic and international applications?",
    a: "Yes. The layouts follow conventions common in the UK, EU, and other regions where a longer, detailed CV is expected, with dedicated sections for education, publications, and research.",
  },
  {
    q: "Should I use a CV or a resume for my job search?",
    a: "If you are applying to most jobs in the US, you likely want a resume — use our resume builder instead. If you are applying for academic positions, research roles, or jobs in regions where a CV is standard, the CV builder is the right fit.",
  },
]

export default function CvBuilderPage() {
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: "CV Builder", path: PATH }])} />
      <JsonLd data={webApplicationLd({ name: TITLE, description: DESCRIPTION, path: PATH })} />
      <JsonLd data={faqLd(FAQ.map((item) => ({ q: item.q, a: item.a })))} />

      {/* Hero — text/CSS only to keep LCP fast */}
      <section className="max-w-[1200px] mx-auto px-margin-page py-stack-xl w-full text-center flex flex-col items-center">
        <span className="font-label-uppercase text-label-uppercase uppercase tracking-wide text-secondary bg-secondary-container/40 px-3 py-1 rounded-full mb-stack-md">
          Free CV Builder
        </span>
        <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg font-bold text-primary mb-stack-sm max-w-3xl leading-tight">
          Build a complete, professional CV online
        </h1>
        <p className="font-body-base text-body-base text-on-surface-variant max-w-2xl mb-stack-lg text-lg">
          Create a well-structured curriculum vitae with sections for education, experience, publications,
          and skills — formatted for academic, research, and international applications.
        </p>
        <div className="flex flex-col sm:flex-row gap-stack-sm">
          <Button size="lg" className="px-8 py-4 h-auto font-bold tracking-wider rounded-lg" asChild>
            <Link href="/signup">Build My CV Free</Link>
          </Button>
          <Button size="lg" variant="outline" className="px-8 py-4 h-auto font-bold tracking-wider rounded-lg" asChild>
            <Link href="/resume-templates">Browse CV Templates</Link>
          </Button>
        </div>
      </section>

      {/* CV sections */}
      <section className="max-w-[1200px] mx-auto px-margin-page py-stack-xl w-full border-t border-outline-variant/20">
        <h2 className="font-headline-md text-headline-md font-bold text-primary text-center mb-stack-lg">
          Every section a strong CV needs
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-stack-lg">
          {SECTIONS.map((section) => (
            <div
              key={section.title}
              className="bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/30 rounded-xl p-stack-lg flex flex-col gap-stack-sm shadow-sm"
            >
              <span className="material-symbols-outlined text-secondary text-[28px]">{section.icon}</span>
              <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">{section.title}</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">{section.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-[1200px] mx-auto px-margin-page py-stack-xl w-full border-t border-outline-variant/20">
        <h2 className="font-headline-md text-headline-md font-bold text-primary text-center mb-stack-lg">
          How the CV builder works
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

      {/* CV vs resume explainer */}
      <section className="max-w-[1200px] mx-auto px-margin-page py-stack-xl w-full border-t border-outline-variant/20">
        <div className="max-w-3xl mx-auto flex flex-col gap-stack-md">
          <h2 className="font-headline-md text-headline-md font-bold text-primary">
            CV or resume — which one do you need?
          </h2>
          <p className="font-body-base text-body-base text-on-surface-variant">
            The two documents are not interchangeable. A curriculum vitae is a complete, multi-page record
            of your academic and professional life, including publications, research, teaching, and grants.
            It is the standard for academic posts, research roles, fellowships, and most applications in the
            UK, Europe, and beyond.
          </p>
          <p className="font-body-base text-body-base text-on-surface-variant">
            A resume is shorter — usually one page — and tailored to a specific job, emphasizing the most
            relevant achievements. If you are applying to companies in the US or Canada, a resume is almost
            always what you want. Build one with our{" "}
            <Link href="/resume-builder" className="text-secondary underline underline-offset-2">
              resume builder
            </Link>
            , then check it against any posting with the{" "}
            <Link href="/resume-match-checker" className="text-secondary underline underline-offset-2">
              resume match checker
            </Link>
            .
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-[1200px] mx-auto px-margin-page py-stack-xl w-full border-t border-outline-variant/20">
        <h2 className="font-headline-md text-headline-md font-bold text-primary text-center mb-stack-lg">
          CV builder FAQ
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
            <h2 className="font-headline-md text-headline-md font-bold text-on-primary-fixed">Ready to build your CV?</h2>
            <p className="font-body-base text-body-base text-on-primary-fixed-variant">
              Create a structured, professional curriculum vitae and keep it ready for every academic and international application.
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
