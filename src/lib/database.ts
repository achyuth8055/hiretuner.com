import "server-only"

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import path from "node:path"
import type {
  Application,
  JobDescription,
  MasterResume,
  PublicToolResult,
  RoleFitDatabase,
  SalaryEstimate,
  Session,
  Subscription,
  TailoredResume,
  User,
} from "@/lib/rolefit-types"

const DATA_DIR = path.join(process.cwd(), ".data")
const DB_FILE = path.join(DATA_DIR, "rolefit-db.json")

const emptyDatabase = (): RoleFitDatabase => ({
  users: [],
  subscriptions: [],
  usages: [],
  masterResumes: [],
  jobDescriptions: [],
  tailoredResumes: [],
  applications: [],
  publicToolResults: [],
  salaryEstimates: [],
  sessions: [],
  passwordResetTokens: [],
})

function ensureDatabaseFile() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true })
  }

  if (!existsSync(DB_FILE)) {
    writeFileSync(DB_FILE, JSON.stringify(emptyDatabase(), null, 2))
  }
}

export function readDatabase(): RoleFitDatabase {
  ensureDatabaseFile()

  try {
    const raw = readFileSync(DB_FILE, "utf8")
    const parsed = JSON.parse(raw) as Partial<RoleFitDatabase>
    const subscriptions = (parsed.subscriptions ?? []).map((subscription) => ({
      ...subscription,
      billingInterval: subscription.billingInterval ?? null,
    }))

    return {
      ...emptyDatabase(),
      ...parsed,
      users: parsed.users ?? [],
      subscriptions,
      usages: parsed.usages ?? [],
      masterResumes: parsed.masterResumes ?? [],
      jobDescriptions: parsed.jobDescriptions ?? [],
      tailoredResumes: parsed.tailoredResumes ?? [],
      applications: parsed.applications ?? [],
      publicToolResults: parsed.publicToolResults ?? [],
      salaryEstimates: parsed.salaryEstimates ?? [],
      sessions: parsed.sessions ?? [],
      passwordResetTokens: parsed.passwordResetTokens ?? [],
    }
  } catch {
    const fallback = emptyDatabase()
    writeDatabase(fallback)
    return fallback
  }
}

export function writeDatabase(database: RoleFitDatabase) {
  ensureDatabaseFile()
  const tempFile = `${DB_FILE}.${process.pid}.tmp`
  writeFileSync(tempFile, JSON.stringify(database, null, 2))
  renameSync(tempFile, DB_FILE)
}

export function updateDatabase<T>(mutator: (database: RoleFitDatabase) => T): T {
  const database = readDatabase()
  const result = mutator(database)
  writeDatabase(database)
  return result
}

export function nowIso() {
  return new Date().toISOString()
}

export function currentUsageMonth(date = new Date()) {
  return date.toISOString().slice(0, 7)
}

export function createId() {
  return crypto.randomUUID()
}

export function findUserByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  return readDatabase().users.find((user) => user.email === normalizedEmail) ?? null
}

export function findUserById(userId: string) {
  return readDatabase().users.find((user) => user.id === userId) ?? null
}

export function getSubscriptionForUser(userId: string) {
  return readDatabase().subscriptions.find((subscription) => subscription.userId === userId) ?? null
}

export function upsertUsageForUser(userId: string, month = currentUsageMonth()) {
  return updateDatabase((database) => {
    let usage = database.usages.find((item) => item.userId === userId && item.month === month)

    if (!usage) {
      const timestamp = nowIso()
      usage = {
        id: createId(),
        userId,
        month,
        jdScansUsed: 0,
        tailoredResumesUsed: 0,
        pdfDownloadsUsed: 0,
        atsChecksUsed: 0,
        resumeMatchChecksUsed: 0,
        salaryEstimatesUsed: 0,
        publicToolUsageUsed: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
      }
      database.usages.push(usage)
    }

    return usage
  })
}

export function getActiveMasterResume(userId: string) {
  return (
    readDatabase().masterResumes.find((resume) => resume.userId === userId && resume.active) ?? null
  )
}

export function getDashboardData(userId: string) {
  const database = readDatabase()
  const subscription = database.subscriptions.find((item) => item.userId === userId) ?? null
  const usage =
    database.usages.find((item) => item.userId === userId && item.month === currentUsageMonth()) ??
    upsertUsageForUser(userId)
  const masterResume =
    database.masterResumes.find((item) => item.userId === userId && item.active) ?? null
  const applications = database.applications
    .filter((item) => item.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const tailoredResumes = database.tailoredResumes.filter((item) => item.userId === userId)
  const recentPublicToolResults = database.publicToolResults
    .filter((item) => item.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)
  const missingSkillCounts = new Map<string, number>()

  tailoredResumes.forEach((resume) => {
    resume.keywordCoverage.forEach((item) => {
      if (item.status === "needs_confirmation" || item.status === "missing") {
        missingSkillCounts.set(item.keyword, (missingSkillCounts.get(item.keyword) ?? 0) + 1)
      }
    })
  })

  const missingSkillsInsight = [...missingSkillCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([keyword]) => keyword)

  const averageScoreLift =
    tailoredResumes.length === 0
      ? 0
      : Math.round(
          tailoredResumes.reduce(
            (total, resume) => total + Math.max(0, resume.tailoredScore - resume.originalScore),
            0
          ) / tailoredResumes.length
        )

  return {
    subscription,
    usage,
    masterResume,
    applications,
    tailoredResumes,
    recentPublicToolResults,
    missingSkillsInsight,
    averageScoreLift,
  }
}

export function insertUser(user: User, subscription: Subscription, session: Session) {
  updateDatabase((database) => {
    database.users.push(user)
    database.subscriptions.push(subscription)
    database.sessions.push(session)
  })

  // Best-effort mirror to Firestore when configured. We import lazily and
  // swallow errors so a Firestore outage never breaks signup.
  void mirrorUserToFirestore(user, subscription, session)
}

async function mirrorUserToFirestore(
  user: User,
  subscription: Subscription,
  session: Session,
) {
  try {
    const { isFirestoreEnabled, recordSessionDocument, upsertSubscriptionDocument, upsertUserDocument } =
      await import("@/lib/firestore-store")
    if (!isFirestoreEnabled()) return
    await Promise.all([
      upsertUserDocument(user),
      upsertSubscriptionDocument(subscription),
      recordSessionDocument(session.id, user.id, session.expiresAt),
    ])
  } catch (error) {
    // Don't block local writes on a remote failure.
    const { logger } = await import("@/lib/logger")
    logger.warn("firestore.mirror", "Failed to mirror user to Firestore", {
      userId: user.id,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

export function replaceMasterResume(masterResume: MasterResume) {
  updateDatabase((database) => {
    database.masterResumes = database.masterResumes.map((resume) =>
      resume.userId === masterResume.userId ? { ...resume, active: false, updatedAt: nowIso() } : resume
    )
    database.masterResumes.push(masterResume)
  })
}

export function saveJobDescription(jobDescription: JobDescription) {
  updateDatabase((database) => {
    database.jobDescriptions.push(jobDescription)
  })
}

export function saveTailoredResume(tailoredResume: TailoredResume, application: Application) {
  updateDatabase((database) => {
    database.tailoredResumes.push(tailoredResume)
    database.applications.push(application)
  })
}

export function savePublicToolResult(result: PublicToolResult) {
  updateDatabase((database) => {
    database.publicToolResults.push(result)
  })
}

export function saveSalaryEstimate(result: SalaryEstimate) {
  updateDatabase((database) => {
    database.salaryEstimates.push(result)
  })
}
