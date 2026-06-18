import { Button } from "@/components/ui/Button"
import Link from "next/link"
import Image from "next/image"
import { AdSlot } from "@/components/ads/AdSlot"
import { PricingCTA } from "@/components/app/PricingCTA"
import { JsonLd } from "@/lib/seo"
import { siteConfig } from "@/lib/site"

const FAQ_ITEMS = [
  {
    q: "What is an ATS and why does it matter?",
    a: "An Applicant Tracking System (ATS) is software employers use to filter and rank resumes before a human reviews them. Most large companies use one. If your resume doesn't contain the keywords and structure the ATS expects, it can be auto-rejected even when you're qualified. HireTuner analyzes the job description and aligns your resume to those exact requirements.",
  },
  {
    q: "Does HireTuner invent skills or experience I don't have?",
    a: "No. HireTuner only rewords and reframes the experience already in your resume to better match the job description. Every keyword is categorized as Found, Reworded, Needs Confirmation, or Not Added, and skills with no supporting evidence are skipped. You stay in full control of what's included.",
  },
  {
    q: "Is the ATS match score a guarantee of getting an interview?",
    a: "No. The match score is an estimate of how well your resume aligns with a specific job description. It does not guarantee interviews or recruiter responses, no tool can. It's a directional signal to help you prioritize improvements.",
  },
  {
    q: "How much does HireTuner cost?",
    a: "HireTuner is free to try with 5 resume matches per month. The Starter plan is $5.49/month (or $49.99/year) and includes up to 100 tailored resumes per month, the advanced AI rewriting engine, master resume management, and the application tracker. Yearly subscribers also get an ad-free experience.",
  },
  {
    q: "Do I see ads on HireTuner?",
    a: "Free and monthly Starter users may see a small number of clearly-labeled ads that help keep the free tools available. Annual subscribers and Plus members enjoy a completely ad-free experience.",
  },
  {
    q: "Which file formats can I upload?",
    a: "You can upload your existing resume as a PDF or Word document, or paste your text directly. HireTuner parses it into a structured profile you can reuse across every application.",
  },
]

