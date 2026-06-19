/**
 * Salary guides for many roles and streams — not just Java. Each entry powers a
 * /salary-guide/[slug] page and the /salary-guide index. Figures are broad,
 * illustrative market estimates (USD, full-time), not guarantees; actual pay
 * varies with company, location, and individual experience.
 */

export type SalaryLevel = {
  level: string
  /** Display range, e.g. "$95,000 – $130,000". */
  range: string
}

export type SalaryGuide = {
  slug: string
  role: string
  /** Discipline grouping for the index filters, e.g. "Backend", "Data", "Design". */
  stream: string
  blurb: string
  levels: SalaryLevel[]
  skills: string[]
  factors: string[]
}

export const salaryGuides: SalaryGuide[] = [
  {
    slug: "java-developer",
    role: "Java Developer",
    stream: "Backend",
    blurb:
      "Java remains a backbone of enterprise systems, fintech, and large-scale backends. Strong fundamentals plus modern frameworks and cloud experience command a premium.",
    levels: [
      { level: "Entry (0–1 yr)", range: "$70,000 – $90,000" },
      { level: "Mid (1–3 yrs)", range: "$95,000 – $130,000" },
      { level: "Senior (3–5 yrs)", range: "$130,000 – $165,000" },
      { level: "Lead / Architect (5+ yrs)", range: "$165,000 – $210,000" },
    ],
    skills: ["Spring Boot", "Microservices", "AWS", "Kafka", "SQL", "Kubernetes"],
    factors: ["Cloud and distributed-systems experience", "Enterprise vs. startup", "On-call and system ownership"],
  },
  {
    slug: "python-developer",
    role: "Python Developer",
    stream: "Backend",
    blurb:
      "Python spans web backends, automation, data, and ML tooling. Versatility is the draw; pay rises sharply when paired with data or infrastructure depth.",
    levels: [
      { level: "Entry (0–1 yr)", range: "$72,000 – $92,000" },
      { level: "Mid (1–3 yrs)", range: "$95,000 – $128,000" },
      { level: "Senior (3–5 yrs)", range: "$128,000 – $162,000" },
      { level: "Lead / Architect (5+ yrs)", range: "$160,000 – $205,000" },
    ],
    skills: ["Django", "FastAPI", "PostgreSQL", "AWS", "Pandas", "Docker"],
    factors: ["Adjacent data/ML skills", "Async and performance work", "Industry (fintech, health, ad-tech)"],
  },
  {
    slug: "frontend-developer",
    role: "Frontend Developer",
    stream: "Frontend",
    blurb:
      "Frontend engineers own the user-facing layer. Deep React or framework expertise, performance, and accessibility separate mid from senior pay.",
    levels: [
      { level: "Entry (0–1 yr)", range: "$68,000 – $88,000" },
      { level: "Mid (1–3 yrs)", range: "$90,000 – $122,000" },
      { level: "Senior (3–5 yrs)", range: "$122,000 – $158,000" },
      { level: "Lead / Architect (5+ yrs)", range: "$155,000 – $195,000" },
    ],
    skills: ["React", "TypeScript", "Next.js", "Web performance", "Accessibility", "CSS architecture"],
    factors: ["Design-system ownership", "Performance and Core Web Vitals work", "Product vs. agency"],
  },
  {
    slug: "backend-developer",
    role: "Backend Developer",
    stream: "Backend",
    blurb:
      "Backend engineers build the APIs, services, and data layers behind every product. Reliability, scale, and system design drive compensation.",
    levels: [
      { level: "Entry (0–1 yr)", range: "$72,000 – $94,000" },
      { level: "Mid (1–3 yrs)", range: "$96,000 – $132,000" },
      { level: "Senior (3–5 yrs)", range: "$132,000 – $168,000" },
      { level: "Lead / Architect (5+ yrs)", range: "$165,000 – $215,000" },
    ],
    skills: ["API design", "Databases", "Distributed systems", "Cloud", "Caching", "Observability"],
    factors: ["Scale of systems owned", "On-call responsibility", "Language and stack demand"],
  },
  {
    slug: "full-stack-developer",
    role: "Full-Stack Developer",
    stream: "Full-Stack",
    blurb:
      "Full-stack engineers ship features end to end. Breadth is valued at startups; senior pay rewards depth on at least one side of the stack.",
    levels: [
      { level: "Entry (0–1 yr)", range: "$70,000 – $92,000" },
      { level: "Mid (1–3 yrs)", range: "$95,000 – $130,000" },
      { level: "Senior (3–5 yrs)", range: "$130,000 – $166,000" },
      { level: "Lead / Architect (5+ yrs)", range: "$162,000 – $205,000" },
    ],
    skills: ["React", "Node.js", "TypeScript", "SQL", "Cloud", "CI/CD"],
    factors: ["Startup vs. enterprise", "Ownership of whole features", "Depth on front or back end"],
  },
  {
    slug: "data-engineer",
    role: "Data Engineer",
    stream: "Data",
    blurb:
      "Data engineers build the pipelines and platforms analytics and ML depend on. Demand is high and pay reflects scarcity of strong platform skills.",
    levels: [
      { level: "Entry (0–1 yr)", range: "$80,000 – $100,000" },
      { level: "Mid (1–3 yrs)", range: "$105,000 – $140,000" },
      { level: "Senior (3–5 yrs)", range: "$140,000 – $180,000" },
      { level: "Lead / Principal (5+ yrs)", range: "$180,000 – $230,000" },
    ],
    skills: ["SQL", "Spark", "Airflow", "dbt", "Snowflake", "Python"],
    factors: ["Streaming vs. batch scale", "Cloud data-warehouse depth", "Industry data volume"],
  },
  {
    slug: "data-scientist",
    role: "Data Scientist",
    stream: "Data",
    blurb:
      "Data scientists turn data into decisions and models. Compensation climbs with measurable business impact and production ML experience.",
    levels: [
      { level: "Entry (0–1 yr)", range: "$85,000 – $105,000" },
      { level: "Mid (1–3 yrs)", range: "$110,000 – $145,000" },
      { level: "Senior (3–5 yrs)", range: "$145,000 – $185,000" },
      { level: "Lead / Principal (5+ yrs)", range: "$185,000 – $240,000" },
    ],
    skills: ["Python", "Statistics", "Machine learning", "SQL", "Experimentation", "Communication"],
    factors: ["Production model ownership", "Domain expertise", "Research vs. product focus"],
  },
  {
    slug: "machine-learning-engineer",
    role: "Machine Learning Engineer",
    stream: "AI / ML",
    blurb:
      "ML engineers put models into production at scale. With AI demand surging, strong MLOps and applied-ML skills are among the best paid in software.",
    levels: [
      { level: "Entry (0–1 yr)", range: "$95,000 – $120,000" },
      { level: "Mid (1–3 yrs)", range: "$125,000 – $165,000" },
      { level: "Senior (3–5 yrs)", range: "$165,000 – $210,000" },
      { level: "Lead / Principal (5+ yrs)", range: "$210,000 – $280,000" },
    ],
    skills: ["PyTorch", "MLOps", "Python", "Distributed training", "LLMs", "Cloud GPUs"],
    factors: ["Frontier AI vs. applied ML", "Infra and scale", "Research publications"],
  },
  {
    slug: "devops-engineer",
    role: "DevOps Engineer",
    stream: "DevOps / SRE",
    blurb:
      "DevOps and SRE keep systems reliable, fast, and shippable. Cloud, automation, and incident expertise push pay toward the top of the backend range.",
    levels: [
      { level: "Entry (0–1 yr)", range: "$78,000 – $98,000" },
      { level: "Mid (1–3 yrs)", range: "$100,000 – $138,000" },
      { level: "Senior (3–5 yrs)", range: "$138,000 – $178,000" },
      { level: "Lead / Principal (5+ yrs)", range: "$178,000 – $225,000" },
    ],
    skills: ["Kubernetes", "Terraform", "AWS", "CI/CD", "Observability", "Linux"],
    factors: ["On-call and reliability ownership", "Scale of infrastructure", "Security/compliance scope"],
  },
  {
    slug: "mobile-developer",
    role: "Mobile Developer",
    stream: "Mobile",
    blurb:
      "Mobile engineers build the apps users live in. Native depth (iOS/Android) or strong cross-platform skills both command solid compensation.",
    levels: [
      { level: "Entry (0–1 yr)", range: "$72,000 – $92,000" },
      { level: "Mid (1–3 yrs)", range: "$96,000 – $130,000" },
      { level: "Senior (3–5 yrs)", range: "$130,000 – $165,000" },
      { level: "Lead / Architect (5+ yrs)", range: "$162,000 – $205,000" },
    ],
    skills: ["Swift", "Kotlin", "React Native", "Flutter", "App performance", "CI/CD"],
    factors: ["Native vs. cross-platform", "App scale and userbase", "Platform specialization"],
  },
  {
    slug: "qa-engineer",
    role: "QA / Test Engineer",
    stream: "Quality",
    blurb:
      "Quality engineers safeguard releases through automation and testing strategy. Automation depth and CI integration drive the move from manual to senior pay.",
    levels: [
      { level: "Entry (0–1 yr)", range: "$60,000 – $80,000" },
      { level: "Mid (1–3 yrs)", range: "$82,000 – $112,000" },
      { level: "Senior (3–5 yrs)", range: "$112,000 – $145,000" },
      { level: "Lead / Architect (5+ yrs)", range: "$145,000 – $180,000" },
    ],
    skills: ["Test automation", "Selenium / Playwright", "CI/CD", "API testing", "Performance testing", "Scripting"],
    factors: ["Automation vs. manual focus", "SDET (coding) skills", "Regulated industries"],
  },
  {
    slug: "ux-ui-designer",
    role: "UX / UI Designer",
    stream: "Design",
    blurb:
      "Product designers shape how users experience a product. Research, systems thinking, and measurable product impact separate mid from senior compensation.",
    levels: [
      { level: "Entry (0–1 yr)", range: "$62,000 – $82,000" },
      { level: "Mid (1–3 yrs)", range: "$85,000 – $115,000" },
      { level: "Senior (3–5 yrs)", range: "$115,000 – $150,000" },
      { level: "Lead / Principal (5+ yrs)", range: "$150,000 – $190,000" },
    ],
    skills: ["Figma", "User research", "Design systems", "Prototyping", "Interaction design", "Usability testing"],
    factors: ["Research depth", "Design-system ownership", "Product vs. agency"],
  },
]

export function getSalaryGuide(slug: string): SalaryGuide | undefined {
  return salaryGuides.find((guide) => guide.slug === slug)
}

/** Distinct streams for index filtering. */
export const salaryStreams: string[] = Array.from(new Set(salaryGuides.map((guide) => guide.stream))).sort()
