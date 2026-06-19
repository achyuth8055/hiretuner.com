export type PlanType = "free" | "starter" | "plus" | "pro"
export type BillingInterval = "monthly" | "yearly"
export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "free"

export type ApplicationStatus = "Saved" | "Applied" | "Interview" | "Rejected" | "Offer"

export type KeywordStatus =
  | "found_and_used"
  | "found_but_weak"
  | "missing"
  | "needs_confirmation"
  | "not_recommended"

export type ChangeLabel =
  | "found_and_used"
  | "reworded_from_existing"
  | "needs_confirmation"
  | "not_added_no_proof"

export type AuthProvider = "email" | "google"

export type User = {
  id: string
  name: string
  email: string
  passwordHash: string
  authProvider: AuthProvider
  // ISO timestamp set when the user clicked the verification link or signed
  // in via a provider (Google) that verified the address. Null/undefined =
  // not verified yet. Legacy users (pre-feature) are treated as verified.
  emailVerifiedAt?: string | null
  createdAt: string
  updatedAt: string
}

// Single-use email verification token. Hash-only stored at rest.
export type EmailVerificationToken = {
  id: string
  userId: string
  email: string
  tokenHash: string
  expiresAt: string
  usedAt: string | null
  createdAt: string
}

export type Subscription = {
  id: string
  userId: string
  planType: PlanType
  status: SubscriptionStatus
  billingInterval: BillingInterval | null
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  createdAt: string
  updatedAt: string
}

export type Usage = {
  id: string
  userId: string
  month: string
  jdScansUsed: number
  tailoredResumesUsed: number
  pdfDownloadsUsed: number
  atsChecksUsed: number
  resumeMatchChecksUsed: number
  salaryEstimatesUsed: number
  publicToolUsageUsed: number
  createdAt: string
  updatedAt: string
}

export type ContactInfo = {
  fullName: string
  email: string
  phone: string
  location: string
  linkedIn: string
  github: string
  portfolio: string
}

export type ExperienceItem = {
  id: string
  jobTitle: string
  company: string
  location: string
  startDate: string
  endDate: string
  currentRole: boolean
  bullets: string[]
}

export type ProjectItem = {
  id: string
  name: string
  description: string
  technologies: string[]
  bullets: string[]
}

export type EducationItem = {
  id: string
  school: string
  degree: string
  location: string
  graduationDate: string
}

export type CertificationItem = {
  id: string
  name: string
  issuer: string
  date: string
}

export type StructuredResumeProfile = {
  contact: ContactInfo
  summary: string
  skills: {
    programmingLanguages: string[]
    frameworks: string[]
    databases: string[]
    cloudPlatforms: string[]
    tools: string[]
    businessSkills: string[]
    softSkills: string[]
  }
  workExperience: ExperienceItem[]
  projects: ProjectItem[]
  education: EducationItem[]
  certifications: CertificationItem[]
  links: string[]
}

export type MasterResume = {
  id: string
  userId: string
  originalFileUrl: string | null
  originalFileName: string | null
  parsedText: string
  structuredProfile: StructuredResumeProfile
  active: boolean
  createdAt: string
  updatedAt: string
}

export type JobDescriptionAnalysis = {
  jobTitle: string
  companyName: string
  roleCategory: string
  experienceLevel: string
  requiredSkills: string[]
  preferredSkills: string[]
  responsibilities: string[]
  toolsAndTechnologies: string[]
  softSkills: string[]
  importantKeywords: string[]
  seniorityIndicators: string[]
  workMode: string
  location: string
  salaryMentioned: string
}

export type ScoreBreakdown = {
  requiredSkillsMatch: number
  preferredSkillsMatch: number
  responsibilityMatch: number
  jobTitleRelevance: number
  experienceRelevance: number
  keywordCoverage: number
  formattingCompleteness: number
  sectionCompleteness: number
}

export type ResumeMatchScore = {
  label: "Estimated resume match score"
  originalScore: number
  tailoredScore?: number
  scoreImprovement?: number
  breakdown: ScoreBreakdown
  disclaimer: string
}

export type KeywordCoverageItem = {
  keyword: string
  status: KeywordStatus
  reason: string
  source: "required" | "preferred" | "responsibility" | "tool" | "soft_skill"
  confirmed: boolean
}

export type ChangeLogItem = {
  id: string
  label: ChangeLabel
  section: string
  keyword?: string
  before?: string
  after?: string
  reason: string
}

export type TailoredResumeJson = {
  contact: ContactInfo
  summary: string
  skills: StructuredResumeProfile["skills"]
  workExperience: ExperienceItem[]
  projects: ProjectItem[]
  education: EducationItem[]
  certifications: CertificationItem[]
  keywordCoverage: KeywordCoverageItem[]
  unsupportedKeywords: string[]
  changeLog: ChangeLogItem[]
  scoreExplanation: string
  warnings: string[]
}

export type JobDescription = {
  id: string
  userId: string
  companyName: string
  jobTitle: string
  jobUrl: string
  rawText: string
  analysis: JobDescriptionAnalysis
  createdAt: string
}

// Template the user picked in the editor when this tailored resume was
// generated. Persisted so the download path renders the same template the
// preview showed. New resumes default to "classic"; legacy rows without the
// field are also treated as "classic".
export type ResumeTemplateId = "classic" | "modern" | "compact"

