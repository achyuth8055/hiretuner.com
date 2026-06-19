import type { TailoredResumeJson } from "@/lib/rolefit-types"
import type { ResumeData } from "@/lib/resume-templates/types"

/**
 * Convert a `TailoredResumeJson` (the app's internal tailored-resume shape) into
 * the `ResumeData` shape consumed by the template `ResumeDocument` so the same
 * 35 visual templates power both the gallery and the editor live preview.
 */
export function tailoredResumeJsonToResumeData(
  json: TailoredResumeJson,
  fallbackTitle: string,
): ResumeData {
  const skills = json.skills
  const groups: ResumeData["skills"] = []
  const addGroup = (label: string, items: string[]) => {
    if (items.length > 0) groups.push({ label, skills: items })
  }
  addGroup("Languages", skills.programmingLanguages)
  addGroup("Frameworks", skills.frameworks)
  addGroup("Databases", skills.databases)
  addGroup("Cloud", skills.cloudPlatforms)
  addGroup("Tools", skills.tools)
  addGroup("Domain", skills.businessSkills)
  addGroup("Soft skills", skills.softSkills)

  return {
    contact: {
      fullName: json.contact.fullName || "Your Name",
      title: fallbackTitle || "Tailored Resume",
      email: json.contact.email || "",
      phone: json.contact.phone || undefined,
      location: json.contact.location || undefined,
      website: json.contact.portfolio || undefined,
      linkedin: json.contact.linkedIn || undefined,
      github: json.contact.github || undefined,
    },
    summary: json.summary || "",
    experience: json.workExperience.map((entry) => ({
      role: entry.jobTitle || "Role",
      company: entry.company || "Company",
      location: entry.location || undefined,
      start: entry.startDate || "",
      end: entry.currentRole ? "Present" : entry.endDate || "",
      bullets: entry.bullets,
    })),
    education: json.education.map((entry) => ({
      degree: entry.degree || "",
      school: entry.school || "",
      location: entry.location || undefined,
      end: entry.graduationDate || "",
    })),
    skills: groups,
    projects: json.projects.map((entry) => ({
      name: entry.name || "Project",
      description: entry.description || "",
      tech: entry.technologies,
    })),
    certifications: json.certifications.map((cert) => cert.name).filter(Boolean),
  }
}
