/**
 * Canonical resume/CV data model + template descriptors.
 *
 * One data shape (`ResumeData`) feeds every template, so a user fills in their
 * details once and can switch between any of the 30+ designs instantly. All
 * templates are original layouts built from standard resume conventions — no
 * third-party template assets are bundled, so there are no licensing strings.
 */

export type ContactInfo = {
  fullName: string
  /** Headline / target role, e.g. "Senior Backend Engineer". */
  title: string
  email: string
  phone?: string
  location?: string
  website?: string
  linkedin?: string
  github?: string
}

export type ExperienceItem = {
  role: string
  company: string
  location?: string
  start: string
  end: string
  bullets: string[]
}

export type EducationItem = {
  degree: string
  school: string
  location?: string
  start?: string
  end: string
  details?: string
}

export type SkillGroup = {
  label: string
  skills: string[]
}

export type ProjectItem = {
  name: string
  description: string
  tech?: string[]
}

export type PublicationItem = {
  title: string
  venue: string
  year: string
  authors?: string
}

export type ResumeData = {
  contact: ContactInfo
  summary: string
  experience: ExperienceItem[]
  education: EducationItem[]
  skills: SkillGroup[]
  projects?: ProjectItem[]
  publications?: PublicationItem[]
  certifications?: string[]
  languages?: string[]
  awards?: string[]
}

/** Whether a template is meant for a one-page resume, a long-form CV, or both. */
export type TemplateCategory = "resume" | "cv" | "both"

/**
 * Structural skeleton. Everything else (color, type, heading treatment) is a
 * theme token, which is how a handful of skeletons yield 30+ distinct designs.
 */
export type LayoutId =
  | "classic" // single column, centered header
  | "modern" // single column, left header with accent rule
  | "header-band" // full-width colored header band
  | "timeline" // single column with a timeline rail
  | "compact" // dense single column, multi-column skills
  | "academic" // CV-oriented single column with publications
  | "sidebar-left" // two column, contact/skills on the left
  | "sidebar-right" // two column, contact/skills on the right

export type HeadingStyle = "underline" | "bar" | "caps" | "plain"
export type Density = "compact" | "regular" | "roomy"

export type TemplateTheme = {
  /** Primary accent (hex). Used for rules, headings, sidebar fills. */
  accent: string
  /** Soft tint of the accent for sidebar/band backgrounds (hex). */
  accentSoft: string
  /** Body text color (hex). */
  ink: string
  /** Muted/secondary text color (hex). */
  muted: string
  fontHeading: string
  fontBody: string
  headingStyle: HeadingStyle
  density: Density
  /** When true, the colored band/sidebar uses white text on the accent. */
  invertHeader?: boolean
}

export type ResumeTemplate = {
  id: string
  name: string
  category: TemplateCategory
  layout: LayoutId
  theme: TemplateTheme
  /** Short, human filter tags, e.g. "Modern", "ATS-safe", "Two-column". */
  tags: string[]
  description: string
}
