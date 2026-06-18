/**
 * Central site metadata used by SEO helpers, sitemap, robots, and JSON-LD.
 * Keeping it in one place means every page derives canonical URLs and Open
 * Graph data from the same source of truth.
 */
export const siteConfig = {
  name: "HireTuner",
  shortName: "HireTuner",
  domain: "hiretuner.com",
  url: (process.env.NEXT_PUBLIC_APP_URL ?? "https://hiretuner.com").replace(/\/$/, ""),
  title: "HireTuner: AI Resume Tailoring Tool | Tailor Your Resume to Any Job Description",
  description:
    "HireTuner tunes your resume to every job description. Upload your resume, paste a JD, and get an ATS-friendly tailored resume with keyword gap analysis, an estimated match score, safe AI suggestions, salary tools, and application tracking.",
  tagline: "Tune your resume to every job. Land more interviews.",
  ogImage: "/images/hero-dashboard.png",
  twitter: "@hiretuner",
  locale: "en_US",
  keywords: [
    "ATS resume checker",
    "resume tailoring",
    "AI resume builder",
    "resume keyword scanner",
    "job description match",
    "resume bullet point generator",
    "ATS score checker",
    "salary estimator",
  ],
} as const

/**
 * Public, indexable marketing routes. Source of truth for sitemap.ts.
 * Auth/app routes (login, signup, dashboard, editor) are intentionally excluded.
 */
export const marketingRoutes: { path: string; changeFrequency: "weekly" | "monthly" | "yearly"; priority: number }[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/about", changeFrequency: "monthly", priority: 0.6 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.5 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.7 },
  { path: "/ats-resume-score-checker", changeFrequency: "monthly", priority: 0.9 },
  { path: "/resume-match-checker", changeFrequency: "monthly", priority: 0.9 },
  { path: "/jd-keyword-extractor", changeFrequency: "monthly", priority: 0.8 },
  { path: "/resume-keyword-scanner", changeFrequency: "monthly", priority: 0.8 },
  { path: "/resume-bullet-point-generator", changeFrequency: "monthly", priority: 0.8 },
  { path: "/resume-summary-generator", changeFrequency: "monthly", priority: 0.8 },
  { path: "/interview-question-generator", changeFrequency: "monthly", priority: 0.8 },
  { path: "/salary-estimator", changeFrequency: "monthly", priority: 0.8 },
  { path: "/job-application-tracker", changeFrequency: "monthly", priority: 0.7 },
  { path: "/java-developer-salary-guide", changeFrequency: "monthly", priority: 0.7 },
  { path: "/privacy-policy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/cookie-policy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms-of-service", changeFrequency: "yearly", priority: 0.3 },
]
