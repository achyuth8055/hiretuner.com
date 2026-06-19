/**
 * Blog content source of truth. Each post renders both in the /blog index and
 * on its own /blog/[slug] page. All copy here is original to HireTuner.
 */

export type BlogSection = {
  heading: string
  paragraphs: string[]
  bullets?: string[]
}

export type BlogAccent = "secondary" | "tertiary" | "error"

export type BlogPost = {
  slug: string
  category: string
  accent: BlogAccent
  title: string
  excerpt: string
  /** ISO date, e.g. "2026-05-12". */
  date: string
  readMinutes: number
  intro: string
  sections: BlogSection[]
}

export const blogPosts: BlogPost[] = [
  {
    slug: "how-to-beat-the-ats-in-2026",
    category: "Career Advice",
    accent: "secondary",
    title: "How to Beat the ATS in 2026",
    excerpt:
      "Applicant Tracking Systems have only gotten smarter. Learn how modern parsers read your resume, which formatting choices quietly sink you, and the exact steps to make sure your application ranks for the roles you want.",
    date: "2026-05-28",
    readMinutes: 6,
    intro:
      "Most resumes are read by software before a human ever sees them. An Applicant Tracking System parses your file, maps it against the job description, and ranks you alongside everyone else who applied. Understanding that pipeline is the difference between landing in the recruiter's shortlist and disappearing into the archive.",
    sections: [
      {
        heading: "How a modern ATS actually reads your resume",
        paragraphs: [
          "When you submit a resume, the system extracts raw text from your file and tries to slot each piece into a structured profile: name, contact details, work history, education, and skills. If it can confidently identify those fields, your profile is searchable and rankable. If it cannot, your experience is effectively invisible.",
          "The single biggest cause of parsing failures is layout. Multi-column designs, text boxes, tables, and graphics may look polished to a person but scramble the reading order for a parser. A clean, single-column structure with standard section headings is the most reliable way to be read correctly.",
        ],
      },
      {
        heading: "Match the job description without keyword stuffing",
        paragraphs: [
          "Ranking is largely about overlap between your resume and the posting. The closer your wording mirrors the language of the job description — the actual tools, certifications, and responsibilities it names — the higher you tend to score.",
          "That does not mean pasting a wall of keywords. Stuffing is easy to detect and reads badly to the human on the other side. Instead, weave the terms that genuinely apply to you into real accomplishments, using the same vocabulary the employer used.",
        ],
        bullets: [
          "Use the exact noun the posting uses (if it says \"CI/CD,\" don't only write \"build pipelines\").",
          "Spell out acronyms once and pair them with the expansion, e.g. \"J2EE (Java Enterprise Edition).\"",
          "Mirror the job title in your summary when it is accurate to your target.",
        ],
      },
      {
        heading: "A quick pre-submission checklist",
        paragraphs: [
          "Before you apply, run a short audit. A few minutes here saves you from silent auto-rejections that have nothing to do with your qualifications.",
        ],
        bullets: [
          "Single-column layout, standard headings (Experience, Education, Skills).",
          "No critical information locked inside headers, footers, or images.",
          "File saved as a text-based PDF, not a scanned image.",
          "Keywords from the posting reflected honestly in your bullets.",
        ],
      },
    ],
  },
  {
    slug: "anatomy-of-a-perfect-resume-bullet-point",
    category: "Resume Tips",
    accent: "tertiary",
    title: "The Anatomy of a Perfect Resume Bullet Point",
    excerpt:
      "Stop opening lines with weak verbs like \"responsible for.\" We break down the action-impact-metric formula that turns vague duties into achievements recruiters and ATS scanners both reward.",
    date: "2026-05-19",
    readMinutes: 5,
    intro:
      "A resume is only as strong as its bullet points. The good news is that compelling bullets follow a predictable shape — once you learn it, every line becomes easier to write and far more persuasive.",
    sections: [
      {
        heading: "The action-impact-metric formula",
        paragraphs: [
          "A strong bullet leads with a specific action verb, states the impact of that action, and quantifies it wherever possible. \"Responsible for the billing system\" tells a reader nothing. \"Re-architected the billing pipeline, cutting p99 latency 40%\" tells them what you did, why it mattered, and how much it moved the needle.",
          "Metrics do the heavy lifting because they are concrete and comparable. Even rough numbers — time saved, percentage improved, revenue influenced, users served — make a claim believable in a way adjectives never can.",
        ],
      },
      {
        heading: "Verbs to reach for, and phrases to drop",
        paragraphs: [
          "Open with verbs that signal ownership and outcome rather than mere participation. Lead, shipped, reduced, automated, and launched all imply you drove something to completion.",
        ],
        bullets: [
          "Replace \"responsible for\" with the actual thing you did.",
          "Replace \"helped with\" with your specific contribution.",
          "Replace \"worked on\" with a verb that names the result.",
        ],
      },
      {
        heading: "Keep it honest",
        paragraphs: [
          "Strong does not mean inflated. Every number should be one you can explain in an interview. The aim is to present your real work in its best, most precise light — not to invent achievements. A bullet you can defend confidently will always beat one that sounds impressive but crumbles under a follow-up question.",
        ],
      },
    ],
  },
  {
    slug: "why-you-keep-getting-auto-rejected",
    category: "Job Search",
    accent: "error",
    title: "Why You Keep Getting Auto-Rejected (and How to Fix It)",
    excerpt:
      "The application black hole is rarely about your qualifications. We unpack the most common reasons resumes get filtered out before a human ever reads them, and how to diagnose your own.",
    date: "2026-05-08",
    readMinutes: 6,
    intro:
      "Getting rejected within minutes of applying feels personal, but it usually is not. Most early rejections are mechanical — a filter, a missing keyword, a parsing error — and they are fixable once you know where to look.",
    sections: [
      {
        heading: "The usual suspects",
        paragraphs: [
          "Before blaming your experience, rule out the common mechanical causes. These account for a large share of instant rejections and have nothing to do with whether you could do the job.",
        ],
        bullets: [
          "Knockout questions: a required certification, work authorization, or years-of-experience threshold answered \"no.\"",
          "Missing must-have keywords the posting clearly emphasizes.",
          "A layout the parser cannot read, so key sections come through blank.",
          "Applying far outside the stated seniority or location range.",
        ],
      },
      {
        heading: "Diagnose your own resume",
        paragraphs: [
          "Run your resume and a target job description through a match check to see your estimated overlap and which terms you are missing. If your score is low across several similar postings, the problem is systematic and worth fixing once rather than guessing per-application.",
          "Also paste your resume into a plain-text editor. Whatever survives that copy-paste is roughly what the ATS sees. If sections vanish or scramble, that is your formatting telling you it needs to be simpler.",
        ],
      },
      {
        heading: "Fix it at the source",
        paragraphs: [
          "Once you know the cause, the fix is usually quick: simplify the layout, add the genuine keywords you were missing, and target roles that match your actual level. Tailoring each application to the posting — rather than sending one generic resume everywhere — is the highest-leverage change most job seekers can make.",
        ],
      },
    ],
  },
  {
    slug: "keyword-matching-101",
    category: "Keywords",
    accent: "secondary",
    title: "Keyword Matching 101: Why \"Java Expert\" Loses to \"J2EE\"",
    excerpt:
      "Two candidates with identical skills can score very differently in an ATS. Here is how keyword extraction actually works and how to mirror a job description without keyword stuffing.",
    date: "2026-04-30",
    readMinutes: 5,
    intro:
      "Applicant Tracking Systems do not understand your skills the way a person does. They match strings and weighted terms. That is why precise wording often matters more than the underlying ability it describes.",
    sections: [
      {
        heading: "Exact terms beat synonyms",
        paragraphs: [
          "If a posting lists \"J2EE\" and your resume says \"Java expert,\" a person knows those are related — a keyword matcher may not. The system is often looking for the specific token in the job description, so the candidate who used the employer's exact phrasing scores higher even with identical experience.",
          "The takeaway is simple: read the posting closely and adopt its vocabulary wherever it is accurate for you. Name the same frameworks, methodologies, and certifications it names, in the same words.",
        ],
      },
      {
        heading: "Cover both the acronym and the expansion",
        paragraphs: [
          "Different postings use different forms of the same term. Some say \"CI/CD,\" others say \"continuous integration.\" Because you cannot predict which one a given system searches for, include both at least once where it is honest to do so.",
        ],
        bullets: [
          "\"Kubernetes (K8s)\" covers both spellings.",
          "\"Search engine optimization (SEO)\" covers the acronym and the phrase.",
          "List the framework and the language it runs on if both appear in the posting.",
        ],
      },
      {
        heading: "Extract before you write",
        paragraphs: [
          "Rather than guessing which terms matter, pull the key skills straight from the job description first, then check which ones your resume already covers. That turns keyword matching from a guessing game into a quick gap-closing exercise you can repeat for every application.",
        ],
      },
    ],
  },
  {
    slug: "tailoring-your-resume-in-minutes",
    category: "Resume Tips",
    accent: "tertiary",
    title: "Tailoring Your Resume to a Job Description in Minutes",
    excerpt:
      "Customizing every application by hand is exhausting. Learn a repeatable workflow for tailoring your resume to each posting quickly, while keeping every claim honest and verifiable.",
    date: "2026-04-21",
    readMinutes: 5,
    intro:
      "Tailoring works — applications customized to the posting consistently outperform generic ones. The catch is time. The solution is a repeatable workflow that gets you most of the benefit in a fraction of the effort.",
    sections: [
      {
        heading: "Start from a master profile",
        paragraphs: [
          "Keep one comprehensive version of your resume that contains every role, project, and skill you might ever want to highlight. You never send this document as-is. Instead, each tailored resume is a focused subset of it, chosen to match a specific posting.",
          "With a master profile in place, tailoring becomes selection rather than rewriting — you are choosing which true things to emphasize, not inventing new ones.",
        ],
      },
      {
        heading: "A three-step tailoring pass",
        paragraphs: ["For each application, run the same quick loop:"],
        bullets: [
          "Extract the posting's key skills and responsibilities.",
          "Reorder and lightly reword your bullets so the most relevant ones lead and use the posting's vocabulary.",
          "Confirm your match score improved, then submit.",
        ],
      },
      {
        heading: "Honesty keeps it sustainable",
        paragraphs: [
          "Tailoring is about emphasis, not fabrication. Every tailored claim should trace back to something real in your master profile. Done this way, the process is fast, repeatable, and leaves you able to speak to every line in the interview.",
        ],
      },
    ],
  },
  {
    slug: "resume-formatting-mistakes-that-confuse-ats",
    category: "Career Advice",
    accent: "error",
    title: "Resume Formatting Mistakes That Confuse ATS Parsers",
    excerpt:
      "Columns, tables, headers, and creative fonts can look great to humans and unreadable to software. See which design choices to avoid so your experience parses cleanly every time.",
    date: "2026-04-10",
    readMinutes: 4,
    intro:
      "A beautiful resume that a parser cannot read is worse than a plain one it can. Many popular design choices quietly break the extraction step, so your strongest experience never makes it into the searchable profile.",
    sections: [
      {
        heading: "The formatting choices that backfire",
        paragraphs: [
          "These patterns routinely cause parsing problems. None of them are wrong in principle — they are simply risky when software has to read the file first.",
        ],
        bullets: [
          "Multiple columns, which scramble the reading order.",
          "Tables and text boxes, whose contents may be skipped entirely.",
          "Critical details placed in the header or footer region.",
          "Skills shown only as graphics, charts, or rating bars.",
          "Uncommon fonts or icons standing in for section labels.",
        ],
      },
      {
        heading: "What to do instead",
        paragraphs: [
          "Use a single-column layout with clear, conventional headings and plain text for everything that matters. Save your file as a text-based PDF so the words remain selectable. If you want visual personality, express it through restrained spacing, type, and a single accent color — not through structures that fight the parser.",
          "If you are unsure whether a template is safe, choose one explicitly built to be ATS-friendly. It removes the guesswork and lets you focus on the content.",
        ],
      },
    ],
  },
  {
    slug: "how-many-jobs-should-you-apply-to",
    category: "Job Search",
    accent: "secondary",
    title: "How Many Jobs Should You Apply To Each Week?",
    excerpt:
      "Volume matters, but so does fit. We look at what a realistic, sustainable application pace looks like and how tailoring faster lets you apply to more of the right roles.",
    date: "2026-03-31",
    readMinutes: 4,
    intro:
      "There is no magic number of applications, but there is a useful way to think about it: aim for the most tailored applications you can sustain without burning out. Quality and quantity are not opposites if your workflow is efficient.",
    sections: [
      {
        heading: "Fit beats firehose",
        paragraphs: [
          "Sending a hundred identical resumes feels productive but tends to produce a hundred mechanical rejections. A smaller number of well-targeted, tailored applications usually yields more responses, because each one actually matches what the employer asked for.",
          "Track which roles you are a genuine fit for and prioritize those. A focused list you can tailor well will outperform a sprawling one you can only spam.",
        ],
      },
      {
        heading: "Make tailoring cheap so you can do more of it",
        paragraphs: [
          "The reason people fall back on generic applications is that tailoring by hand is slow. Shrink that cost — with a master profile, keyword extraction, and quick match checks — and you can apply to more of the right roles without lowering quality.",
          "A sustainable rhythm for many job seekers is a steady set of carefully tailored applications each week, plus consistent follow-up, rather than an exhausting one-time blast.",
        ],
      },
    ],
  },
  {
    slug: "translating-experience-into-a-new-field",
    category: "Career Changers",
    accent: "tertiary",
    title: "Translating Past Experience Into a New Field's Language",
    excerpt:
      "Switching industries does not mean starting over. Learn how to reframe transferable skills using the vocabulary of your target role so both ATS filters and hiring managers take notice.",
    date: "2026-03-20",
    readMinutes: 5,
    intro:
      "Career changers often have exactly the right skills described in exactly the wrong words. The work is not acquiring new abilities overnight — it is translating what you have already done into the language your target field uses.",
    sections: [
      {
        heading: "Find the transferable core",
        paragraphs: [
          "Start by separating what you did from the industry you did it in. Managing a project, analyzing data, leading a team, handling customers, and improving a process are all portable. List your accomplishments in those neutral terms first.",
          "This step matters because it stops you from underselling yourself. The substance of your experience usually transfers far better than people assume once it is stated in general, outcome-focused language.",
        ],
      },
      {
        heading: "Re-skin it in the target vocabulary",
        paragraphs: [
          "Now study several postings in your target field and note the words they use for the things you already do. Map your neutral accomplishments onto that vocabulary so a reader — and an ATS — recognizes the match immediately.",
        ],
        bullets: [
          "Match the target field's job titles and tool names where accurate.",
          "Reframe metrics in terms the new industry cares about.",
          "Lead with the transferable wins most relevant to the role.",
        ],
      },
      {
        heading: "Bridge the gap honestly",
        paragraphs: [
          "Translation has limits — do not claim experience you lack. Where there is a genuine gap, name the adjacent experience you do have and any concrete steps you are taking to close it. A credible, honest bridge is far more persuasive than a stretch a single interview question would expose.",
        ],
      },
    ],
  },
]

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug)
}

export const blogAccentClasses: Record<BlogAccent, { label: string; overlay: string }> = {
  secondary: { label: "text-secondary", overlay: "bg-secondary/10 group-hover:bg-secondary/20" },
  tertiary: { label: "text-tertiary-fixed-dim", overlay: "bg-tertiary-container/10 group-hover:bg-tertiary-container/20" },
  error: { label: "text-error", overlay: "bg-error-container/20 group-hover:bg-error-container/40" },
}
