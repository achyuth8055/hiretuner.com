import "server-only"

import { logger } from "@/lib/logger"
import { buildMinimalPdf } from "@/lib/resume-engine"
import type { ResumeTemplateId, TailoredResume } from "@/lib/rolefit-types"

/**
 * Template-driven PDF rendering.
 *
 * Uses `@react-pdf/renderer` if installed (multi-page output, proper Unicode,
 * styled per-template layout). Falls back to the legacy `buildMinimalPdf`
 * (single-page Helvetica, 70-line truncation) when the package is missing —
 * so the website builds and serves before `npm install @react-pdf/renderer`
 * runs on the deploy host.
 *
 * The "templates" here are intentionally minimal: a clean Classic layout and
 * an alternate Modern layout. Adding more templates is just a new branch in
 * `renderTemplate`. We deliberately do NOT depend on the React-PDF *core*
 * package being typed — we use it as data + functions in a dynamic-import
 * block.
 */

type RenderableResume = TailoredResume["resumeJson"]
type TemplateId = ResumeTemplateId

const DEFAULT_TEMPLATE: TemplateId = "classic"

export async function renderTailoredResumePdf(
  resume: TailoredResume,
): Promise<Buffer> {
  const templateId = (resume.chosenTemplateId ?? DEFAULT_TEMPLATE) as TemplateId

  try {
    // Defeat TS/bundler static resolution — optional npm dep.
    const rendererModule = "@react-pdf/renderer"
    const reactModule = "react"
    const renderer = (await import(/* webpackIgnore: true */ rendererModule)) as {
      Document: unknown
      Page: unknown
      Text: unknown
      View: unknown
      StyleSheet: { create: (input: Record<string, Record<string, unknown>>) => Record<string, unknown> }
      renderToBuffer: (element: unknown) => Promise<Buffer>
    }
    const react = (await import(/* webpackIgnore: true */ reactModule)) as {
      createElement: (
        type: unknown,
        props: Record<string, unknown> | null,
        ...children: unknown[]
      ) => unknown
    }
    const tree = buildTemplateTree(renderer, react, templateId, resume.resumeJson)
    return await renderer.renderToBuffer(tree)
  } catch (error) {
    // Either the package isn't installed (expected before `npm install`) or
    // rendering threw. Fall back to the legacy single-page Helvetica path so
    // the user still gets a downloadable PDF, just less polished.
    logger.warn("lib.pdf-renderer", "Falling back to legacy buildMinimalPdf", {
      templateId,
      reason: error instanceof Error ? error.message : String(error),
    })
    return buildMinimalPdf(resume.resumeText)
  }
}

type RendererMod = {
  Document: unknown
  Page: unknown
  Text: unknown
  View: unknown
  StyleSheet: { create: (input: Record<string, Record<string, unknown>>) => Record<string, unknown> }
}
type ReactMod = {
  createElement: (
    type: unknown,
    props: Record<string, unknown> | null,
    ...children: unknown[]
  ) => unknown
}

