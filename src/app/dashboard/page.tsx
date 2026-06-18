import { redirect } from "next/navigation"
import { DashboardWorkspace } from "@/components/app/DashboardWorkspace"
import { getCurrentUser } from "@/lib/auth"
import { getDashboardData } from "@/lib/database"
import { resolvePlan } from "@/lib/http"
import { PLAN_LIMITS } from "@/lib/rolefit-types"

export default async function DashboardPage() {
  const auth = await getCurrentUser()

  if (!auth) {
    redirect("/login")
  }

  const plan = resolvePlan(auth.subscription)
  const dashboard = getDashboardData(auth.user.id)

  return (
    <DashboardWorkspace
      initial={{
        user: { id: auth.user.id, name: auth.user.name, email: auth.user.email },
        plan,
        limits: {
          jdScans: PLAN_LIMITS[plan].jdScans,
          tailoredResumes: PLAN_LIMITS[plan].tailoredResumes,
          pdfDownloads: PLAN_LIMITS[plan].pdfDownloads,
        },
        subscription: dashboard.subscription,
        usage: dashboard.usage,
        masterResume: dashboard.masterResume,
        applications: dashboard.applications,
        tailoredResumes: dashboard.tailoredResumes,
        missingSkillsInsight: dashboard.missingSkillsInsight,
        averageScoreLift: dashboard.averageScoreLift,
      }}
    />
  )
}
