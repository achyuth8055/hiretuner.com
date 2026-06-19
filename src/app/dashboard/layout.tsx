import Link from "next/link"
import { redirect } from "next/navigation"
import { DashboardSidenav } from "@/components/app/DashboardSidenav"
import { UserAvatar } from "@/components/app/UserAvatar"
import { getCurrentUser } from "@/lib/auth"
import { resolvePlan } from "@/lib/http"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getCurrentUser()
  if (!auth) {
    redirect("/login")
  }

  const plan = resolvePlan(auth.subscription)

  return (
    <div className="bg-background text-on-surface h-full flex antialiased w-full">
      <DashboardSidenav plan={plan} />

      <main className="flex-1 flex flex-col md:ml-64 min-h-screen">
        <header className="h-16 border-b border-outline-variant/30 bg-surface/80 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-gutter">
          <div className="flex items-center flex-1">
            <div className="relative w-full max-w-md hidden sm:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">search</span>
              <input
                type="text"
                className="w-full pl-9 pr-4 py-1.5 bg-surface-container-highest border border-outline-variant/30 rounded-full font-body-sm text-body-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all"
                placeholder="Search applications, resumes..."
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard#tailor"
              className="hidden sm:flex items-center gap-2 bg-primary text-on-primary px-4 py-1.5 rounded-full font-body-sm text-body-sm hover:bg-surface-tint transition-colors focus:ring-2 focus:ring-secondary focus:ring-offset-2"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Tailor New Resume
            </Link>
            <div className="h-8 w-px bg-outline-variant/30 mx-2" />
            <button className="text-on-surface-variant hover:text-primary transition-colors">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <Link href="/dashboard/settings" aria-label="Account settings">
              <UserAvatar
                name={auth.user.name}
                email={auth.user.email}
                photoUrl={auth.user.photoUrl}
                size={32}
                className="cursor-pointer"
              />
            </Link>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
