import { redirect } from "next/navigation"
import Link from "next/link"
import { getCurrentUser } from "@/lib/auth"
import { resolvePlan } from "@/lib/http"
import { PLAN_LIMITS } from "@/lib/rolefit-types"
import { LogoutButton } from "@/components/app/LogoutButton"
import { ManageSubscriptionButton } from "./ManageSubscriptionButton"

export const metadata = {
  title: "Settings — HireTuner",
  description: "Manage your HireTuner account, subscription, and preferences.",
}

export default async function SettingsPage() {
  const auth = await getCurrentUser()
  if (!auth) redirect("/login")

  const plan = resolvePlan(auth.subscription)
  const limits = PLAN_LIMITS[plan]
  const hasStripeCustomer = Boolean(auth.subscription?.stripeCustomerId)

  return (
    <div className="p-gutter max-w-3xl">
      <div className="mb-stack-xl">
        <h2 className="font-headline-md text-headline-md text-primary">Settings</h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
          Manage your account, plan, and security preferences.
        </p>
      </div>

      {/* Profile */}
      <section className="bg-surface-container-lowest border border-outline-variant/50 rounded-lg p-stack-md shadow-sm mb-stack-lg">
        <h3 className="font-label-uppercase text-label-uppercase text-primary mb-4">Profile</h3>
        <dl className="space-y-3 text-body-sm">
          <div className="flex justify-between border-b border-outline-variant/20 pb-2">
            <dt className="text-on-surface-variant">Name</dt>
            <dd className="text-primary font-medium">{auth.user.name}</dd>
          </div>
          <div className="flex justify-between border-b border-outline-variant/20 pb-2">
            <dt className="text-on-surface-variant">Email</dt>
            <dd className="text-primary font-medium">{auth.user.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-on-surface-variant">Member since</dt>
            <dd className="text-primary font-medium">
              {new Date(auth.user.createdAt).toLocaleDateString()}
            </dd>
          </div>
        </dl>
      </section>

      {/* Subscription */}
      <section className="bg-surface-container-lowest border border-outline-variant/50 rounded-lg p-stack-md shadow-sm mb-stack-lg">
        <h3 className="font-label-uppercase text-label-uppercase text-primary mb-4">Subscription</h3>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="font-medium text-primary">
              {plan === "starter" ? "Starter Plan" : "Free Plan"}
            </div>
            <div className="text-xs text-on-surface-variant mt-1">
              {plan === "starter"
                ? `${limits.tailoredResumes} tailored resumes per month · PDF downloads enabled`
                : `${limits.jdScans} JD scans per month · Upgrade for unlimited tailoring`}
            </div>
          </div>
          {hasStripeCustomer ? (
            <ManageSubscriptionButton />
          ) : (
            <Link
              href="/#pricing"
              className="bg-primary text-on-primary px-4 py-2 rounded-full font-body-sm text-body-sm hover:bg-surface-tint transition-colors"
            >
              Upgrade
            </Link>
          )}
        </div>
        {plan === "starter" && (
          <p className="text-xs text-on-surface-variant border-t border-outline-variant/20 pt-3">
            Manage billing details, switch between monthly/yearly, or cancel anytime via the
            Stripe portal — your access continues until the end of the paid period.
          </p>
        )}
      </section>

      {/* Security */}
      <section className="bg-surface-container-lowest border border-outline-variant/50 rounded-lg p-stack-md shadow-sm mb-stack-lg">
        <h3 className="font-label-uppercase text-label-uppercase text-primary mb-4">Security</h3>
        <div className="space-y-3">
          <Link
            href="/reset-password"
            className="block px-4 py-3 rounded border border-outline-variant/30 hover:bg-surface-container-high transition-colors text-body-sm"
          >
            <div className="font-medium text-primary">Change password</div>
            <div className="text-xs text-on-surface-variant mt-1">
              Send a reset link to {auth.user.email}.
            </div>
          </Link>
          <LogoutButton className="w-full flex items-center gap-2 px-4 py-3 rounded border border-outline-variant/30 hover:bg-surface-container-high transition-colors text-body-sm text-left" />
        </div>
      </section>

      {/* Danger zone */}
      <section className="bg-surface-container-lowest border border-error/30 rounded-lg p-stack-md shadow-sm">
        <h3 className="font-label-uppercase text-label-uppercase text-error mb-4">Danger zone</h3>
        <div className="text-xs text-on-surface-variant mb-3">
          To delete your HireTuner account and all associated data, contact{" "}
          <a className="text-secondary underline" href="mailto:support@hiretuner.com">
            support@hiretuner.com
          </a>
          . We&apos;ll process the request within 7 days per our Privacy Policy.
        </div>
      </section>
    </div>
  )
}
