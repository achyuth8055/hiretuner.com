import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { AdSlot } from "@/components/ads/AdSlot"
import { pageMetadata } from "@/lib/seo"

export const metadata = pageMetadata({
  title: "About HireTuner: AI Resume Tailoring",
  description:
    "Learn why we built HireTuner: AI that tailors your resume to any job description, beats ATS keyword filters, and never invents skills you lack.",
  path: "/about",
})

export default function About() {
  return (
    <div className="max-w-[800px] mx-auto px-margin-page py-stack-xl flex flex-col gap-stack-xl">
      <header className="flex flex-col gap-stack-md">
        <span className="font-label-uppercase text-label-uppercase text-secondary tracking-widest">Our mission</span>
        <h1 className="font-display-lg-mobile text-display-lg-mobile md:font-display-lg md:text-display-lg text-primary">
          We believe the right candidate should never lose to the wrong keyword.
        </h1>
        <p className="font-body-base text-body-base text-on-surface-variant">
          <p>At HireTuner, our mission is to level the playing field for job seekers by providing powerful AI-driven tools that ensure your qualifications are accurately recognized by Applicant Tracking Systems.</p>
          <h2>Our Story</h2>
          <p>We saw too many talented professionals getting auto-rejected because they didn&apos;t match the exact keyword permutations of a job description. We built HireTuner to fix that.</p>
        </p>
      </header>

      <section className="flex flex-col gap-stack-md">
        <h2 className="font-headline-md text-headline-md text-primary">The problem: getting auto-rejected before a human reads a word</h2>
        <p className="font-body-base text-body-base text-on-surface-variant">
          Most mid-size and large employers run incoming resumes through an Applicant Tracking System (ATS) before any
          recruiter sees them. These systems parse your document, extract skills and titles, and score how closely you
          match the job description. If the posting asks for &ldquo;J2EE&rdquo; and your resume proudly says &ldquo;Java
          expert,&rdquo; an ATS may quietly rank you below someone less qualified who simply used the exact phrase. The
          result is the dreaded &ldquo;application black hole&rdquo;: you apply, you wait, and you never hear back, with no
          idea that a keyword mismatch, an unreadable layout, or a missing section was the real reason.
        </p>
        <p className="font-body-base text-body-base text-on-surface-variant">
          The conventional advice, &ldquo;just tailor your resume for every job&rdquo;, is correct but
          brutal in practice. Rewriting bullet points by hand for each posting can take 30 to 45 minutes, which means most
          people either send the same generic resume everywhere or burn out after a handful of applications. Neither
          approach works in a competitive market where you may need to apply to dozens of roles to land a single offer.
        </p>
      </section>

      <div className="max-w-[800px] mx-auto px-margin-page w-full">
        <AdSlot slot="content" />
      </div>

      <section className="flex flex-col gap-stack-md">
        <h2 className="font-headline-md text-headline-md text-primary">Our story</h2>
        <p className="font-body-base text-body-base text-on-surface-variant">
          HireTuner started with a frustration most job seekers will recognize. We watched friends and colleagues,
          engineers, analysts, and product people with genuinely strong backgrounds, send out application after
          application and hear nothing back. When we dug into why, the pattern was clear: their resumes were honest and
          accurate, but they weren&apos;t written in the language each specific job description used. The skills were
          there; the wording wasn&apos;t.
        </p>
        <p className="font-body-base text-body-base text-on-surface-variant">
          We built HireTuner to close that gap automatically and transparently. Instead of asking people to become amateur
          SEO experts for their own careers, we built an AI that reads the job description, maps its requirements against
          your actual experience, and shows you precisely where you align and where you fall short. The goal was never to
          game the system, it was to make sure honest, qualified candidates are described in terms the system can
          actually understand.
        </p>
      </section>

      <section className="flex flex-col gap-stack-md">
        <h2 className="font-headline-md text-headline-md text-primary">How HireTuner works</h2>
        <p className="font-body-base text-body-base text-on-surface-variant">
          You upload your master resume once. HireTuner parses it into a structured profile you can reuse for every
          application. When you paste in a job description, our engine extracts the required and preferred skills,
          compares them against your background, and produces a tailored resume aligned to that specific role,
          along with a transparent change log explaining every edit it made.
        </p>
        <p className="font-body-base text-body-base text-on-surface-variant">
          The part we care about most is what HireTuner will <em>not</em> do. It does not invent skills, fabricate
          experience, or pad your resume with technologies you&apos;ve never touched. Every keyword from the job
          description is categorized so you stay in control:
        </p>
        <ul className="flex flex-col gap-stack-sm font-body-base text-body-base text-on-surface-variant">
          <li className="flex items-start gap-2">
            <span className="material-symbols-outlined text-tertiary-container text-[20px]">check_circle</span>
            <span><strong className="text-primary">Found</strong>: the skill is already clearly in your resume, so we leave it as-is.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="material-symbols-outlined text-secondary text-[20px]">edit_note</span>
            <span><strong className="text-primary">Reworded</strong>: you have the experience, but the phrasing differs from the job description, so we align the language.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">help</span>
            <span><strong className="text-primary">Needs confirmation</strong>: we infer a likely match and ask you to confirm before it&apos;s added.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="material-symbols-outlined text-outline text-[20px]">block</span>
            <span><strong className="text-primary">Not added</strong>: there&apos;s no supporting evidence in your resume, so we skip it entirely.</span>
          </li>
        </ul>
        <p className="font-body-base text-body-base text-on-surface-variant">
          That categorization is the heart of what we call safe AI tailoring. You always see what changed and why, and
          nothing reaches your final resume without your approval.
        </p>
      </section>

      <section className="flex flex-col gap-stack-md">
        <h2 className="font-headline-md text-headline-md text-primary">What we stand for</h2>
        <p className="font-body-base text-body-base text-on-surface-variant">
          A tool that touches something as personal and consequential as your career has to earn trust. These are the
          principles we hold ourselves to:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-gutter">
          {[
            {
              icon: "verified_user",
              title: "Honesty by default",
              body: "We tailor wording, never reality. HireTuner will never claim a skill or accomplishment you can't back up in an interview.",
            },
            {
              icon: "visibility",
              title: "Radical transparency",
              body: "Every change is logged and explained. You approve, edit, or reject each suggestion before exporting.",
            },
            {
              icon: "lock",
              title: "Your data, your control",
              body: "Your resume is yours. We don't sell your personal data, and you can delete your information at any time.",
            },
            {
              icon: "groups",
              title: "Access for everyone",
              body: "Core tools stay free so cost is never the reason a qualified person gets passed over.",
            },
          ].map((value) => (
            <div key={value.title} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg flex flex-col gap-stack-sm">
              <div className="w-10 h-10 rounded-lg bg-primary text-on-primary flex items-center justify-center">
                <span className="material-symbols-outlined">{value.icon}</span>
              </div>
              <h3 className="font-headline-md text-headline-md text-lg text-primary">{value.title}</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">{value.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-stack-md">
        <h2 className="font-headline-md text-headline-md text-primary">Who HireTuner is for</h2>
        <p className="font-body-base text-body-base text-on-surface-variant">
          HireTuner is built for anyone whose resume has to survive an automated first round. That includes new graduates
          competing against hundreds of applicants, experienced engineers and analysts applying to roles with dense
          technical requirements, career changers translating past experience into a new field&apos;s vocabulary, and
          busy professionals who simply don&apos;t have 45 minutes to spare per application. If you&apos;ve ever suspected
          your resume was being filtered out before a human ever saw it, you&apos;re exactly who we built this for.
        </p>
      </section>

      <section className="bg-primary-container text-on-primary-container rounded-xl p-stack-xl flex flex-col md:flex-row items-center justify-between gap-stack-lg shadow-sm">
        <div className="flex flex-col gap-stack-sm max-w-xl">
          <h2 className="font-headline-md text-headline-md font-bold text-on-primary-fixed">Ready to stop guessing?</h2>
          <p className="font-body-base text-body-base text-on-primary-fixed-variant">
            Try HireTuner free and see exactly which keywords your resume is missing for your next role, no credit
            card required.
          </p>
        </div>
        <Button size="lg" variant="secondary" className="px-8 whitespace-nowrap shadow-sm font-bold tracking-wider rounded-lg" asChild>
          <Link href="/signup">Get Started Free</Link>
        </Button>
      </section>
    </div>
  )
}
