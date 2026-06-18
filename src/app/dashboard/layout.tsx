import Link from "next/link"
import { LogoutButton } from "@/components/app/LogoutButton"
import { UpgradeButton } from "@/components/app/UpgradeButton"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background text-on-surface h-full flex antialiased w-full">
      {/* SideNavBar */}
      <nav className="bg-surface dark:bg-surface-container-low text-primary dark:text-primary-fixed font-label-uppercase text-label-uppercase h-screen w-64 fixed left-0 top-0 hidden md:flex flex-col border-r border-outline-variant/20 p-stack-md gap-stack-sm">
        {/* Header */}
        <div className="px-3 py-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary text-[20px]">work</span>
            </div>
            <div>
              <h1 className="font-headline-md text-headline-md font-bold text-primary">HireTuner</h1>
              <span className="font-body-sm text-body-sm text-on-surface-variant">Pro Account</span>
            </div>
          </div>
        </div>

        {/* Main Nav Links */}
        <div className="flex-1 space-y-1">
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 bg-secondary-fixed text-on-secondary-fixed rounded-lg font-bold">
            <span className="material-symbols-outlined">dashboard</span>
            Dashboard
          </Link>
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-surface-container-high transition-all rounded-lg">
            <span className="material-symbols-outlined">auto_fix_high</span>
            Tailor Resume
          </Link>
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-surface-container-high transition-all rounded-lg">
            <span className="material-symbols-outlined">assignment</span>
            Applications
          </Link>
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-surface-container-high transition-all rounded-lg">
            <span className="material-symbols-outlined">description</span>
            Master Resume
          </Link>
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-surface-container-high transition-all rounded-lg">
            <span className="material-symbols-outlined">analytics</span>
            Usage
          </Link>
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-surface-container-high transition-all rounded-lg">
            <span className="material-symbols-outlined">settings</span>
            Settings
          </Link>
        </div>

        {/* Footer Nav */}
        <div className="mt-auto space-y-1 pt-4 border-t border-outline-variant/20">
          <Link href="#" className="flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-surface-container-high transition-all rounded-lg">
            <span className="material-symbols-outlined">support</span>
            Help Center
          </Link>
          <LogoutButton className="flex w-full items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-surface-container-high transition-all rounded-lg text-left disabled:opacity-60" />
          <UpgradeButton className="w-full mt-4" />
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col md:ml-64 min-h-screen">
        {/* TopAppBar */}
        <header className="h-16 border-b border-outline-variant/30 bg-surface/80 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-gutter">
          <div className="flex items-center flex-1">
            <div className="relative w-full max-w-md hidden sm:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">search</span>
              <input type="text" className="w-full pl-9 pr-4 py-1.5 bg-surface-container-highest border border-outline-variant/30 rounded-full font-body-sm text-body-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all" placeholder="Search applications, resumes..." />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="hidden sm:flex items-center gap-2 bg-primary text-on-primary px-4 py-1.5 rounded-full font-body-sm text-body-sm hover:bg-surface-tint transition-colors focus:ring-2 focus:ring-secondary focus:ring-offset-2">
              <span className="material-symbols-outlined text-sm">add</span>
              Tailor New Resume
            </Link>
            <div className="h-8 w-px bg-outline-variant/30 mx-2"></div>
            <button className="text-on-surface-variant hover:text-primary transition-colors">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <img className="w-8 h-8 rounded-full object-cover border border-outline-variant/50 cursor-pointer" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDWmVrfiWMFyTKcCBKId_RCTOfodqidNYY3ZC3v3PZrFwh-Ko4BXUcVA7YYxmFS26J3O_yda17YzpWf9rzHHuXPU_RiAcQm4MiX-ECRqZsFr1n_K3e9pTRA1FHaQC-u895zyjBhwLzjwWKFMoXDOfSs3bhQcgQXXi_G0Bgp1AVMKB8JkyKEYHpmgt6Czp-OyRjJogHYGTB04aJaGycUGSkh1ZNcbQDLn939HHgEtI0X4kyHbW7sVf0k89xkBVpBrm657D7u07jwFZQ" alt="User Profile" />
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
