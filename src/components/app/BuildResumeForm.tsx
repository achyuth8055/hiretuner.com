"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/Button"

type ExperienceDraft = {
  jobTitle: string
  company: string
  location: string
  startDate: string
  endDate: string
  currentRole: boolean
  responsibilities: string // newline-separated → bullets[]
}

type ProjectDraft = {
  name: string
  description: string
  technologies: string // comma-separated
  bullets: string // newline-separated
}

type EducationDraft = {
  school: string
  degree: string
  location: string
  graduationDate: string
}

function newExperience(): ExperienceDraft {
  return {
    jobTitle: "",
    company: "",
    location: "",
    startDate: "",
    endDate: "",
    currentRole: false,
    responsibilities: "",
  }
}
function newProject(): ProjectDraft {
  return { name: "", description: "", technologies: "", bullets: "" }
}
function newEducation(): EducationDraft {
  return { school: "", degree: "", location: "", graduationDate: "" }
}

const SKILL_LABELS: Array<[keyof SkillsState, string, string]> = [
  ["programmingLanguages", "Programming languages", "C#, TypeScript, Python, SQL"],
  ["frameworks", "Frameworks & libraries", ".NET, WPF, React, Next.js"],
  ["databases", "Databases", "SQL Server, Postgres, SQLite"],
  ["cloudPlatforms", "Cloud platforms", "Azure, AWS"],
  ["tools", "Tools", "Git, Docker, Jira, Postman"],
  ["businessSkills", "Domain / business", "Healthcare, FinTech, eCommerce"],
  ["softSkills", "Soft skills", "Mentorship, communication, agile"],
]

type SkillsState = {
  programmingLanguages: string
  frameworks: string
  databases: string
  cloudPlatforms: string
  tools: string
  businessSkills: string
  softSkills: string
}

function splitList(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((v) => v.trim())
    .filter(Boolean)
}

function splitBullets(value: string): string[] {
  return value
    .split(/\n+/)
    .map((v) => v.replace(/^[•\-*]\s*/, "").trim())
    .filter(Boolean)
}