function buildTemplateTree(
  renderer: RendererMod,
  react: ReactMod,
  templateId: TemplateId,
  resume: RenderableResume,
): unknown {
  const styles = stylesForTemplate(renderer.StyleSheet, templateId)
  const h = react.createElement

  const sectionHeader = (label: string) =>
    h(renderer.Text, { style: styles.sectionHeader }, label)

  const skillsLines = Object.entries(resume.skills)
    .filter(([, skills]) => skills.length > 0)
    .map(
      ([category, skills]) =>
        `${labelizeCategory(category)}: ${skills.join(", ")}`,
    )

  const contactLine = [
    resume.contact.location,
    resume.contact.phone,
    resume.contact.email,
    resume.contact.linkedIn,
  ]
    .filter(Boolean)
    .join("  •  ")

  const pageChildren: unknown[] = []

  // Header — name + contact line
  pageChildren.push(
    h(renderer.View, { style: styles.headerBlock },
      h(renderer.Text, { style: styles.name }, resume.contact.fullName || "Candidate"),
      contactLine ? h(renderer.Text, { style: styles.contact }, contactLine) : null,
    ),
  )

  // Summary
  if (resume.summary) {
    pageChildren.push(
      h(renderer.View, { style: styles.section, wrap: false },
        sectionHeader("Summary"),
        h(renderer.Text, { style: styles.paragraph }, resume.summary),
      ),
    )
  }

  // Skills
  if (skillsLines.length > 0) {
    pageChildren.push(
      h(renderer.View, { style: styles.section, wrap: false },
        sectionHeader("Skills"),
        ...skillsLines.map((line) => h(renderer.Text, { style: styles.skillLine }, line)),
      ),
    )
  }

  // Experience
  if (resume.workExperience.length > 0) {
    const experienceChildren: unknown[] = [sectionHeader("Experience")]
    for (const job of resume.workExperience) {
      const titleParts = [job.jobTitle, job.company].filter(Boolean).join(" — ")
      const dateLine = [job.startDate, job.endDate || (job.currentRole ? "Present" : "")]
        .filter(Boolean)
        .join(" – ")
      experienceChildren.push(
        h(renderer.View, { style: styles.experienceItem, wrap: false },
          h(renderer.Text, { style: styles.jobHeader }, titleParts || "Role"),
          dateLine ? h(renderer.Text, { style: styles.jobDate }, dateLine) : null,
          ...(job.bullets ?? []).map((bullet) =>
            h(renderer.Text, { style: styles.bullet }, `• ${bullet}`),
          ),
        ),
      )
    }
    pageChildren.push(h(renderer.View, { style: styles.section }, ...experienceChildren))
  }

  // Projects
  if (resume.projects.length > 0) {
    const projectChildren: unknown[] = [sectionHeader("Projects")]
    for (const project of resume.projects) {
      projectChildren.push(
        h(renderer.View, { style: styles.experienceItem, wrap: false },
          h(renderer.Text, { style: styles.jobHeader }, project.name),
          project.description
            ? h(renderer.Text, { style: styles.paragraph }, project.description)
            : null,
          ...(project.bullets ?? []).map((bullet) =>
            h(renderer.Text, { style: styles.bullet }, `• ${bullet}`),
          ),
        ),
      )
    }
    pageChildren.push(h(renderer.View, { style: styles.section }, ...projectChildren))
  }

  // Education
  if (resume.education.length > 0) {
    const eduChildren: unknown[] = [sectionHeader("Education")]
    for (const edu of resume.education) {
      eduChildren.push(
        h(renderer.View, { style: styles.experienceItem, wrap: false },
          h(renderer.Text, { style: styles.jobHeader }, edu.school),
          edu.degree ? h(renderer.Text, { style: styles.paragraph }, edu.degree) : null,
          edu.graduationDate
            ? h(renderer.Text, { style: styles.jobDate }, edu.graduationDate)
            : null,
        ),
      )
    }
    pageChildren.push(h(renderer.View, { style: styles.section }, ...eduChildren))
  }

  // Certifications
  if (resume.certifications.length > 0) {
    pageChildren.push(
      h(renderer.View, { style: styles.section, wrap: false },
        sectionHeader("Certifications"),
        ...resume.certifications.map((cert) =>
          h(renderer.Text, { style: styles.bullet }, `• ${cert.name}${cert.date ? ` (${cert.date})` : ""}`),
        ),
      ),
    )
  }

  return h(renderer.Document, null,
    h(renderer.Page, { size: "LETTER", style: styles.page },
      ...pageChildren,
    ),
  )
}

function labelizeCategory(category: string): string {
  return category
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase())
}

function stylesForTemplate(
  styleSheet: RendererMod["StyleSheet"],
  templateId: TemplateId,
): Record<string, unknown> {
  // Three light variations — same shape, different visual choices.
  const palettes = {
    classic: {
      accent: "#111111",
      headerSize: 22,
      sectionHeaderSize: 11,
      sectionHeaderColor: "#444444",
      bodySize: 10,
      pageBg: "#FFFFFF",
    },
    modern: {
      accent: "#1E3A8A",
      headerSize: 24,
      sectionHeaderSize: 12,
      sectionHeaderColor: "#1E3A8A",
      bodySize: 10,
      pageBg: "#FFFFFF",
    },
    compact: {
      accent: "#111111",
      headerSize: 20,
      sectionHeaderSize: 10,
      sectionHeaderColor: "#666666",
      bodySize: 9.5,
      pageBg: "#FFFFFF",
    },
  } as const
  const p = palettes[templateId] ?? palettes.classic

  return styleSheet.create({
    page: {
      paddingTop: 36,
      paddingBottom: 36,
      paddingHorizontal: 40,
      fontSize: p.bodySize,
      backgroundColor: p.pageBg,
      color: "#111111",
      fontFamily: "Helvetica",
    },
    headerBlock: {
      marginBottom: 14,
      borderBottom: `1pt solid ${p.accent}`,
      paddingBottom: 8,
    },
    name: {
      fontSize: p.headerSize,
      color: p.accent,
      marginBottom: 4,
    },
    contact: {
      fontSize: 9,
      color: "#444444",
    },
    section: {
      marginBottom: 12,
    },
    sectionHeader: {
      fontSize: p.sectionHeaderSize,
      color: p.sectionHeaderColor,
      letterSpacing: 1.2,
      textTransform: "uppercase",
      marginBottom: 6,
    },
    paragraph: {
      lineHeight: 1.4,
      marginBottom: 4,
    },
    skillLine: {
      marginBottom: 2,
    },
    experienceItem: {
      marginBottom: 10,
    },
    jobHeader: {
      fontSize: p.bodySize + 1,
      fontWeight: 700,
      marginBottom: 2,
    },
    jobDate: {
      fontSize: 9,
      color: "#666666",
      marginBottom: 4,
    },
    bullet: {
      marginLeft: 12,
      marginBottom: 2,
    },
  })
}
