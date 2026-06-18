import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { pageMetadata } from "@/lib/seo"

export const metadata = pageMetadata({
  title: "Contact & Support: HireTuner",
  description:
    "Get in touch with the HireTuner team. Find support options, billing and privacy answers, and resources to get more from our AI resume tailoring tools.",
  path: "/contact",
})

const SUPPORT_FAQ = [
  {
    q: "How quickly will I hear back?",
    a: "We answer most email inquiries within one business day. Annual and Plus subscribers receive priority support and typically hear back even faster. We're a small team, so during high-volume periods complex questions may take a little longer, we always reply.",
  },
  {
    q: "I have a billing or refund question. What should I do?",
    a: "Email us with the address on your account and a short description of the issue. We can help with upgrades, downgrades, cancellations, and refund requests. You can cancel a paid plan at any time and keep access through the end of your current billing period.",
  },
  {
    q: "How is my resume and personal data handled?",
    a: "Your resume belongs to you. We use it only to power the tailoring and analysis features you ask for, we don't sell your personal data, and you can delete your information from your account at any time. If you have specific privacy questions, our support team is happy to walk you through the details.",
  },
  {
    q: "I think the AI got something wrong. Can you help?",
    a: "Yes, and we genuinely want to hear about it. HireTuner shows a change log for every edit so you can review and reject anything that looks off, but if a suggestion seems incorrect or unsafe, send us the details and we'll investigate. Feedback like this directly improves the product.",
  },
  {
    q: "Do you offer help for teams or career coaches?",
    a: "We're always interested in talking with bootcamps, universities, and career-services teams who want to help their members beat ATS filters. Reach out via the form or email and tell us a bit about your group.",
  },
]

export default function Contact() {
  return (
    <div className="max-w-[800px] mx-auto px-margin-page py-stack-xl flex flex-col gap-stack-xl">
      <header className="flex flex-col gap-stack-md">
        <span className="font-label-uppercase text-label-uppercase text-secondary tracking-widest">We&apos;re here to help</span>
        <h1 className="font-display-lg-mobile text-display-lg-mobile md:font-display-lg md:text-display-lg text-primary">
          Contact &amp; support
        </h1>
        <p className="font-body-base text-body-base text-on-surface-variant">
          Have a question about tailoring your resume, your subscription, or how HireTuner handles your data? We&apos;d love
          to hear from you. Whether you&apos;re stuck on a feature, want to report something that looks off, or just have
          feedback that could make the product better, our team reads every message.
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-gutter">
        {[
          {
            icon: "mail",
            title: "Email support",
            body: "The fastest way to reach a human on our team.",
            href: "mailto:support@hiretuner.com",
            cta: "support@hiretuner.com",
          },
          {
            icon: "menu_book",
            title: "Read the blog",
            body: "Guides on ATS filters, keywords, and the job hunt.",
            href: "/blog",
            cta: "Browse articles",
          },
          {
            icon: "build",
            title: "Free resume tools",
            body: "Score your resume and find keyword gaps for free.",
            href: "/ats-resume-score-checker",
            cta: "Try the tools",
          },
        ].map((card) => (
          <div key={card.title} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg flex flex-col gap-stack-sm">
            <div className="w-10 h-10 rounded-lg bg-primary text-on-primary flex items-center justify-center">
              <span className="material-symbols-outlined">{card.icon}</span>
            </div>
            <h2 className="font-headline-md text-headline-md text-lg text-primary">{card.title}</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant flex-grow">{card.body}</p>
            <Link href={card.href} className="text-secondary font-label-uppercase text-label-uppercase flex items-center gap-1 hover:underline mt-2">
              {card.cta}
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-stack-md">
        <h2 className="font-headline-md text-headline-md text-primary">Send us a message</h2>
        <p className="font-body-base text-body-base text-on-surface-variant">
          Fill out the form below and our team will get back to you, usually within one business day. The more detail you
          can share, what you were trying to do, what happened, and your account email, the faster we can
          help. Prefer email? Reach us directly at{" "}
          <a href="mailto:support@hiretuner.com" className="text-secondary hover:underline">support@hiretuner.com</a>.
        </p>
        <form className="flex flex-col gap-4 max-w-md">
          <div className="flex flex-col gap-1">
            <label className="font-label-uppercase text-on-surface-variant">Email</label>
            <input type="email" className="border border-outline-variant/50 rounded px-3 py-2 text-sm focus:border-secondary outline-none" placeholder="you@example.com" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-label-uppercase text-on-surface-variant">Message</label>
            <textarea className="border border-outline-variant/50 rounded px-3 py-2 text-sm focus:border-secondary outline-none min-h-[150px]" placeholder="How can we help?"></textarea>
          </div>
          <Button>Send Message</Button>
        </form>
      </section>

      <section className="flex flex-col gap-stack-md border-t border-outline-variant/30 pt-stack-xl">
        <h2 className="font-headline-md text-headline-md text-primary">Frequently asked support questions</h2>
        <p className="font-body-base text-body-base text-on-surface-variant">
          A few of the questions we hear most often. If you don&apos;t see yours here, just reach out, we&apos;re
          happy to help.
        </p>
        <div className="flex flex-col gap-stack-sm">
          {SUPPORT_FAQ.map((item) => (
            <details key={item.q} className="group bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md open:border-secondary transition-colors">
              <summary className="flex items-center justify-between cursor-pointer list-none font-headline-md text-headline-md text-base text-primary">
                {item.q}
                <span className="material-symbols-outlined text-on-surface-variant transition-transform group-open:rotate-180">expand_more</span>
              </summary>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-stack-sm">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}