export function BuildResumeForm({
  defaultName,
  defaultEmail,
}: {
  defaultName: string
  defaultEmail: string
}) {
  const router = useRouter()

  const [fullName, setFullName] = useState(defaultName)
  const [email, setEmail] = useState(defaultEmail)
  const [phone, setPhone] = useState("")
  const [location, setLocation] = useState("")
  const [linkedIn, setLinkedIn] = useState("")
  const [github, setGithub] = useState("")
  const [portfolio, setPortfolio] = useState("")
  const [summary, setSummary] = useState("")
  const [skills, setSkills] = useState<SkillsState>({
    programmingLanguages: "",
    frameworks: "",
    databases: "",
    cloudPlatforms: "",
    tools: "",
    businessSkills: "",
    softSkills: "",
  })
  const [experiences, setExperiences] = useState<ExperienceDraft[]>([newExperience()])
  const [projects, setProjects] = useState<ProjectDraft[]>([])
  const [education, setEducation] = useState<EducationDraft[]>([newEducation()])
  const [certifications, setCertifications] = useState("")

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setSuccess("")
    setSubmitting(true)

    try {
      const payload = {
        contact: { fullName, email, phone, location, linkedIn, github, portfolio },
        summary,
        skills: Object.fromEntries(
          Object.entries(skills).map(([key, value]) => [key, splitList(value)]),
        ),
        workExperience: experiences.map((entry) => ({
          jobTitle: entry.jobTitle,
          company: entry.company,
          location: entry.location,
          startDate: entry.startDate,
          endDate: entry.currentRole ? "" : entry.endDate,
          currentRole: entry.currentRole,
          bullets: splitBullets(entry.responsibilities),
        })),
        projects: projects.map((entry) => ({
          name: entry.name,
          description: entry.description,
          technologies: splitList(entry.technologies),
          bullets: splitBullets(entry.bullets),
        })),
        education: education.map((entry) => ({
          school: entry.school,
          degree: entry.degree,
          location: entry.location,
          graduationDate: entry.graduationDate,
        })),
        certifications: splitList(certifications).map((name) => ({ name })),
      }

      const response = await fetch("/api/resumes/master/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = (await response.json()) as {
        ok?: boolean
        data?: unknown
        error?: { code?: string; message?: string }
      }
      if (!response.ok || !json.ok) {
        throw new Error(json.error?.message ?? "Couldn't save your resume — please try again.")
      }
      setSuccess("Resume saved. Heading back to the dashboard…")
      setTimeout(() => router.push("/dashboard#your-resume"), 700)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Couldn't save your resume.")
    } finally {
      setSubmitting(false)
    }
  }

  function updateExperience(index: number, patch: Partial<ExperienceDraft>) {
    setExperiences((list) => list.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)))
  }
  function updateProject(index: number, patch: Partial<ProjectDraft>) {
    setProjects((list) => list.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)))
  }
  function updateEducation(index: number, patch: Partial<EducationDraft>) {
    setEducation((list) => list.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)))
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-stack-lg">
      {/* Contact */}
      <Card title="Contact details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Full name *">
            <input className={inputClass} required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </Field>
          <Field label="Email *">
            <input className={inputClass} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Phone">
            <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="Location">
            <input className={inputClass} placeholder="Chicago, IL" value={location} onChange={(e) => setLocation(e.target.value)} />
          </Field>
          <Field label="LinkedIn">
            <input className={inputClass} placeholder="linkedin.com/in/you" value={linkedIn} onChange={(e) => setLinkedIn(e.target.value)} />
          </Field>
          <Field label="GitHub">
            <input className={inputClass} placeholder="github.com/you" value={github} onChange={(e) => setGithub(e.target.value)} />
          </Field>
          <Field label="Portfolio / website" className="md:col-span-2">
            <input className={inputClass} placeholder="https://yourname.dev" value={portfolio} onChange={(e) => setPortfolio(e.target.value)} />
          </Field>
        </div>
      </Card>

      {/* Summary */}
      <Card title="Professional summary" subtitle="A short pitch that sells the rest of the resume. 3-5 lines is ideal.">
        <textarea
          className={`${inputClass} min-h-[120px] resize-y`}
          placeholder=".NET / WPF developer with 4+ years building desktop applications for data-driven environments…"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
      </Card>

      {/* Skills */}
      <Card title="Skills" subtitle="Comma-separated lists. These power keyword matching against job descriptions.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SKILL_LABELS.map(([key, label, placeholder]) => (
            <Field key={key} label={label}>
              <input
                className={inputClass}
                placeholder={placeholder}
                value={skills[key]}
                onChange={(e) => setSkills({ ...skills, [key]: e.target.value })}
              />
            </Field>
          ))}
        </div>
      </Card>

      {/* Work experience */}
      <Card
        title="Work experience"
        subtitle="One entry per role. List responsibilities and accomplishments, one per line."
      >
        <div className="flex flex-col gap-stack-md">
          {experiences.map((entry, index) => (
            <div key={index} className="rounded-lg border border-outline-variant/40 p-stack-md bg-surface">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Job title">
                  <input className={inputClass} placeholder=".NET / WPF Developer" value={entry.jobTitle} onChange={(e) => updateExperience(index, { jobTitle: e.target.value })} />
                </Field>
                <Field label="Company">
                  <input className={inputClass} placeholder="KhatibLaw LLC" value={entry.company} onChange={(e) => updateExperience(index, { company: e.target.value })} />
                </Field>
                <Field label="Location">
                  <input className={inputClass} placeholder="Chicago, IL" value={entry.location} onChange={(e) => updateExperience(index, { location: e.target.value })} />
                </Field>
                <Field label="Start date">
                  <input className={inputClass} placeholder="Jan 2025" value={entry.startDate} onChange={(e) => updateExperience(index, { startDate: e.target.value })} />
                </Field>
                <Field label="End date">
                  <input
                    className={`${inputClass} disabled:opacity-50`}
                    placeholder="Present"
                    value={entry.endDate}
                    onChange={(e) => updateExperience(index, { endDate: e.target.value })}
                    disabled={entry.currentRole}
                  />
                </Field>
                <Field label="Current role">
                  <label className="flex items-center gap-2 text-body-sm">
                    <input
                      type="checkbox"
                      checked={entry.currentRole}
                      onChange={(e) => updateExperience(index, { currentRole: e.target.checked })}
                    />
                    I currently work here
                  </label>
                </Field>
              </div>
              <Field label="Responsibilities & accomplishments" className="mt-3">
                <textarea
                  className={`${inputClass} min-h-[120px] resize-y`}
                  placeholder={"Designed and built a WPF desktop application on a modular, scalable architecture for 500+ users\nImplemented async/await + TPL patterns for real-time data handling\nIntegrated peripheral hardware via vendor SDKs and COM ports"}
                  value={entry.responsibilities}
                  onChange={(e) => updateExperience(index, { responsibilities: e.target.value })}
                />
              </Field>
              {experiences.length > 1 && (
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    className="text-xs text-error hover:underline"
                    onClick={() => setExperiences((list) => list.filter((_, i) => i !== index))}
                  >
                    Remove this role
                  </button>
                </div>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => setExperiences((list) => [...list, newExperience()])}
          >
            + Add another role
          </Button>
        </div>
      </Card>

      {/* Projects */}
      <Card title="Projects (optional)" subtitle="Notable side or featured projects.">
        <div className="flex flex-col gap-stack-md">
          {projects.map((entry, index) => (
            <div key={index} className="rounded-lg border border-outline-variant/40 p-stack-md bg-surface">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Project name">
                  <input className={inputClass} value={entry.name} onChange={(e) => updateProject(index, { name: e.target.value })} />
                </Field>
                <Field label="Technologies (comma-separated)">
                  <input className={inputClass} placeholder="C#, .NET, WPF, MVVM" value={entry.technologies} onChange={(e) => updateProject(index, { technologies: e.target.value })} />
                </Field>
              </div>
              <Field label="Short description" className="mt-3">
                <input className={inputClass} value={entry.description} onChange={(e) => updateProject(index, { description: e.target.value })} />
              </Field>
              <Field label="Highlights (one per line)" className="mt-3">
                <textarea
                  className={`${inputClass} min-h-[90px] resize-y`}
                  value={entry.bullets}
                  onChange={(e) => updateProject(index, { bullets: e.target.value })}
                />
              </Field>
              <div className="mt-2 text-right">
                <button
                  type="button"
                  className="text-xs text-error hover:underline"
                  onClick={() => setProjects((list) => list.filter((_, i) => i !== index))}
                >
                  Remove project
                </button>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => setProjects((list) => [...list, newProject()])}>
            + Add a project
          </Button>
        </div>
      </Card>

      {/* Education */}
      <Card title="Education">
        <div className="flex flex-col gap-stack-md">
          {education.map((entry, index) => (
            <div key={index} className="rounded-lg border border-outline-variant/40 p-stack-md bg-surface grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="School">
                <input className={inputClass} value={entry.school} onChange={(e) => updateEducation(index, { school: e.target.value })} />
              </Field>
              <Field label="Degree">
                <input className={inputClass} placeholder="M.S. Information Systems" value={entry.degree} onChange={(e) => updateEducation(index, { degree: e.target.value })} />
              </Field>
              <Field label="Location">
                <input className={inputClass} value={entry.location} onChange={(e) => updateEducation(index, { location: e.target.value })} />
              </Field>
              <Field label="Graduation">
                <input className={inputClass} placeholder="May 2025" value={entry.graduationDate} onChange={(e) => updateEducation(index, { graduationDate: e.target.value })} />
              </Field>
              {education.length > 1 && (
                <div className="md:col-span-2 text-right">
                  <button
                    type="button"
                    className="text-xs text-error hover:underline"
                    onClick={() => setEducation((list) => list.filter((_, i) => i !== index))}
                  >
                    Remove this entry
                  </button>
                </div>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => setEducation((list) => [...list, newEducation()])}>
            + Add education
          </Button>
        </div>
      </Card>

      {/* Certifications */}
      <Card title="Certifications (optional)" subtitle="Comma-separated. AWS Solutions Architect, PMP, etc.">
        <input
          className={inputClass}
          placeholder="AWS Solutions Architect, Azure Fundamentals, …"
          value={certifications}
          onChange={(e) => setCertifications(e.target.value)}
        />
      </Card>

      {/* Submit */}
      <div className="sticky bottom-4 bg-surface/90 backdrop-blur-md border border-outline-variant/40 rounded-xl p-stack-md flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
        <div className="flex-1">
          {error && <p className="text-body-sm text-error">{error}</p>}
          {success && <p className="text-body-sm text-secondary">{success}</p>}
          {!error && !success && (
            <p className="text-body-sm text-on-surface-variant">
              When you save, this becomes your master resume — you can tailor it to any job description next.
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" type="button">
            <Link href="/dashboard#your-resume">Cancel</Link>
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : "Save resume"}
          </Button>
        </div>
      </div>
    </form>
  )
}

const inputClass =
  "w-full rounded border border-outline-variant/50 bg-background px-3 py-2 text-body-sm outline-none focus:border-secondary"

function Card({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-stack-md shadow-sm">
      <h3 className="font-label-uppercase text-label-uppercase text-primary">{title}</h3>
      {subtitle && <p className="text-body-sm text-on-surface-variant mt-1 mb-3">{subtitle}</p>}
      {!subtitle && <div className="mt-3" />}
      {children}
    </section>
  )
}

function Field({
  label,
  className = "",
  children,
}: {
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-xs text-on-surface-variant font-medium">{label}</span>
      {children}
    </label>
  )
}