export default function Home() {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  }

  const softwareLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: siteConfig.name,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: siteConfig.description,
    offers: [
      { "@type": "Offer", price: "0", priceCurrency: "USD", name: "Free" },
      { "@type": "Offer", price: "5.49", priceCurrency: "USD", name: "Starter (Monthly)" },
      { "@type": "Offer", price: "49.99", priceCurrency: "USD", name: "Starter (Yearly)" },
    ],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      reviewCount: "1200",
    },
  }

  return (
    <>
      <JsonLd data={faqLd} />
      <JsonLd data={softwareLd} />
      {/* Hero Section */}
      <header className="w-full max-w-[1200px] mx-auto px-margin-page py-stack-xl md:py-24 grid grid-cols-1 md:grid-cols-2 gap-gutter items-center overflow-hidden">
        {/* Left: Copy */}
        <div className="flex flex-col gap-stack-lg z-10">
          <h1 className="font-display-lg-mobile text-display-lg-mobile md:font-display-lg md:text-display-lg text-primary">
            Tailor your resume to <span className="text-secondary">any job description</span> in minutes.
          </h1>
          <p className="font-body-base text-body-base text-on-surface-variant max-w-md">
            Stop guessing what ATS filters want. HireTuner&apos;s AI analyzes the JD, identifies critical keyword gaps, and precision-rewrites your experience to maximize your match score.
          </p>
          <div className="flex flex-col sm:flex-row gap-stack-md pt-stack-sm">
            <Button size="lg" className="gap-2" asChild>
              <Link href="/signup">
                Try 5 Free Resume Matches
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="gap-2" asChild>
              <Link href="/ats-resume-score-checker">
                <span className="material-symbols-outlined text-[16px]">play_circle</span>
                View Product Demo
              </Link>
            </Button>
          </div>
        </div>
        {/* Right: Product visual - pure CSS/markup so the LCP element stays the
            headline text and no hero image needs to download (keeps LCP < 2.4s). */}
        <div className="relative hidden md:flex items-center justify-center select-none min-h-[500px]" aria-hidden="true">
          {/* Ambient brand glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[440px] h-[440px] bg-secondary-fixed/40 blur-3xl rounded-full" />
          <div className="absolute top-8 right-2 w-44 h-44 bg-tertiary-fixed/40 blur-3xl rounded-full" />

          {/* Depth layer behind the main card */}
          <div className="absolute top-14 right-0 w-[300px] h-[210px] bg-surface-container-high/60 border border-outline-variant/40 rounded-3xl rotate-6" />

          {/* Main analysis card */}
          <div className="relative z-10 w-full max-w-[420px] bg-surface-container-lowest border border-outline-variant/60 rounded-3xl shadow-2xl p-6 flex flex-col gap-5 transition-transform duration-500 hover:-translate-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary">
                <span className="material-symbols-outlined text-secondary">troubleshoot</span>
                <span className="font-headline-md text-sm font-bold">Resume &rarr; Job Match</span>
              </div>
              <span className="inline-flex items-center gap-1 bg-tertiary-fixed-dim/15 text-on-tertiary-container px-2.5 py-1 rounded-full text-[11px] font-semibold">
                <span className="material-symbols-outlined text-[13px]">verified</span> ATS-ready
              </span>
            </div>

            {/* Before / after match score */}
            <div className="flex items-end justify-between">
              <div className="flex flex-col">
                <span className="font-label-uppercase text-label-uppercase text-on-surface-variant text-[11px] tracking-widest">Match score</span>
                <span className="font-display-lg text-display-lg text-primary leading-none">94%</span>
              </div>
              <span className="inline-flex items-center gap-1 text-on-tertiary-container bg-tertiary-fixed-dim/10 px-2 py-1 rounded-lg text-xs font-semibold mb-1">
                <span className="material-symbols-outlined text-[14px]">trending_up</span> +32 pts
              </span>
            </div>
            <div className="relative h-2.5 w-full rounded-full bg-surface-container-high overflow-hidden">
              <div className="absolute inset-y-0 left-0 w-[62%] bg-outline-variant rounded-full" />
              <div className="absolute inset-y-0 left-0 w-[94%] bg-secondary rounded-full" />
            </div>
            <div className="flex justify-between text-[11px] text-on-surface-variant -mt-3">
              <span>Base resume 62%</span>
              <span className="text-secondary font-medium">Tailored 94%</span>
            </div>

            {/* Keyword tailoring rows (mirrors the safe-AI statuses) */}
            <div className="flex flex-col gap-2 pt-1">
              {[
                { k: "Java", cls: "bg-tertiary-fixed-dim/10 text-on-tertiary-container", icon: "check_circle", label: "Found" },
                { k: "Spring Boot", cls: "bg-secondary/10 text-secondary", icon: "edit_note", label: "Reworded" },
                { k: "Docker", cls: "bg-surface-variant text-on-surface-variant border border-outline-variant/40", icon: "help", label: "Confirm" },
              ].map((row) => (
                <div key={row.k} className="flex items-center justify-between bg-background/60 rounded-xl px-3 py-2 border border-outline-variant/30">
                  <span className="font-mono text-xs text-primary">{row.k}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium ${row.cls}`}>
                    <span className="material-symbols-outlined text-[13px]">{row.icon}</span> {row.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Floating accent chip */}
          <div className="absolute -bottom-3 -left-2 z-20 bg-surface-container-lowest border border-outline-variant/60 rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-secondary text-on-secondary grid place-items-center">
              <span className="material-symbols-outlined text-[20px]">bolt</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-bold text-primary">12 keyword gaps fixed</span>
              <span className="text-[11px] text-on-surface-variant">in under 30 seconds</span>
            </div>
          </div>
        </div>
      </header>

      {/* Credibility Strip */}
      <div className="w-full border-y border-outline-variant/30 bg-surface-container-lowest py-6">
        <div className="max-w-[1200px] mx-auto px-margin-page flex justify-center items-center">
          <p className="font-label-uppercase text-label-uppercase text-on-surface-variant tracking-widest text-center">
            Built for job seekers applying to software, data, and business roles
          </p>
        </div>
      </div>

      {/* How It Works */}
      <section id="how-it-works" className="max-w-[1200px] mx-auto px-margin-page py-24 w-full">
        <div className="text-center mb-stack-xl">
          <span className="font-label-uppercase text-label-uppercase text-secondary tracking-widest">How it works</span>
          <h2 className="font-headline-md text-headline-md text-primary md:text-3xl mt-2">From job posting to tailored resume in 3 steps</h2>
          <p className="font-body-base text-body-base text-on-surface-variant mt-2 max-w-2xl mx-auto">
            No more rewriting bullets by hand. HireTuner does the heavy lifting while keeping you in control of every change.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          {[
            {
              step: "01",
              icon: "upload_file",
              title: "Upload your master resume",
              body: "Add your resume once as a PDF or Word file. HireTuner parses it into a structured profile you can reuse for every application.",
            },
            {
              step: "02",
              icon: "content_paste_search",
              title: "Paste the job description",
              body: "We analyze the posting, extract required and preferred skills, and map them against your experience to find the exact keyword gaps.",
            },
            {
              step: "03",
              icon: "auto_fix_high",
              title: "Generate & review",
              body: "Get an ATS-aligned resume with a transparent change log. Approve, confirm, or reject every suggestion before you export.",
            },
          ].map((item) => (
            <div key={item.step} className="relative bg-surface-container-lowest p-stack-lg rounded-xl border border-outline-variant flex flex-col gap-stack-sm">
              <span className="font-display-lg text-display-lg text-secondary/15 absolute top-4 right-5 leading-none select-none">{item.step}</span>
              <div className="w-12 h-12 rounded-xl bg-primary text-on-primary flex items-center justify-center">
                <span className="material-symbols-outlined">{item.icon}</span>
              </div>
              <h3 className="font-headline-md text-headline-md text-lg text-primary mt-2">{item.title}</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Problem Section */}
      <section className="max-w-[1200px] mx-auto px-margin-page py-24 w-full">
        <div className="text-center mb-stack-xl">
          <h2 className="font-headline-md text-headline-md text-primary md:text-3xl">The Application Black Hole</h2>
          <p className="font-body-base text-body-base text-on-surface-variant mt-2">Why highly qualified candidates get auto-rejected.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          {/* Problem 1 */}
          <div className="bg-surface-container-lowest p-stack-lg rounded-xl border border-outline-variant shadow-sm flex flex-col gap-stack-sm hover:-translate-y-1 transition-transform">
            <div className="w-10 h-10 rounded-lg bg-error-container text-on-error-container flex items-center justify-center mb-2">
              <span className="material-symbols-outlined">manage_search</span>
            </div>
            <h3 className="font-headline-md text-headline-md text-lg text-primary">Generic Resumes Miss Keywords</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              ATS systems score you on exact matches. Being a &quot;Java Expert&quot; won&apos;t help if the JD asks for &quot;J2EE Experience&quot;.
            </p>
          </div>
          {/* Problem 2 */}
          <div className="bg-surface-container-lowest p-stack-lg rounded-xl border border-outline-variant shadow-sm flex flex-col gap-stack-sm hover:-translate-y-1 transition-transform">
            <div className="w-10 h-10 rounded-lg bg-surface-container-high text-on-surface-variant flex items-center justify-center mb-2">
              <span className="material-symbols-outlined">schedule</span>
            </div>
            <h3 className="font-headline-md text-headline-md text-lg text-primary">Manual Tailoring is Too Slow</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Spending 45 minutes rewriting bullets for every single application drastically limits how many jobs you can apply to.
            </p>
          </div>
          {/* Problem 3 */}
          <div className="bg-surface-container-lowest p-stack-lg rounded-xl border border-outline-variant shadow-sm flex flex-col gap-stack-sm hover:-translate-y-1 transition-transform">
            <div className="w-10 h-10 rounded-lg bg-surface-container-high text-on-surface-variant flex items-center justify-center mb-2">
              <span className="material-symbols-outlined">file_copy</span>
            </div>
            <h3 className="font-headline-md text-headline-md text-lg text-primary">Version Control Chaos</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Managing &quot;Resume_Final_v3_Stripe.pdf&quot; and trying to remember which bullet points you used where is a nightmare.
            </p>
          </div>
        </div>
      </section>

      {/* Safe Tailoring Table */}
      <section id="product" className="bg-surface-container-lowest border-y border-outline-variant/30 py-24 overflow-hidden w-full">
        <div className="max-w-[1200px] mx-auto px-margin-page">
          <div className="flex flex-col md:flex-row gap-stack-xl items-start">
            <div className="md:w-1/3 flex flex-col gap-stack-md">
              <h2 className="font-headline-md text-headline-md text-primary md:text-3xl">Safe AI Tailoring.</h2>
              <p className="font-body-base text-body-base text-on-surface-variant">
                We don&apos;t hallucinate skills you don&apos;t have. HireTuner categorizes every JD keyword and shows you exactly how we handle it. You maintain full control.
              </p>
              <Link className="text-secondary font-label-uppercase text-label-uppercase mt-4 flex items-center gap-1 hover:underline" href="#">
                Read our AI Safety Policy <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
            <div className="md:w-2/3 w-full overflow-x-auto bg-background rounded-xl border border-outline-variant">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-low">
                    <th className="py-4 px-4 font-label-uppercase text-label-uppercase text-on-surface-variant">JD Keyword</th>
                    <th className="py-4 px-4 font-label-uppercase text-label-uppercase text-on-surface-variant">Status</th>
                    <th className="py-4 px-4 font-label-uppercase text-label-uppercase text-on-surface-variant hidden sm:table-cell">What HireTuner Does</th>
                  </tr>
                </thead>
                <tbody className="font-body-sm text-body-sm text-primary">
                  <tr className="border-b border-outline-variant/50 hover:bg-surface-container-lowest transition-colors h-[56px]">
                    <td className="py-2 px-4 font-mono">Java</td>
                    <td className="py-2 px-4">
                      <span className="inline-flex items-center gap-1 bg-tertiary-fixed-dim/10 text-on-tertiary-container px-2 py-1 rounded font-medium text-xs">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span> Found
                      </span>
                    </td>
                    <td className="py-2 px-4 text-on-surface-variant hidden sm:table-cell">Leaves as-is. High confidence match.</td>
                  </tr>
                  <tr className="border-b border-outline-variant/50 hover:bg-surface-container-lowest transition-colors h-[56px]">
                    <td className="py-2 px-4 font-mono">Spring Boot</td>
                    <td className="py-2 px-4">
                      <span className="inline-flex items-center gap-1 bg-secondary/10 text-secondary px-2 py-1 rounded font-medium text-xs">
                        <span className="material-symbols-outlined text-[14px]">edit_note</span> Reworded
                      </span>
                    </td>
                    <td className="py-2 px-4 text-on-surface-variant hidden sm:table-cell">Changed &quot;Spring Framework&quot; to &quot;Spring Boot&quot; to match JD.</td>
                  </tr>
                  <tr className="border-b border-outline-variant/50 hover:bg-surface-container-lowest transition-colors h-[56px]">
                    <td className="py-2 px-4 font-mono">Docker</td>
                    <td className="py-2 px-4">
                      <span className="inline-flex items-center gap-1 bg-surface-variant text-on-surface-variant px-2 py-1 rounded font-medium text-xs border border-outline-variant/30">
                        <span className="material-symbols-outlined text-[14px]">help</span> Needs Confirmation
                      </span>
                    </td>
                    <td className="py-2 px-4 text-on-surface-variant hidden sm:table-cell">Inferred from &quot;Containerization&quot;. Prompts user to confirm.</td>
                  </tr>
                  <tr className="hover:bg-surface-container-lowest transition-colors h-[56px]">
                    <td className="py-2 px-4 font-mono">Kubernetes</td>
                    <td className="py-2 px-4">
                      <span className="inline-flex items-center gap-1 bg-surface-container text-outline px-2 py-1 rounded font-medium text-xs">
                        <span className="material-symbols-outlined text-[14px]">block</span> Not Added
                      </span>
                    </td>
                    <td className="py-2 px-4 text-on-surface-variant hidden sm:table-cell">No supporting evidence in original resume. Skipped.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Band */}
      <section className="bg-surface-container-lowest border-y border-outline-variant/30 py-16 w-full">
        <div className="max-w-[1200px] mx-auto px-margin-page grid grid-cols-2 md:grid-cols-4 gap-gutter text-center">
          {[
            { value: "10x", label: "Faster than manual tailoring" },
            { value: "100", label: "Tailored resumes / month on Starter" },
            { value: "8+", label: "Free AI tools, no signup required" },
            { value: "30s", label: "Average time to a keyword gap report" },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col gap-1">
              <span className="font-display-lg text-display-lg text-primary">{stat.value}</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Free SEO Tools Section */}
      <section id="tools" className="max-w-[1200px] mx-auto px-margin-page py-24 w-full">
        <div className="text-center mb-stack-xl">
          <h2 className="font-headline-md text-headline-md text-primary md:text-3xl">Free AI Resume Tools</h2>
          <p className="font-body-base text-body-base text-on-surface-variant mt-2">Try our individual AI tools designed to perfect your application.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter auto-rows-min">
          {/* ATS Score Checker - Spans 2 columns on lg */}
          <Link href="/ats-resume-score-checker" className="lg:col-span-2 bg-gradient-to-br from-surface-container-lowest to-secondary-fixed/30 p-stack-xl rounded-3xl border border-outline-variant/30 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all group overflow-hidden relative flex flex-col justify-end min-h-[280px]">
            <span className="material-symbols-outlined absolute -right-8 -top-8 text-[200px] text-secondary/5 group-hover:text-secondary/10 transition-colors transform group-hover:rotate-12 duration-500 pointer-events-none">analytics</span>
            <div className="w-14 h-14 bg-primary text-on-primary rounded-xl flex items-center justify-center mb-6 shadow-md group-hover:bg-secondary transition-colors relative z-10">
              <span className="material-symbols-outlined text-[28px]">analytics</span>
            </div>
            <h3 className="font-headline-md text-headline-md text-primary mb-2 text-2xl font-bold relative z-10">ATS Resume Score Checker</h3>
            <p className="font-body-base text-body-base text-on-surface-variant max-w-md relative z-10">Instantly evaluate your resume against industry-standard ATS systems. Get a precise estimated score and actionable insights.</p>
          </Link>

          {/* Resume Match Checker */}
          <Link href="/resume-match-checker" className="bg-gradient-to-br from-surface-container-lowest to-tertiary-fixed/20 p-stack-xl rounded-3xl border border-outline-variant/30 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all group overflow-hidden relative flex flex-col min-h-[280px]">
            <span className="material-symbols-outlined absolute -bottom-10 -right-4 text-[160px] text-tertiary-container/5 group-hover:text-tertiary-container/10 transition-colors transform group-hover:scale-110 duration-500 pointer-events-none">troubleshoot</span>
            <div className="w-12 h-12 bg-primary text-on-primary rounded-xl flex items-center justify-center mb-auto shadow-sm group-hover:bg-tertiary-container transition-colors relative z-10">
              <span className="material-symbols-outlined text-[24px]">troubleshoot</span>
            </div>
            <div className="mt-8 relative z-10">
              <h3 className="font-headline-md text-headline-md text-primary mb-2 text-xl font-bold">Resume Match Checker</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Compare your resume to a job description to find missing skills.</p>
            </div>
          </Link>

          {/* JD Keyword Extractor */}
          <Link href="/jd-keyword-extractor" className="bg-gradient-to-br from-surface-container-lowest to-primary-fixed/20 p-stack-xl rounded-3xl border border-outline-variant/30 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all group overflow-hidden relative flex flex-col min-h-[280px]">
            <span className="material-symbols-outlined absolute -bottom-10 -right-4 text-[160px] text-primary/5 group-hover:text-primary/10 transition-colors transform group-hover:scale-110 duration-500 pointer-events-none">document_scanner</span>
            <div className="w-12 h-12 bg-primary text-on-primary rounded-xl flex items-center justify-center mb-auto shadow-sm group-hover:bg-primary-fixed-variant transition-colors relative z-10">
              <span className="material-symbols-outlined text-[24px]">document_scanner</span>
            </div>
            <div className="mt-8 relative z-10">
              <h3 className="font-headline-md text-headline-md text-primary mb-2 text-xl font-bold">JD Keyword Extractor</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Extract core requirements and categorize skills from any job posting.</p>
            </div>
          </Link>

          {/* Bullet Point Generator - Spans 2 cols on md, 1 on lg */}
          <Link href="/resume-bullet-point-generator" className="md:col-span-2 lg:col-span-1 bg-gradient-to-br from-surface-container-lowest to-error-container/40 p-stack-xl rounded-3xl border border-outline-variant/30 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all group overflow-hidden relative flex flex-col min-h-[280px]">
            <span className="material-symbols-outlined absolute -bottom-10 -right-4 text-[160px] text-error/5 group-hover:text-error/10 transition-colors transform group-hover:scale-110 duration-500 pointer-events-none">auto_awesome</span>
            <div className="w-12 h-12 bg-primary text-on-primary rounded-xl flex items-center justify-center mb-auto shadow-sm group-hover:bg-error transition-colors relative z-10">
              <span className="material-symbols-outlined text-[24px]">auto_awesome</span>
            </div>
            <div className="mt-8 relative z-10">
              <h3 className="font-headline-md text-headline-md text-primary mb-2 text-xl font-bold">Bullet Point Generator</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Transform weak bullets into high-impact, metrics-driven achievements.</p>
            </div>
          </Link>

          {/* Resume Keyword Scanner */}
          <Link href="/resume-keyword-scanner" className="bg-gradient-to-br from-surface-container-lowest to-surface-variant/50 p-stack-xl rounded-3xl border border-outline-variant/30 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all group overflow-hidden relative flex flex-col min-h-[280px]">
            <span className="material-symbols-outlined absolute -bottom-10 -right-4 text-[160px] text-on-surface/5 group-hover:text-on-surface/10 transition-colors transform group-hover:scale-110 duration-500 pointer-events-none">key</span>
            <div className="w-12 h-12 bg-primary text-on-primary rounded-xl flex items-center justify-center mb-auto shadow-sm group-hover:bg-on-surface-variant transition-colors relative z-10">
              <span className="material-symbols-outlined text-[24px]">key</span>
            </div>
            <div className="mt-8 relative z-10">
              <h3 className="font-headline-md text-headline-md text-primary mb-2 text-xl font-bold">Resume Keyword Scanner</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Identify the most important keywords to include in your resume.</p>
            </div>
          </Link>

          {/* Salary Estimator & Java Guide (Half cards) */}
          <div className="flex flex-col gap-gutter lg:col-span-1 md:col-span-2">
            <Link href="/salary-estimator" className="flex-1 bg-surface-container-lowest p-stack-md rounded-3xl border border-outline-variant/30 shadow-sm hover:border-secondary hover:shadow-md transition-all group flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-fixed text-on-primary-fixed rounded-xl flex items-center justify-center shrink-0 group-hover:bg-secondary group-hover:text-on-secondary transition-colors">
                <span className="material-symbols-outlined">payments</span>
              </div>
              <div>
                <h3 className="font-headline-md text-headline-md text-primary group-hover:text-secondary mb-1 text-base font-bold">Salary Estimator</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant text-xs">Uncover your earning potential.</p>
              </div>
            </Link>
            <Link href="/java-developer-salary-guide" className="flex-1 bg-surface-container-lowest p-stack-md rounded-3xl border border-outline-variant/30 shadow-sm hover:border-secondary hover:shadow-md transition-all group flex items-center gap-4">
              <div className="w-12 h-12 bg-surface-variant text-on-surface-variant rounded-xl flex items-center justify-center shrink-0 group-hover:bg-secondary group-hover:text-on-secondary transition-colors">
                <span className="material-symbols-outlined">code</span>
              </div>
              <div>
                <h3 className="font-headline-md text-headline-md text-primary group-hover:text-secondary mb-1 text-base font-bold">Java Dev Salary Guide</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant text-xs">Market rates for Java roles.</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* In-content ad (free + monthly users only) */}
      <div className="max-w-[1200px] mx-auto px-margin-page w-full">
        <AdSlot slot="homeInline" />
      </div>

      {/* Chrome Extension Section */}
      <section className="bg-primary text-on-primary border-y border-outline-variant/30 py-24 overflow-hidden w-full relative">
        <div className="max-w-[1200px] mx-auto px-margin-page relative z-10 flex flex-col md:flex-row items-center gap-stack-xl justify-between">
          <div className="md:w-1/2 flex flex-col gap-stack-md">
            <div className="inline-flex items-center gap-2 bg-on-primary/10 text-on-primary w-fit px-3 py-1 rounded-full mb-2 border border-on-primary/20">
              <span className="material-symbols-outlined text-[16px]">extension</span>
              <span className="font-label-uppercase text-label-uppercase">Available Now</span>
            </div>
            <h2 className="font-headline-md text-headline-md md:text-4xl text-on-primary">Take HireTuner Everywhere</h2>
            <p className="font-body-base text-body-base text-inverse-primary max-w-lg">
              Analyze job descriptions and instantly generate tailored resumes directly from LinkedIn, Indeed, and Glassdoor with our free Chrome Extension.
            </p>
            <div className="flex gap-4 mt-4">
              <Button size="lg" className="gap-2 bg-on-primary text-primary hover:bg-surface-variant">
                <span className="material-symbols-outlined text-[18px]">chrome_reader_mode</span>
                Add to Chrome - It&apos;s Free
              </Button>
            </div>
          </div>
          <div className="md:w-1/2 flex justify-center md:justify-end">
            <div className="relative w-full max-w-[400px]">
              <Image 
                src="/images/chrome-extension.png" 
                alt="HireTuner Chrome Extension" 
                width={500} 
                height={500} 
                className="w-full h-auto object-cover rounded-2xl shadow-2xl transform rotate-2 hover:rotate-0 transition-transform duration-500 border border-on-primary/10" 
              />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-[1200px] mx-auto px-margin-page py-24 w-full">
        <div className="text-center mb-stack-xl">
          <h2 className="font-headline-md text-headline-md text-primary md:text-3xl">Loved by job seekers</h2>
          <p className="font-body-base text-body-base text-on-surface-variant mt-2">Real outcomes from people who stopped getting auto-rejected.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          {[
            {
              quote: "I went from zero callbacks to three interviews in two weeks. Seeing the exact keywords I was missing changed everything.",
              name: "Priya S.",
              role: "Backend Engineer",
            },
            {
              quote: "The change log is the killer feature, I can see precisely what was reworded and approve it. It never made up skills I don't have.",
              name: "Marcus T.",
              role: "Data Analyst",
            },
            {
              quote: "Tailoring used to take me 45 minutes per application. Now it's a couple of minutes and I apply to far more roles.",
              name: "Elena R.",
              role: "Product Manager",
            },
          ].map((t) => (
            <figure key={t.name} className="bg-surface-container-lowest p-stack-lg rounded-xl border border-outline-variant flex flex-col gap-stack-md">
              <div className="flex gap-1 text-secondary" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className="material-symbols-outlined fill text-[18px]">star</span>
                ))}
              </div>
              <blockquote className="font-body-base text-body-base text-primary">&ldquo;{t.quote}&rdquo;</blockquote>
              <figcaption className="font-body-sm text-body-sm text-on-surface-variant mt-auto">
                <span className="text-primary font-medium">{t.name}</span> · {t.role}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Blog Section */}
      <section className="max-w-[1200px] mx-auto px-margin-page py-24 w-full border-t border-outline-variant/30">
        <div className="flex justify-between items-end mb-stack-xl">
          <div>
            <h2 className="font-headline-md text-headline-md text-primary md:text-3xl">Latest from our Blog</h2>
            <p className="font-body-base text-body-base text-on-surface-variant mt-2">Insights and strategies for your job search.</p>
          </div>
          <Link href="/blog" className="hidden md:flex items-center gap-1 text-secondary font-label-uppercase text-label-uppercase hover:underline">
            View All Articles <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          <Link href="/blog" className="flex flex-col gap-4 group">
            <div className="w-full h-48 bg-surface-container-high rounded-lg overflow-hidden relative">
              <div className="absolute inset-0 bg-secondary/10 group-hover:bg-secondary/20 transition-colors"></div>
            </div>
            <div>
              <span className="text-secondary font-label-uppercase text-xs mb-2 block">Career Advice</span>
              <h3 className="font-headline-md text-primary group-hover:text-secondary transition-colors text-lg">How to Beat the ATS in 2024</h3>
            </div>
          </Link>
          <Link href="/blog" className="flex flex-col gap-4 group">
            <div className="w-full h-48 bg-surface-container-high rounded-lg overflow-hidden relative">
              <div className="absolute inset-0 bg-tertiary-container/10 group-hover:bg-tertiary-container/20 transition-colors"></div>
            </div>
            <div>
              <span className="text-tertiary-fixed-dim font-label-uppercase text-xs mb-2 block">Resume Tips</span>
              <h3 className="font-headline-md text-primary group-hover:text-secondary transition-colors text-lg">The Perfect Resume Bullet Point</h3>
            </div>
          </Link>
          <Link href="/blog" className="flex flex-col gap-4 group">
            <div className="w-full h-48 bg-surface-container-high rounded-lg overflow-hidden relative">
              <div className="absolute inset-0 bg-error-container/20 group-hover:bg-error-container/40 transition-colors"></div>
            </div>
            <div>
              <span className="text-error font-label-uppercase text-xs mb-2 block">Job Search</span>
              <h3 className="font-headline-md text-primary group-hover:text-secondary transition-colors text-lg">Why You&apos;re Getting Auto-Rejected</h3>
            </div>
          </Link>
        </div>
        <Link href="/blog" className="md:hidden mt-stack-lg flex items-center justify-center gap-1 text-secondary font-label-uppercase text-label-uppercase hover:underline w-full">
          View All Articles <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </Link>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="max-w-[1200px] mx-auto px-margin-page py-24 w-full">
        <div className="text-center mb-stack-xl">
          <h2 className="font-headline-md text-headline-md text-primary md:text-3xl">Simple, Transparent Pricing</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
            All paid plans include up to 100 tailored resumes per month.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter max-w-5xl mx-auto items-stretch">
          {/* Free Card */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg flex flex-col hover:border-secondary transition-colors">
            <h3 className="font-headline-md text-headline-md text-primary">Free</h3>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="font-display-lg text-display-lg text-primary">$0</span>
              <span className="text-on-surface-variant font-body-sm text-body-sm">/ forever</span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-2 border-b border-outline-variant/30 pb-4">Test the waters and see the AI in action.</p>
            <ul className="mt-4 space-y-3 flex-grow font-body-sm text-body-sm text-primary">
              <li className="flex items-start gap-2"><span className="material-symbols-outlined text-tertiary-container text-[18px]">check</span> 5 Resume Matches per month</li>
              <li className="flex items-start gap-2"><span className="material-symbols-outlined text-tertiary-container text-[18px]">check</span> Basic ATS Keyword Gap Analysis</li>
              <li className="flex items-start gap-2"><span className="material-symbols-outlined text-tertiary-container text-[18px]">check</span> Standard PDF Export</li>
            </ul>
            <Link className="mt-8 w-full block text-center bg-surface-container border border-outline-variant text-primary font-label-uppercase text-label-uppercase px-4 py-3 rounded-lg hover:bg-surface-variant transition-colors" href="/signup">Start Free</Link>
          </div>
          {/* Starter (Monthly) Card */}
          <div className="bg-primary text-on-primary border border-primary rounded-xl p-stack-lg flex flex-col relative shadow-lg transform md:-translate-y-2">
            <div className="absolute top-0 right-6 transform -translate-y-1/2">
              <span className="bg-secondary text-on-secondary font-label-uppercase text-[10px] px-3 py-1 rounded-full shadow-sm">Most Popular</span>
            </div>
            <h3 className="font-headline-md text-headline-md">Starter</h3>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="font-display-lg text-display-lg">$5.49</span>
              <span className="text-inverse-primary font-body-sm text-body-sm">/ month</span>
            </div>
            <p className="font-body-sm text-body-sm text-inverse-primary mt-2 border-b border-outline-variant/30 pb-4">Everything you need for an active job hunt.</p>
            <ul className="mt-4 space-y-3 flex-grow font-body-sm text-body-sm">
              <li className="flex items-start gap-2"><span className="material-symbols-outlined text-tertiary-fixed-dim text-[18px]">check</span> Up to 100 tailored resumes / month</li>
              <li className="flex items-start gap-2"><span className="material-symbols-outlined text-tertiary-fixed-dim text-[18px]">check</span> Advanced AI Rewriting Engine</li>
              <li className="flex items-start gap-2"><span className="material-symbols-outlined text-tertiary-fixed-dim text-[18px]">check</span> Master Resume Management</li>
              <li className="flex items-start gap-2"><span className="material-symbols-outlined text-tertiary-fixed-dim text-[18px]">check</span> Application Tracker Dashboard</li>
            </ul>
            <PricingCTA
              interval="monthly"
              className="w-full block text-center bg-secondary text-on-secondary font-label-uppercase text-label-uppercase px-4 py-3 rounded-lg hover:bg-secondary-container transition-colors disabled:opacity-60 disabled:pointer-events-none"
            >
              Upgrade Monthly
            </PricingCTA>
          </div>
          {/* Starter Yearly Card */}
          <div className="bg-surface-container-lowest border border-secondary rounded-xl p-stack-lg flex flex-col relative shadow-md hover:border-secondary transition-colors">
            <div className="absolute top-0 right-6 transform -translate-y-1/2">
              <span className="bg-tertiary-container text-on-tertiary-container font-label-uppercase text-[10px] px-3 py-1 rounded-full shadow-sm">Save ~24%</span>
            </div>
            <h3 className="font-headline-md text-headline-md text-primary">Starter (Yearly)</h3>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="font-display-lg text-display-lg text-primary">$49.99</span>
              <span className="text-on-surface-variant font-body-sm text-body-sm">/ year</span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
              Just <span className="text-primary font-medium">$4.16</span> / month, billed annually.
            </p>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 border-b border-outline-variant/30 pb-4">
              Everything in Starter, with nearly 3 months free.
            </p>
            <ul className="mt-4 space-y-3 flex-grow font-body-sm text-body-sm text-primary">
              <li className="flex items-start gap-2"><span className="material-symbols-outlined text-tertiary-container text-[18px]">check</span> Up to 100 tailored resumes / month</li>
              <li className="flex items-start gap-2"><span className="material-symbols-outlined text-tertiary-container text-[18px]">check</span> Advanced AI Rewriting Engine</li>
              <li className="flex items-start gap-2"><span className="material-symbols-outlined text-tertiary-container text-[18px]">check</span> Priority support</li>
              <li className="flex items-start gap-2"><span className="material-symbols-outlined text-tertiary-container text-[18px]">check</span> Ad-free experience</li>
              <li className="flex items-start gap-2"><span className="material-symbols-outlined text-tertiary-container text-[18px]">check</span> Lock-in pricing for 12 months</li>
            </ul>
            <PricingCTA
              interval="yearly"
              className="w-full block text-center bg-primary text-on-primary font-label-uppercase text-label-uppercase px-4 py-3 rounded-lg hover:bg-inverse-surface transition-colors disabled:opacity-60 disabled:pointer-events-none"
            >
              Upgrade Yearly
            </PricingCTA>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="max-w-[800px] mx-auto px-margin-page py-24 w-full border-t border-outline-variant/30">
        <div className="text-center mb-stack-xl">
          <h2 className="font-headline-md text-headline-md text-primary md:text-3xl">Frequently asked questions</h2>
          <p className="font-body-base text-body-base text-on-surface-variant mt-2">Everything you need to know about HireTuner, ATS scoring, and our plans.</p>
        </div>
        <div className="flex flex-col gap-stack-sm">
          {FAQ_ITEMS.map((item) => (
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

      {/* Footer ad (free + monthly users only) */}
      <div className="max-w-[1200px] mx-auto px-margin-page w-full pb-stack-xl">
        <AdSlot slot="homeFooter" />
      </div>
    </>
  );
}
