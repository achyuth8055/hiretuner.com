import type { CSSProperties } from "react"
import type {
  ResumeData,
  ResumeTemplate,
  TemplateTheme,
  Density,
  ContactInfo,
} from "@/lib/resume-templates/types"

/**
 * Renders a {@link ResumeData} record into a fixed-size A4 "page" styled purely
 * from the template's layout + theme. Everything is inline-styled and light-mode
 * so the same markup is used for gallery thumbnails, the on-page preview, and
 * (later) PDF export — unaffected by the surrounding site theme.
 */

// A4 at ~96dpi. Thumbnails just CSS-scale this fixed canvas.
const PAGE_WIDTH = 794
const PAGE_MIN_HEIGHT = 1123

type Scale = { fontBase: number; gap: number; sectionGap: number; line: number }

const DENSITY: Record<Density, Scale> = {
  compact: { fontBase: 10.5, gap: 4, sectionGap: 12, line: 1.32 },
  regular: { fontBase: 11.5, gap: 6, sectionGap: 18, line: 1.42 },
  roomy: { fontBase: 12, gap: 8, sectionGap: 24, line: 1.5 },
}

function headingStyle(theme: TemplateTheme, scale: Scale, onAccent = false): CSSProperties {
  const base: CSSProperties = {
    fontFamily: theme.fontHeading,
    fontSize: scale.fontBase + 2.5,
    fontWeight: 700,
    color: onAccent ? "#ffffff" : theme.accent,
    margin: 0,
    marginBottom: scale.gap,
  }
  switch (theme.headingStyle) {
    case "underline":
      return { ...base, borderBottom: `2px solid ${onAccent ? "#ffffff" : theme.accent}`, paddingBottom: 3 }
    case "bar":
      return { ...base, borderLeft: `4px solid ${onAccent ? "#ffffff" : theme.accent}`, paddingLeft: 8 }
    case "caps":
      return { ...base, textTransform: "uppercase", letterSpacing: 1.5, fontSize: scale.fontBase + 1 }
    case "plain":
    default:
      return base
  }
}

function SectionHeading({ children, theme, scale, onAccent }: { children: string; theme: TemplateTheme; scale: Scale; onAccent?: boolean }) {
  return <h2 style={headingStyle(theme, scale, onAccent)}>{children}</h2>
}

function contactLine(contact: ContactInfo): string[] {
  return [contact.email, contact.phone, contact.location, contact.website, contact.linkedin, contact.github].filter(
    (value): value is string => Boolean(value),
  )
}