export type TailoredResume = {
  id: string
  userId: string
  masterResumeId: string
  jobDescriptionId: string
  resumeJson: TailoredResumeJson
  resumeText: string
  originalScore: number
  tailoredScore: number
  scoreBreakdown: ScoreBreakdown
  keywordCoverage: KeywordCoverageItem[]
  changeLog: ChangeLogItem[]
  versionNumber: number
  pdfUrl: string | null
  chosenTemplateId?: ResumeTemplateId
  createdAt: string
  updatedAt: string
}

export type Application = {
  id: string
  userId: string
  tailoredResumeId: string
  companyName: string
  jobTitle: string
  jobUrl: string
  status: ApplicationStatus
  notes: string
  dateApplied: string | null
  createdAt: string
  updatedAt: string
}

export type PublicToolResult = {
  id: string
  userId: string | null
  toolType: string
  inputHash: string
  inputJson: Record<string, unknown>
  resultJson: Record<string, unknown>
  createdAt: string
}

export type SalaryEstimate = {
  id: string
  userId: string | null
  role: string
  yearsExperience: string
  location: string
  skills: string[]
  workMode: string
  industry: string
  resultJson: Record<string, unknown>
  createdAt: string
}

export type Session = {
  id: string
  userId: string
  expiresAt: string
  createdAt: string
}

export type PasswordResetToken = {
  id: string
  userId: string
  tokenHash: string
  expiresAt: string
  usedAt: string | null
  createdAt: string
}

export type ProcessedStripeEvent = {
  id: string
  type: string
  processedAt: string
}

export type RoleFitDatabase = {
  users: User[]
  subscriptions: Subscription[]
  usages: Usage[]
  masterResumes: MasterResume[]
  jobDescriptions: JobDescription[]
  tailoredResumes: TailoredResume[]
  applications: Application[]
  publicToolResults: PublicToolResult[]
  salaryEstimates: SalaryEstimate[]
  sessions: Session[]
  passwordResetTokens: PasswordResetToken[]
  processedStripeEvents?: ProcessedStripeEvent[]
  emailVerificationTokens?: EmailVerificationToken[]
}

// Sentinel for "effectively unlimited" count-based limits on the Pro plan.
// Large enough that no real user reaches it; pdfDownloads uses null (no cap).
export const UNLIMITED = 1_000_000

export const PLAN_LIMITS: Record<
  PlanType,
  {
    masterResumes: number
    jdScans: number
    tailoredResumes: number
    pdfDownloads: number | null
    atsChecks: number
    resumeMatchChecks: number
    salaryEstimates: number
    publicToolUsage: number
    fullKeywordGap: boolean
    fullScoreBreakdown: boolean
    versionHistoryDays: number
  }
> = {
  free: {
    masterResumes: 1,
    jdScans: 2,
    tailoredResumes: 1,
    pdfDownloads: 0,
    atsChecks: 5,
    resumeMatchChecks: 5,
    salaryEstimates: 3,
    publicToolUsage: 10,
    fullKeywordGap: false,
    fullScoreBreakdown: false,
    versionHistoryDays: 0,
  },
  starter: {
    masterResumes: 1,
    jdScans: 100,
    tailoredResumes: 100,
    pdfDownloads: null,
    atsChecks: 200,
    resumeMatchChecks: 200,
    salaryEstimates: 50,
    publicToolUsage: 250,
    fullKeywordGap: true,
    fullScoreBreakdown: true,
    versionHistoryDays: 30,
  },
  plus: {
    masterResumes: 3,
    jdScans: 100,
    tailoredResumes: 100,
    pdfDownloads: null,
    atsChecks: 200,
    resumeMatchChecks: 200,
    salaryEstimates: 50,
    publicToolUsage: 250,
    fullKeywordGap: true,
    fullScoreBreakdown: true,
    versionHistoryDays: 365,
  },
  // Pro = unlimited usage, ad-free. Count fields use UNLIMITED; Pro is also
  // exempted from PAID_PLAN_MONTHLY_RESUME_LIMIT in limitForField().
  pro: {
    masterResumes: UNLIMITED,
    jdScans: UNLIMITED,
    tailoredResumes: UNLIMITED,
    pdfDownloads: null,
    atsChecks: UNLIMITED,
    resumeMatchChecks: UNLIMITED,
    salaryEstimates: UNLIMITED,
    publicToolUsage: UNLIMITED,
    fullKeywordGap: true,
    fullScoreBreakdown: true,
    versionHistoryDays: 365,
  },
}

export const PAID_PLAN_MONTHLY_RESUME_LIMIT = 100

export const SCORE_DISCLAIMER =
  "This is an estimated match score based on resume and job description alignment. It does not guarantee interviews or recruiter responses."

export const ATS_DISCLAIMER =
  "This is an estimated ATS-style score. No tool can guarantee how every employer ATS will rank a resume."

export const SALARY_DISCLAIMER =
  "Salary estimates are directional and may vary by company, location, industry, market conditions, benefits, and negotiation."

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  "Saved",
  "Applied",
  "Interview",
  "Rejected",
  "Offer",
]
