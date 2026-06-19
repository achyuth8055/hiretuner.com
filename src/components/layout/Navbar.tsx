import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { getCurrentUser } from "@/lib/auth"
import { toolLinks } from "@/lib/site"

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
          {/* Tools dropdown - CSS hover/focus-within so the nav stays a server
              component and every tool link is present in the DOM for crawlers. */}
          <div className="relative group">
            <button
              type="button"
              aria-haspopup="true"
              className="flex items-center gap-1 text-on-surface-variant dark:text-on-surface-variant hover:text-secondary dark:hover:text-secondary-fixed transition-colors group-focus-within:text-secondary"
            >
              Tools
              <span className="material-symbols-outlined text-[18px] leading-none transition-transform duration-200 group-hover:rotate-180 group-focus-within:rotate-180">
                expand_more
              </span>
            </button>
            <div className="invisible opacity-0 translate-y-1 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:visible group-focus-within:opacity-100 group-focus-within:translate-y-0 transition-all duration-200 absolute left-0 top-full pt-3 z-50">
              <div className="grid grid-cols-2 gap-1 w-[560px] p-2 rounded-2xl bg-surface dark:bg-surface-container-highest border border-outline-variant/40 shadow-lg">
                {toolLinks.map((tool) => (
                  <Link
                    key={tool.path}
                    href={tool.path}
                    className="flex flex-col gap-0.5 rounded-xl px-3 py-2 hover:bg-surface-container dark:hover:bg-surface-container-high transition-colors"
                  >
                    <span className="text-body-base text-on-surface dark:text-on-surface font-medium">
                      {tool.label}
                    </span>
                    <span className="text-body-sm text-on-surface-variant dark:text-on-surface-variant">
                      {tool.description}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
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
