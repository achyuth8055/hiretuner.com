"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LogoutButton } from "@/components/app/LogoutButton"
import { ManageBillingButton } from "@/components/app/ManageBillingButton"
import { UpgradeButton } from "@/components/app/UpgradeButton"
import type { PlanType } from "@/lib/rolefit-types"

type SectionLink = {
  hash: "" | "tailor" | "applications" | "your-resume" | "usage"
  label: string
  icon: string
}

const SECTIONS: SectionLink[] = [
  { hash: "", label: "Dashboard", icon: "dashboard" },
  { hash: "tailor", label: "Tailor Resume", icon: "auto_fix_high" },
  { hash: "applications", label: "Applications", icon: "assignment" },
  { hash: "your-resume", label: "Your Resume", icon: "description" },
  { hash: "usage", label: "Usage", icon: "analytics" },
]

const HEADER_OFFSET_PX = 80 // sticky h-16 header + a few px of breathing room

export function DashboardSidenav({ plan }: { plan: PlanType }) {
  const router = useRouter()
  const pathname = usePathname()
  const planLabel = plan === "pro" ? "Pro Account" : plan === "starter" ? "Starter Account" : "Free Account"

  function activateSection(target: SectionLink["hash"]) {
    return (event: React.MouseEvent<HTMLAnchorElement>) => {
      // If we're not on /dashboard yet, fall back to default navigation
      // (Next.js will route then auto-scroll to the anchor).
      if (pathname !== "/dashboard") return

      event.preventDefault()
      const root = typeof window === "undefined" ? null : document
      if (!root) return

      // Scroll to top of page for the Dashboard "home" link, otherwise scroll
      // to the section element. We resolve to the OUTER row container so the
      // entire left+right columns land in view together — not just the right-
      // column widget (Usage / Applications live in different columns).
      if (target === "") {
        window.scrollTo({ top: 0, behavior: "smooth" })
        history.replaceState(null, "", "/dashboard")
        return
      }

      const node = document.getElementById(target)
      if (!node) return

      // Walk up to the closest landmark row. Each section sits inside a
      // multi-column flex/grid row — scrolling that whole row keeps the layout
      // visually balanced (matches the "top of dashboard" feel the user wants).
      const row = node.closest("[data-dashboard-row]") ?? node
      const top = row.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET_PX
      window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" })
      history.replaceState(null, "", `/dashboard#${target}`)
    }
  }

  function classFor(target: SectionLink["hash"]) {
    const base =
      "flex items-center gap-3 px-3 py-2 transition-all rounded-lg"
    if (pathname === "/dashboard" && target === "") {
      return `${base} bg-secondary-fixed text-on-secondary-fixed font-bold`
    }
    return `${base} text-on-surface-variant hover:bg-surface-container-high`
  }

  return (
    <nav className="bg-surface dark:bg-surface-container-low text-primary dark:text-primary-fixed font-label-uppercase text-label-uppercase h-screen w-64 fixed left-0 top-0 hidden md:flex flex-col border-r border-outline-variant/20 p-stack-md gap-stack-sm">
      <div className="px-3 py-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary text-[20px]">work</span>
          </div>
          <div>
            <h1 className="font-headline-md text-headline-md font-bold text-primary">HireTuner</h1>
            <span className="font-body-sm text-body-sm text-on-surface-variant">{planLabel}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-1">
        {SECTIONS.map((section) => (
          <Link
            key={section.hash}
            href={section.hash === "" ? "/dashboard" : `/dashboard#${section.hash}`}
            onClick={activateSection(section.hash)}
            className={classFor(section.hash)}
            // Tell Next.js's app-router not to inject its own anchor scroll
            scroll={false}
          >
            <span className="material-symbols-outlined">{section.icon}</span>
            {section.label}
          </Link>
        ))}
        <Link
          href="/dashboard/settings"
          onClick={() => router.refresh()}
          className="flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-surface-container-high transition-all rounded-lg"
        >
          <span className="material-symbols-outlined">settings</span>
          Settings
        </Link>
      </div>

      <div className="mt-auto space-y-1 pt-4 border-t border-outline-variant/20">
        <Link
          href="/contact"
          className="flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-surface-container-high transition-all rounded-lg"
        >
          <span className="material-symbols-outlined">support</span>
          Help Center
        </Link>
        <LogoutButton className="flex w-full items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-surface-container-high transition-all rounded-lg text-left disabled:opacity-60" />

        {/* Paid users see Manage billing; non-Pro users also see an upgrade CTA. */}
        {(plan === "starter" || plan === "pro") && (
          <ManageBillingButton className="w-full mt-2" />
        )}
        {plan !== "pro" && <UpgradeButton className="w-full mt-2" currentPlan={plan} />}
      </div>
    </nav>
  )
}