function ExperienceBlock({ data, theme, scale, timeline = false }: { data: ResumeData; theme: TemplateTheme; scale: Scale; timeline?: boolean }) {
  return (
    <div>
      <SectionHeading theme={theme} scale={scale}>Experience</SectionHeading>
      <div style={{ display: "flex", flexDirection: "column", gap: scale.gap * 2 }}>
        {data.experience.map((job, index) => (
          <div
            key={`${job.company}-${index}`}
            style={timeline ? { position: "relative", paddingLeft: 18, borderLeft: `2px solid ${theme.accentSoft}` } : undefined}
          >
            {timeline && (
              <span style={{ position: "absolute", left: -6, top: 3, width: 10, height: 10, borderRadius: 99, background: theme.accent }} />
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontWeight: 700, color: theme.ink }}>{job.role}</span>
              <span style={{ color: theme.muted, fontSize: scale.fontBase - 0.5, whiteSpace: "nowrap" }}>{job.start} – {job.end}</span>
            </div>
            <div style={{ color: theme.accent, fontWeight: 600, marginBottom: scale.gap / 2 }}>
              {job.company}{job.location ? `, ${job.location}` : ""}
            </div>
            <ul style={{ margin: 0, paddingLeft: 16, color: theme.ink, display: "flex", flexDirection: "column", gap: scale.gap / 2 }}>
              {job.bullets.map((bullet, bulletIndex) => (
                <li key={bulletIndex}>{bullet}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

function EducationBlock({ data, theme, scale }: { data: ResumeData; theme: TemplateTheme; scale: Scale }) {
  return (
    <div>
      <SectionHeading theme={theme} scale={scale}>Education</SectionHeading>
      <div style={{ display: "flex", flexDirection: "column", gap: scale.gap }}>
        {data.education.map((edu, index) => (
          <div key={index}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontWeight: 700, color: theme.ink }}>{edu.degree}</span>
              <span style={{ color: theme.muted, fontSize: scale.fontBase - 0.5, whiteSpace: "nowrap" }}>{edu.start ? `${edu.start} – ` : ""}{edu.end}</span>
            </div>
            <div style={{ color: theme.accent, fontWeight: 600 }}>{edu.school}{edu.location ? `, ${edu.location}` : ""}</div>
            {edu.details && <div style={{ color: theme.muted }}>{edu.details}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

function ProjectsBlock({ data, theme, scale }: { data: ResumeData; theme: TemplateTheme; scale: Scale }) {
  if (!data.projects?.length) return null
  return (
    <div>
      <SectionHeading theme={theme} scale={scale}>Projects</SectionHeading>
      <div style={{ display: "flex", flexDirection: "column", gap: scale.gap }}>
        {data.projects.map((project, index) => (
          <div key={index}>
            <span style={{ fontWeight: 700, color: theme.ink }}>{project.name}</span>
            {project.tech?.length ? <span style={{ color: theme.muted }}> · {project.tech.join(", ")}</span> : null}
            <div style={{ color: theme.ink }}>{project.description}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PublicationsBlock({ data, theme, scale }: { data: ResumeData; theme: TemplateTheme; scale: Scale }) {
  if (!data.publications?.length) return null
  return (
    <div>
      <SectionHeading theme={theme} scale={scale}>Publications</SectionHeading>
      <ol style={{ margin: 0, paddingLeft: 16, color: theme.ink, display: "flex", flexDirection: "column", gap: scale.gap }}>
        {data.publications.map((pub, index) => (
          <li key={index}>
            {pub.authors ? `${pub.authors} ` : ""}
            <span style={{ fontStyle: "italic" }}>{pub.title}</span>. {pub.venue}, {pub.year}.
          </li>
        ))}
      </ol>
    </div>
  )
}

function SkillsBlock({ data, theme, scale, columns = 1 }: { data: ResumeData; theme: TemplateTheme; scale: Scale; columns?: number }) {
  return (
    <div>
      <SectionHeading theme={theme} scale={scale}>Skills</SectionHeading>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: scale.gap, columnGap: scale.gap * 3 }}>
        {data.skills.map((group, index) => (
          <div key={index}>
            <span style={{ fontWeight: 700, color: theme.ink }}>{group.label}: </span>
            <span style={{ color: theme.muted }}>{group.skills.join(", ")}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SummaryBlock({ data, theme, scale }: { data: ResumeData; theme: TemplateTheme; scale: Scale }) {
  if (!data.summary) return null
  return (
    <div>
      <SectionHeading theme={theme} scale={scale}>Summary</SectionHeading>
      <p style={{ margin: 0, color: theme.ink }}>{data.summary}</p>
    </div>
  )
}

function ListBlock({ title, items, theme, scale }: { title: string; items?: string[]; theme: TemplateTheme; scale: Scale }) {
  if (!items?.length) return null
  return (
    <div>
      <SectionHeading theme={theme} scale={scale}>{title}</SectionHeading>
      <ul style={{ margin: 0, paddingLeft: 16, color: theme.ink, display: "flex", flexDirection: "column", gap: scale.gap / 2 }}>
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

function Header({ data, theme, scale, align, onBand }: { data: ResumeData; theme: TemplateTheme; scale: Scale; align: "center" | "left"; onBand?: boolean }) {
  const color = onBand && theme.invertHeader ? "#ffffff" : theme.ink
  const sub = onBand && theme.invertHeader ? "rgba(255,255,255,0.85)" : theme.muted
  return (
    <div style={{ textAlign: align }}>
      <div style={{ fontFamily: theme.fontHeading, fontSize: scale.fontBase + 12, fontWeight: 800, color, letterSpacing: 0.3 }}>
        {data.contact.fullName}
      </div>
      <div style={{ fontSize: scale.fontBase + 1, color: onBand && theme.invertHeader ? "rgba(255,255,255,0.9)" : theme.accent, fontWeight: 600, marginTop: 2 }}>
        {data.contact.title}
      </div>
      <div style={{ fontSize: scale.fontBase - 0.5, color: sub, marginTop: scale.gap, display: "flex", flexWrap: "wrap", gap: "2px 10px", justifyContent: align === "center" ? "center" : "flex-start" }}>
        {contactLine(data.contact).map((piece, index) => (
          <span key={index}>{piece}</span>
        ))}
      </div>
    </div>
  )
}

export function ResumeDocument({ template, data }: { template: ResumeTemplate; data: ResumeData }) {
  const { theme } = template
  const scale = DENSITY[theme.density]

  const page: CSSProperties = {
    width: PAGE_WIDTH,
    minHeight: PAGE_MIN_HEIGHT,
    background: "#ffffff",
    color: theme.ink,
    fontFamily: theme.fontBody,
    fontSize: scale.fontBase,
    lineHeight: scale.line,
    boxSizing: "border-box",
    overflow: "hidden",
  }

  // ---- Two-column layouts -------------------------------------------------
  if (template.layout === "sidebar-left" || template.layout === "sidebar-right") {
    const invert = Boolean(theme.invertHeader)
    const sidebar = (
      <aside
        style={{
          width: 250,
          flexShrink: 0,
          background: invert ? theme.accent : theme.accentSoft,
          color: invert ? "#ffffff" : theme.ink,
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: scale.sectionGap,
        }}
      >
        <div>
          <div style={{ fontFamily: theme.fontHeading, fontSize: scale.fontBase + 9, fontWeight: 800, color: invert ? "#ffffff" : theme.accent, lineHeight: 1.15 }}>
            {data.contact.fullName}
          </div>
          <div style={{ fontSize: scale.fontBase, color: invert ? "rgba(255,255,255,0.85)" : theme.muted, marginTop: 3 }}>{data.contact.title}</div>
        </div>
        <div>
          <SectionHeading theme={theme} scale={scale} onAccent={invert}>Contact</SectionHeading>
          <div style={{ display: "flex", flexDirection: "column", gap: scale.gap / 2, color: invert ? "rgba(255,255,255,0.92)" : theme.ink, wordBreak: "break-word" }}>
            {contactLine(data.contact).map((piece, index) => (
              <span key={index}>{piece}</span>
            ))}
          </div>
        </div>
        <SidebarSection title="Skills" theme={theme} scale={scale} invert={invert}>
          {data.skills.map((group, index) => (
            <div key={index} style={{ marginBottom: scale.gap }}>
              <div style={{ fontWeight: 700 }}>{group.label}</div>
              <div style={{ color: invert ? "rgba(255,255,255,0.85)" : theme.muted }}>{group.skills.join(", ")}</div>
            </div>
          ))}
        </SidebarSection>
        {data.languages?.length ? (
          <SidebarSection title="Languages" theme={theme} scale={scale} invert={invert}>
            {data.languages.map((lang, index) => <div key={index}>{lang}</div>)}
          </SidebarSection>
        ) : null}
        {data.certifications?.length ? (
          <SidebarSection title="Certifications" theme={theme} scale={scale} invert={invert}>
            {data.certifications.map((cert, index) => <div key={index} style={{ marginBottom: scale.gap / 2 }}>{cert}</div>)}
          </SidebarSection>
        ) : null}
        {data.awards?.length ? (
          <SidebarSection title="Awards" theme={theme} scale={scale} invert={invert}>
            {data.awards.map((award, index) => <div key={index} style={{ marginBottom: scale.gap / 2 }}>{award}</div>)}
          </SidebarSection>
        ) : null}
      </aside>
    )

    const main = (
      <main style={{ flex: 1, padding: 28, display: "flex", flexDirection: "column", gap: scale.sectionGap }}>
        <SummaryBlock data={data} theme={theme} scale={scale} />
        <ExperienceBlock data={data} theme={theme} scale={scale} />
        <EducationBlock data={data} theme={theme} scale={scale} />
        <PublicationsBlock data={data} theme={theme} scale={scale} />
        <ProjectsBlock data={data} theme={theme} scale={scale} />
      </main>
    )

    return (
      <div style={{ ...page, display: "flex", flexDirection: "row" }}>
        {template.layout === "sidebar-left" ? <>{sidebar}{main}</> : <>{main}{sidebar}</>}
      </div>
    )
  }

  // ---- Single-column layouts ---------------------------------------------
  const isBand = template.layout === "header-band"
  const isAcademic = template.layout === "academic"
  const isTimeline = template.layout === "timeline"
  const isCompact = template.layout === "compact"
  const headerAlign = template.layout === "classic" ? "center" : "left"

  return (
    <div style={page}>
      {isBand ? (
        <div style={{ background: theme.accent, padding: "28px 36px" }}>
          <Header data={data} theme={theme} scale={scale} align="left" onBand />
        </div>
      ) : (
        <div style={{ padding: "32px 36px 0" }}>
          <Header data={data} theme={theme} scale={scale} align={headerAlign} />
          <div style={{ height: 2, background: theme.accentSoft, marginTop: scale.gap * 2 }} />
        </div>
      )}

      <div style={{ padding: isBand ? "24px 36px 36px" : "20px 36px 36px", display: "flex", flexDirection: "column", gap: scale.sectionGap }}>
        <SummaryBlock data={data} theme={theme} scale={scale} />
        <ExperienceBlock data={data} theme={theme} scale={scale} timeline={isTimeline} />
        <EducationBlock data={data} theme={theme} scale={scale} />
        {isAcademic && <PublicationsBlock data={data} theme={theme} scale={scale} />}
        <SkillsBlock data={data} theme={theme} scale={scale} columns={isCompact ? 2 : 1} />
        {!isAcademic && <ProjectsBlock data={data} theme={theme} scale={scale} />}
        {isAcademic && <PublicationsBlock data={data} theme={theme} scale={scale} />}
        <ListBlock title="Certifications" items={data.certifications} theme={theme} scale={scale} />
        {isAcademic && <ListBlock title="Awards & Honors" items={data.awards} theme={theme} scale={scale} />}
        {data.languages?.length ? (
          <div>
            <SectionHeading theme={theme} scale={scale}>Languages</SectionHeading>
            <span style={{ color: theme.muted }}>{data.languages.join(" · ")}</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function SidebarSection({ title, theme, scale, invert, children }: { title: string; theme: TemplateTheme; scale: Scale; invert: boolean; children: React.ReactNode }) {
  return (
    <div>
      <SectionHeading theme={theme} scale={scale} onAccent={invert}>{title}</SectionHeading>
      <div>{children}</div>
    </div>
  )
}
