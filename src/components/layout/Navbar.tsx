import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { getCurrentUser } from "@/lib/auth"

export async function Navbar() {
  // Server-side auth check so signed-in users see Dashboard instead of the
  // Sign In / Get Started CTAs. Wrapped in try/catch so a transient auth
  // backend failure never breaks the marketing nav.
  let isAuthenticated = false
  try {
    const auth = await getCurrentUser()
    isAuthenticated = Boolean(auth)
  } catch {
    isAuthenticated = false
  }

  return (
    <nav className="bg-surface/80 dark:bg-surface-container-highest/80 backdrop-blur-md text-primary dark:text-primary-fixed font-body-base text-body-base docked full-width top-0 sticky z-50 border-b border-outline-variant/30 shadow-sm flex justify-between items-center w-full px-margin-page py-4 max-w-[1200px] mx-auto">
      <div className="flex items-center gap-stack-md">
        <Link href="/" className="flex items-center gap-stack-xs text-primary dark:text-primary-fixed">
          <span className="material-symbols-outlined fill">document_scanner</span>
          <span className="font-headline-md text-headline-md font-bold">HireTuner</span>
        </Link>
        <div className="hidden md:flex items-center gap-stack-lg ml-stack-xl">
          <Link href="/#product" className="text-on-surface-variant dark:text-on-surface-variant hover:text-secondary dark:hover:text-secondary-fixed transition-colors active:scale-95 duration-200">
            Product
          </Link>
          <Link href="/#pricing" className="text-on-surface-variant dark:text-on-surface-variant hover:text-secondary dark:hover:text-secondary-fixed transition-colors active:scale-95 duration-200">
            Pricing
          </Link>
          <Link href="/#faq" className="text-on-surface-variant dark:text-on-surface-variant hover:text-secondary dark:hover:text-secondary-fixed transition-colors active:scale-95 duration-200">
            FAQ
          </Link>
        </div>
      </div>
      <div className="flex items-center gap-stack-md">
        <div className="hidden md:flex items-center gap-stack-sm text-on-surface-variant">
          <button className="hover:text-secondary transition-colors" aria-label="Notifications">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="hover:text-secondary transition-colors" aria-label="Help">
            <span className="material-symbols-outlined">help_outline</span>
          </button>
        </div>
        {isAuthenticated ? (
          <Button asChild>
            <Link href="/dashboard">Open Dashboard</Link>
          </Button>
        ) : (
          <>
            <Link href="/login" className="hidden md:block font-label-uppercase text-label-uppercase text-on-surface-variant hover:text-secondary transition-colors">
              Sign In
            </Link>
            <Button asChild>
              <Link href="/signup">Get Started</Link>
            </Button>
          </>
        )}
      </div>
    </nav>
  )
}
