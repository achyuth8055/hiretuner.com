import type { ResumeTemplate } from "./types"

/**
 * 30+ original resume/CV designs. Each is a (layout × theme) combination, which
 * keeps the renderer small while still producing visually distinct templates.
 * Add a new object here and it shows up in the gallery automatically.
 */

// Self-contained font stacks — no web-font downloads, so previews stay fast and
// the exported document renders identically everywhere.
const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif"
const SANS_GEO = "'Segoe UI', system-ui, -apple-system, sans-serif"
const SERIF = "Georgia, 'Times New Roman', serif"
const SLAB = "'Rockwell', 'Roboto Slab', Georgia, serif"
const MONO = "'SF Mono', 'JetBrains Mono', ui-monospace, monospace"

export const resumeTemplates: ResumeTemplate[] = [
  // --- Single column, classic/centered -------------------------------------
  {
    id: "harvard-classic",
    name: "Harvard Classic",
    category: "both",
    layout: "classic",
    tags: ["Classic", "ATS-safe", "Serif"],
    description: "Timeless centered header with a serif face — the safest, most universally accepted format.",
    theme: { accent: "#1f2937", accentSoft: "#f3f4f6", ink: "#111827", muted: "#4b5563", fontHeading: SERIF, fontBody: SERIF, headingStyle: "underline", density: "regular" },
  },
  {
    id: "executive-serif",
    name: "Executive Serif",
    category: "both",
    layout: "classic",
    tags: ["Classic", "Executive", "Serif"],
    description: "Roomy serif layout with small-caps headings for senior and leadership roles.",
    theme: { accent: "#7c2d12", accentSoft: "#fef3c7", ink: "#1c1917", muted: "#57534e", fontHeading: SERIF, fontBody: SERIF, headingStyle: "caps", density: "roomy" },
  },
  {
    id: "navy-traditional",
    name: "Navy Traditional",
    category: "resume",
    layout: "classic",
    tags: ["Classic", "ATS-safe"],
    description: "Conservative centered layout with a navy accent rule — great for finance and law.",
    theme: { accent: "#1e3a5f", accentSoft: "#eef2f7", ink: "#1f2937", muted: "#52606d", fontHeading: SANS, fontBody: SERIF, headingStyle: "underline", density: "regular" },
  },

  // --- Tech / Engineer ATS (Jake's-Resume style) ---------------------------
  // Centered name + role subtitle, horizontal-rule under each section heading,
  // categorized skills, dense bullet body. The classic dev/engineer format that
  // recruiters and ATS tooling expect.
  {
    id: "tech-classic-serif",
    name: "Tech Classic Serif",
    category: "resume",
    layout: "classic",
    tags: ["Classic", "ATS-safe", "Technical", "Serif", "One-page"],
    description: "Centered serif header with rule-under-section headings — the canonical engineer / .NET / SDE resume layout.",
    theme: { accent: "#111827", accentSoft: "#e5e7eb", ink: "#111827", muted: "#374151", fontHeading: SERIF, fontBody: SERIF, headingStyle: "underline", density: "compact" },
  },
  {
    id: "tech-classic-sans",
    name: "Engineer ATS",
    category: "resume",
    layout: "classic",
    tags: ["Classic", "ATS-safe", "Technical", "One-page"],
    description: "ATS-first centered header with sans body and rules under each section — clean and recruiter-friendly.",
    theme: { accent: "#0f172a", accentSoft: "#e2e8f0", ink: "#0f172a", muted: "#475569", fontHeading: SANS, fontBody: SANS, headingStyle: "underline", density: "compact" },
  },
  {
    id: "dev-clean",
    name: "Developer Clean",
    category: "resume",
    layout: "classic",
    tags: ["Classic", "Technical", "Minimal", "Two-tone"],
    description: "Quiet two-tone classic layout with serif headings and sans body — great for senior engineering and developer roles.",
    theme: { accent: "#1f2937", accentSoft: "#e5e7eb", ink: "#1f2937", muted: "#4b5563", fontHeading: SERIF, fontBody: SANS, headingStyle: "underline", density: "regular" },
  },
  {
    id: "tech-monospace",
    name: "SDE Mono",
    category: "resume",
    layout: "classic",
    tags: ["Classic", "Technical", "Monospace", "One-page"],
    description: "Mono-headings on a centered classic layout — distinctive but still ATS-safe for technical roles.",
    theme: { accent: "#0f172a", accentSoft: "#e2e8f0", ink: "#0f172a", muted: "#475569", fontHeading: MONO, fontBody: SANS, headingStyle: "underline", density: "compact" },
  },

  // --- Single column, modern/left ------------------------------------------
  {
    id: "modern-indigo",
    name: "Modern Indigo",
    category: "resume",
    layout: "modern",
    tags: ["Modern", "ATS-safe", "Two-tone"],
    description: "Clean left-aligned header with an indigo accent bar and crisp sans type.",
    theme: { accent: "#4f46e5", accentSoft: "#eef2ff", ink: "#1e293b", muted: "#64748b", fontHeading: SANS_GEO, fontBody: SANS_GEO, headingStyle: "bar", density: "regular" },
  },
  {
    id: "minimal-slate",
    name: "Minimal Slate",
    category: "resume",
    layout: "modern",
    tags: ["Minimal", "ATS-safe", "Modern"],
    description: "Ultra-clean, lots of whitespace, thin rules. Lets the content speak.",
    theme: { accent: "#334155", accentSoft: "#f1f5f9", ink: "#0f172a", muted: "#64748b", fontHeading: SANS, fontBody: SANS, headingStyle: "plain", density: "roomy" },
  },
  {
    id: "emerald-fresh",
    name: "Emerald Fresh",
    category: "resume",
    layout: "modern",
    tags: ["Modern", "Colorful"],
    description: "Friendly emerald accents with bar headings — good for startups and product roles.",
    theme: { accent: "#059669", accentSoft: "#ecfdf5", ink: "#1f2937", muted: "#6b7280", fontHeading: SANS_GEO, fontBody: SANS_GEO, headingStyle: "bar", density: "regular" },
  },
  {
    id: "crimson-modern",
    name: "Crimson Modern",
    category: "resume",
    layout: "modern",
    tags: ["Modern", "Colorful"],
    description: "Confident crimson headings on a clean grid — stands out without trying too hard.",
    theme: { accent: "#be123c", accentSoft: "#fff1f2", ink: "#1f2937", muted: "#6b7280", fontHeading: SANS, fontBody: SANS, headingStyle: "bar", density: "regular" },
  },
  {
    id: "slab-editorial",
    name: "Slab Editorial",
    category: "resume",
    layout: "modern",
    tags: ["Modern", "Editorial"],
    description: "Slab-serif headings paired with sans body for a contemporary, editorial feel.",
    theme: { accent: "#0f766e", accentSoft: "#f0fdfa", ink: "#1c1917", muted: "#57534e", fontHeading: SLAB, fontBody: SANS, headingStyle: "bar", density: "regular" },
  },

  // --- Header band ----------------------------------------------------------
  {
    id: "band-azure",
    name: "Azure Banner",
    category: "resume",
    layout: "header-band",
    tags: ["Bold", "Colorful", "Header band"],
    description: "Full-width azure header band with your name in white — high impact up top.",
    theme: { accent: "#0369a1", accentSoft: "#e0f2fe", ink: "#1f2937", muted: "#64748b", fontHeading: SANS_GEO, fontBody: SANS_GEO, headingStyle: "bar", density: "regular", invertHeader: true },
  },
  {
    id: "band-charcoal",
    name: "Charcoal Banner",
    category: "resume",
    layout: "header-band",
    tags: ["Bold", "Header band", "Minimal"],
    description: "Sleek charcoal header band, monochrome and professional.",
    theme: { accent: "#111827", accentSoft: "#f3f4f6", ink: "#1f2937", muted: "#6b7280", fontHeading: SANS, fontBody: SANS, headingStyle: "caps", density: "regular", invertHeader: true },
  },
  {
    id: "band-violet",
    name: "Violet Banner",
    category: "resume",
    layout: "header-band",
    tags: ["Bold", "Colorful", "Header band"],
    description: "Vibrant violet banner with rounded section headings — creative but readable.",
    theme: { accent: "#6d28d9", accentSoft: "#f5f3ff", ink: "#1f2937", muted: "#6b7280", fontHeading: SANS_GEO, fontBody: SANS_GEO, headingStyle: "bar", density: "regular", invertHeader: true },
  },
  {
    id: "band-teal",
    name: "Teal Banner",
    category: "resume",
    layout: "header-band",
    tags: ["Colorful", "Header band"],
    description: "Calm teal header band with generous spacing for an approachable look.",
    theme: { accent: "#0d9488", accentSoft: "#f0fdfa", ink: "#1f2937", muted: "#6b7280", fontHeading: SANS, fontBody: SANS, headingStyle: "bar", density: "roomy", invertHeader: true },
  },

  // --- Timeline -------------------------------------------------------------
  {
    id: "timeline-indigo",
    name: "Timeline Indigo",
    category: "resume",
    tags: ["Modern", "Timeline"],
    layout: "timeline",
    description: "Experience runs down a vertical rail with markers — easy to scan a career path.",
    theme: { accent: "#4338ca", accentSoft: "#eef2ff", ink: "#1e293b", muted: "#64748b", fontHeading: SANS_GEO, fontBody: SANS_GEO, headingStyle: "bar", density: "regular" },
  },
  {
    id: "timeline-amber",
    name: "Timeline Amber",
    category: "resume",
    tags: ["Timeline", "Colorful"],
    layout: "timeline",
    description: "Warm amber rail and markers — a friendly take on the timeline format.",
    theme: { accent: "#b45309", accentSoft: "#fffbeb", ink: "#1f2937", muted: "#6b7280", fontHeading: SANS, fontBody: SANS, headingStyle: "bar", density: "regular" },
  },
  {
    id: "timeline-slate",
    name: "Timeline Slate",
    category: "both",
    tags: ["Timeline", "Minimal"],
    layout: "timeline",
    description: "Understated grey timeline that keeps the focus on your accomplishments.",
    theme: { accent: "#475569", accentSoft: "#f1f5f9", ink: "#0f172a", muted: "#64748b", fontHeading: SANS, fontBody: SERIF, headingStyle: "plain", density: "regular" },
  },

  // --- Compact / dense ------------------------------------------------------
  {
    id: "compact-onyx",
    name: "Compact Onyx",
    category: "resume",
    tags: ["Compact", "ATS-safe", "One-page"],
    layout: "compact",
    description: "Space-efficient single page for experienced candidates with a lot to say.",
    theme: { accent: "#18181b", accentSoft: "#f4f4f5", ink: "#18181b", muted: "#52525b", fontHeading: SANS, fontBody: SANS, headingStyle: "underline", density: "compact" },
  },
  {
    id: "compact-blue",
    name: "Compact Blue",
    category: "resume",
    tags: ["Compact", "One-page"],
    layout: "compact",
    description: "Dense, tidy layout with blue section rules — fits a deep history on one page.",
    theme: { accent: "#1d4ed8", accentSoft: "#eff6ff", ink: "#1f2937", muted: "#6b7280", fontHeading: SANS_GEO, fontBody: SANS_GEO, headingStyle: "underline", density: "compact" },
  },
  {
    id: "compact-mono",
    name: "Compact Mono",
    category: "resume",
    tags: ["Compact", "Technical", "Monospace"],
    layout: "compact",
    description: "Monospaced accents for engineers — dense, technical, and distinctive.",
    theme: { accent: "#0f766e", accentSoft: "#f0fdfa", ink: "#111827", muted: "#4b5563", fontHeading: MONO, fontBody: SANS, headingStyle: "caps", density: "compact" },
  },

  // --- Two column, sidebar left --------------------------------------------
  {
    id: "sidebar-indigo",
    name: "Sidebar Indigo",
    category: "resume",
    tags: ["Two-column", "Modern", "Colorful"],
    layout: "sidebar-left",
    description: "Tinted left sidebar for contact and skills, roomy main column for experience.",
    theme: { accent: "#4f46e5", accentSoft: "#eef2ff", ink: "#1e293b", muted: "#64748b", fontHeading: SANS_GEO, fontBody: SANS_GEO, headingStyle: "bar", density: "regular" },
  },
  {
    id: "sidebar-forest",
    name: "Sidebar Forest",
    category: "resume",
    tags: ["Two-column", "Colorful"],
    layout: "sidebar-left",
    description: "Deep green sidebar with white text — grounded and professional.",
    theme: { accent: "#166534", accentSoft: "#f0fdf4", ink: "#1f2937", muted: "#6b7280", fontHeading: SANS, fontBody: SANS, headingStyle: "bar", density: "regular", invertHeader: true },
  },
  {
    id: "sidebar-plum",
    name: "Sidebar Plum",
    category: "resume",
    tags: ["Two-column", "Colorful"],
    layout: "sidebar-left",
    description: "Rich plum sidebar with elegant serif headings in the main column.",
    theme: { accent: "#86198f", accentSoft: "#fdf4ff", ink: "#1f2937", muted: "#6b7280", fontHeading: SERIF, fontBody: SANS, headingStyle: "bar", density: "regular", invertHeader: true },
  },
  {
    id: "sidebar-graphite",
    name: "Sidebar Graphite",
    category: "both",
    tags: ["Two-column", "Minimal"],
    layout: "sidebar-left",
    description: "Neutral graphite sidebar — versatile and quietly confident.",
    theme: { accent: "#374151", accentSoft: "#f3f4f6", ink: "#111827", muted: "#6b7280", fontHeading: SANS, fontBody: SANS, headingStyle: "plain", density: "regular", invertHeader: true },
  },
  {
    id: "sidebar-sky",
    name: "Sidebar Sky",
    category: "resume",
    tags: ["Two-column", "Colorful"],
    layout: "sidebar-left",
    description: "Light sky-tinted sidebar — airy and modern without being loud.",
    theme: { accent: "#0284c7", accentSoft: "#e0f2fe", ink: "#1f2937", muted: "#64748b", fontHeading: SANS_GEO, fontBody: SANS_GEO, headingStyle: "bar", density: "regular" },
  },

  // --- Two column, sidebar right -------------------------------------------
  {
    id: "sideright-rose",
    name: "Right Rose",
    category: "resume",
    tags: ["Two-column", "Colorful"],
    layout: "sidebar-right",
    description: "Right-hand rose sidebar keeps your story first and details alongside.",
    theme: { accent: "#be123c", accentSoft: "#fff1f2", ink: "#1f2937", muted: "#6b7280", fontHeading: SANS_GEO, fontBody: SANS_GEO, headingStyle: "bar", density: "regular", invertHeader: true },
  },
  {
    id: "sideright-steel",
    name: "Right Steel",
    category: "resume",
    tags: ["Two-column", "Minimal"],
    layout: "sidebar-right",
    description: "Cool steel-blue right rail with a restrained, corporate feel.",
    theme: { accent: "#334155", accentSoft: "#f1f5f9", ink: "#0f172a", muted: "#64748b", fontHeading: SANS, fontBody: SANS, headingStyle: "bar", density: "regular", invertHeader: true },
  },
  {
    id: "sideright-bronze",
    name: "Right Bronze",
    category: "resume",
    tags: ["Two-column", "Editorial"],
    layout: "sidebar-right",
    description: "Warm bronze rail with serif headings for a premium, editorial touch.",
    theme: { accent: "#92400e", accentSoft: "#fffbeb", ink: "#1c1917", muted: "#57534e", fontHeading: SERIF, fontBody: SERIF, headingStyle: "bar", density: "regular", invertHeader: true },
  },

  // --- Academic / CV --------------------------------------------------------
  {
    id: "academic-classic",
    name: "Academic Classic",
    category: "cv",
    tags: ["CV", "Academic", "Serif"],
    layout: "academic",
    description: "Long-form serif CV with dedicated publications — the academic standard.",
    theme: { accent: "#1f2937", accentSoft: "#f3f4f6", ink: "#111827", muted: "#4b5563", fontHeading: SERIF, fontBody: SERIF, headingStyle: "underline", density: "regular" },
  },
  {
    id: "academic-oxford",
    name: "Oxford CV",
    category: "cv",
    tags: ["CV", "Academic", "Classic"],
    layout: "academic",
    description: "Restrained, scholarly layout with small-caps headings and a deep blue accent.",
    theme: { accent: "#1e3a5f", accentSoft: "#eef2f7", ink: "#1f2937", muted: "#52606d", fontHeading: SERIF, fontBody: SERIF, headingStyle: "caps", density: "roomy" },
  },
  {
    id: "academic-modern",
    name: "Modern CV",
    category: "cv",
    tags: ["CV", "Modern", "Academic"],
    layout: "academic",
    description: "A cleaner, sans-serif take on the academic CV — readable and contemporary.",
    theme: { accent: "#0f766e", accentSoft: "#f0fdfa", ink: "#1f2937", muted: "#64748b", fontHeading: SANS_GEO, fontBody: SANS_GEO, headingStyle: "bar", density: "regular" },
  },
  {
    id: "academic-burgundy",
    name: "Burgundy CV",
    category: "cv",
    tags: ["CV", "Academic", "Editorial"],
    layout: "academic",
    description: "Distinguished burgundy accents with serif type for fellowship applications.",
    theme: { accent: "#7f1d1d", accentSoft: "#fef2f2", ink: "#1c1917", muted: "#57534e", fontHeading: SERIF, fontBody: SERIF, headingStyle: "underline", density: "roomy" },
  },
  {
    id: "academic-sidebar",
    name: "Research Sidebar",
    category: "cv",
    tags: ["CV", "Two-column", "Academic"],
    layout: "sidebar-left",
    description: "A two-column CV with skills and languages in the sidebar, publications in the body.",
    theme: { accent: "#3730a3", accentSoft: "#eef2ff", ink: "#1f2937", muted: "#6b7280", fontHeading: SERIF, fontBody: SANS, headingStyle: "bar", density: "regular", invertHeader: true },
  },
]

export function getTemplate(id: string): ResumeTemplate | undefined {
  return resumeTemplates.find((template) => template.id === id)
}

/** Every distinct tag, for building gallery filters. */
export const templateTags: string[] = Array.from(
  new Set(resumeTemplates.flatMap((template) => template.tags)),
).sort()
