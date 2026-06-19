import type { ResumeData } from "./types"

/**
 * Placeholder content used to render template previews and gallery thumbnails.
 * Entirely fictional — no real person's resume is reproduced here.
 */
export const sampleResume: ResumeData = {
  contact: {
    fullName: "Jordan Avery",
    title: "Senior Software Engineer",
    email: "jordan.avery@example.com",
    phone: "(555) 014-2837",
    location: "Austin, TX",
    website: "jordanavery.dev",
    linkedin: "linkedin.com/in/jordanavery",
    github: "github.com/jordanavery",
  },
  summary:
    "Backend-focused engineer with 7+ years building reliable, high-throughput services. Led platform work that cut p99 latency by 40% and shipped features used by millions. Comfortable owning systems end to end, from design to on-call.",
  experience: [
    {
      role: "Senior Software Engineer",
      company: "Northwind Labs",
      location: "Austin, TX",
      start: "2021",
      end: "Present",
      bullets: [
        "Re-architected the billing pipeline to event-driven workers, cutting p99 latency 40% and eliminating nightly batch failures.",
        "Led a team of four to launch usage-based pricing, contributing $2.1M in new annual revenue.",
        "Introduced contract tests across services, reducing integration regressions by 65%.",
      ],
    },
    {
      role: "Software Engineer",
      company: "Brightwave",
      location: "Remote",
      start: "2018",
      end: "2021",
      bullets: [
        "Built the public REST and GraphQL APIs powering 30+ partner integrations.",
        "Cut cloud spend 28% by right-sizing services and adding autoscaling policies.",
        "Mentored three junior engineers through their first production launches.",
      ],
    },
    {
      role: "Junior Developer",
      company: "Cobalt Studio",
      location: "Dallas, TX",
      start: "2016",
      end: "2018",
      bullets: [
        "Shipped customer-facing dashboards in React used daily by 5,000+ users.",
        "Automated release tooling, taking deploys from 45 minutes to under 5.",
      ],
    },
  ],
  education: [
    {
      degree: "B.S. in Computer Science",
      school: "University of Texas at Austin",
      location: "Austin, TX",
      end: "2016",
      details: "Graduated with honors. Focus in distributed systems.",
    },
  ],
  skills: [
    { label: "Languages", skills: ["Go", "TypeScript", "Python", "SQL"] },
    { label: "Infrastructure", skills: ["AWS", "Kubernetes", "Terraform", "Kafka"] },
    { label: "Practices", skills: ["System design", "CI/CD", "Observability", "Mentoring"] },
  ],
  projects: [
    {
      name: "OpenLedger",
      description: "Open-source double-entry accounting engine with 2.4k GitHub stars.",
      tech: ["Go", "PostgreSQL"],
    },
    {
      name: "LatencyLab",
      description: "Self-hostable load-testing toolkit for gRPC services.",
      tech: ["Rust", "gRPC"],
    },
  ],
  certifications: ["AWS Certified Solutions Architect — Professional", "Certified Kubernetes Administrator"],
  languages: ["English (native)", "Spanish (professional)"],
  awards: ["Northwind Labs Engineering Excellence Award, 2023"],
}

/**
 * A fuller record for CV-style templates — adds publications and a longer
 * academic history, which is what distinguishes a CV from a resume.
 */
export const sampleCv: ResumeData = {
  contact: {
    fullName: "Dr. Priya Natarajan",
    title: "Postdoctoral Researcher, Computational Biology",
    email: "p.natarajan@example.edu",
    phone: "(555) 027-4490",
    location: "Cambridge, UK",
    website: "priyanatarajan.science",
    linkedin: "linkedin.com/in/priyanatarajan",
  },
  summary:
    "Computational biologist studying gene-regulatory networks with machine learning. Author of 14 peer-reviewed papers and recipient of two national research fellowships. Experienced in supervising graduate students and leading cross-institutional collaborations.",
  experience: [
    {
      role: "Postdoctoral Researcher",
      company: "University of Cambridge",
      location: "Cambridge, UK",
      start: "2022",
      end: "Present",
      bullets: [
        "Developed a graph-neural-network model for predicting transcription-factor binding, improving accuracy 18% over prior baselines.",
        "Co-supervised four PhD students and two visiting researchers.",
        "Secured £240k in follow-on funding as co-investigator.",
      ],
    },
    {
      role: "Doctoral Researcher",
      company: "Imperial College London",
      location: "London, UK",
      start: "2018",
      end: "2022",
      bullets: [
        "Built open pipelines for single-cell RNA analysis adopted by 12 labs.",
        "Presented at six international conferences, twice as an invited speaker.",
      ],
    },
  ],
  education: [
    {
      degree: "Ph.D. in Computational Biology",
      school: "Imperial College London",
      location: "London, UK",
      start: "2018",
      end: "2022",
      details: "Thesis: Machine-learning approaches to gene-regulatory inference.",
    },
    {
      degree: "M.Sc. in Bioinformatics",
      school: "University of Edinburgh",
      location: "Edinburgh, UK",
      end: "2017",
      details: "Distinction.",
    },
  ],
  skills: [
    { label: "Methods", skills: ["Deep learning", "Bayesian inference", "Statistical genetics"] },
    { label: "Tools", skills: ["Python", "R", "PyTorch", "Nextflow"] },
  ],
  publications: [
    {
      title: "Graph neural networks for transcription-factor binding prediction",
      venue: "Nature Methods",
      year: "2024",
      authors: "Natarajan P., Okafor L., Chen W.",
    },
    {
      title: "Scalable single-cell regulatory inference at population scale",
      venue: "Cell Systems",
      year: "2023",
      authors: "Natarajan P., Alvarez R.",
    },
    {
      title: "Benchmarking deep models for gene-expression imputation",
      venue: "Bioinformatics",
      year: "2022",
      authors: "Natarajan P., Singh A., Müller K.",
    },
  ],
  certifications: ["Advanced Statistical Genetics, Wellcome Trust (2021)"],
  languages: ["English (native)", "Tamil (native)", "French (conversational)"],
  awards: [
    "Marie Skłodowska-Curie Postdoctoral Fellowship, 2022",
    "Imperial College President's Scholarship, 2018",
  ],
}
