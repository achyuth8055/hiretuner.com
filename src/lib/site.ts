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
  title: "HireTuner: Resume Tailoring & ATS Analysis | Tailor Your Resume to Any Job Description",
  description:
    "HireTuner reads any job description, surfaces the keywords your resume is missing, and helps you reorder your strongest bullets to match — without inventing experience you don't have. Free ATS-style match score, keyword gap analysis, application tracker, and Chrome extension.",
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
 * Free tool pages surfaced in the navbar "Tools" dropdown and the footer.
 * Single source of truth so the two stay in sync. Every path here must exist
 * as a real route under (marketing) and be present in marketingRoutes below.
 */
export const toolLinks: { label: string; path: string; description: string }[] = [
  { label: "Resume Builder", path: "/resume-builder", description: "Build an ATS-friendly resume in minutes" },
  { label: "CV Builder", path: "/cv-builder", description: "Create a complete professional CV" },
  { label: "Resume & CV Templates", path: "/resume-templates", description: "Pick from 30+ free ATS-friendly designs" },
  { label: "ATS Resume Score Checker", path: "/ats-resume-score-checker", description: "Score your resume against ATS parsing rules" },
  { label: "Resume Match Checker", path: "/resume-match-checker", description: "See how well your resume matches a job" },
  { label: "Resume Keyword Scanner", path: "/resume-keyword-scanner", description: "Find missing keywords in your resume" },
  { label: "JD Keyword Extractor", path: "/jd-keyword-extractor", description: "Pull the key skills from any job description" },
  { label: "Resume Bullet Point Generator", path: "/resume-bullet-point-generator", description: "Turn tasks into impactful bullet points" },
  { label: "Resume Summary Generator", path: "/resume-summary-generator", description: "Write a sharp professional summary" },
  { label: "Interview Question Generator", path: "/interview-question-generator", description: "Practice with role-specific questions" },
  { label: "Salary Estimator", path: "/salary-estimator", description: "Estimate pay for any role and location" },
  { label: "Job Application Tracker", path: "/job-application-tracker", description: "Track every application in one place" },
]

/**
 * Public, indexable marketing routes. Source of truth for sitemap.ts.
 * Auth/app routes (login, signup, dashboard, editor) are intentionally excluded.
 */
export const marketingRoutes: { path: string; changeFrequency: "weekly" | "monthly" | "yearly"; priority: number }[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/about", changeFrequency: "monthly", priority: 0.6 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.5 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.7 },
  { path: "/resume-builder", changeFrequency: "monthly", priority: 0.9 },
  { path: "/cv-builder", changeFrequency: "monthly", priority: 0.9 },
  { path: "/resume-templates", changeFrequency: "weekly", priority: 0.9 },
  { path: "/ats-resume-score-checker", changeFrequency: "monthly", priority: 0.9 },
  { path: "/resume-match-checker", changeFrequency: "monthly", priority: 0.9 },
  { path: "/jd-keyword-extractor", changeFrequency: "monthly", priority: 0.8 },
  { path: "/resume-keyword-scanner", changeFrequency: "monthly", priority: 0.8 },
  { path: "/resume-bullet-point-generator", changeFrequency: "monthly", priority: 0.8 },
  { path: "/resume-summary-generator", changeFrequency: "monthly", priority: 0.8 },
  { path: "/interview-question-generator", changeFrequency: "monthly", priority: 0.8 },
  { path: "/salary-estimator", changeFrequency: "monthly", priority: 0.8 },
  { path: "/job-application-tracker", changeFrequency: "monthly", priority: 0.7 },
  { path: "/salary-guide", changeFrequency: "monthly", priority: 0.7 },
  { path: "/privacy-policy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/cookie-policy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms-of-service", changeFrequency: "yearly", priority: 0.3 },
]
