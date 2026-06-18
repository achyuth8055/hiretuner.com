import Link from "next/link"

export function Footer() {
  return (
    <footer className="bg-surface-container-lowest dark:bg-surface-container-low text-on-surface dark:text-on-surface-variant font-body-sm text-body-sm w-full py-stack-xl border-t border-outline-variant opacity-80 hover:opacity-100 transition-opacity">
      <div className="max-w-[1200px] mx-auto px-margin-page flex flex-col md:flex-row justify-between items-center gap-stack-md">
        <div className="flex flex-col items-start gap-4">
          <Link href="/" className="flex items-center gap-2 text-primary">
            <span className="font-display-lg text-display-lg font-black text-primary leading-none tracking-tight">
              HireTuner
            </span>
          </Link>
        </div>
        <div className="flex flex-wrap md:justify-end gap-x-stack-lg gap-y-2 mt-6 md:mt-0">
          <Link href="/about" className="text-on-surface-variant hover:text-secondary transition-colors">
            About Us
          </Link>
          <Link href="/contact" className="text-on-surface-variant hover:text-secondary transition-colors">
            Contact Us
          </Link>
          <Link href="/blog" className="text-on-surface-variant hover:text-secondary transition-colors">
            Blog
          </Link>
          <Link href="/privacy-policy" className="text-on-surface-variant hover:text-secondary transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms-of-service" className="text-on-surface-variant hover:text-secondary transition-colors">
            Terms of Service
          </Link>
          <Link href="/cookie-policy" className="text-on-surface-variant hover:text-secondary transition-colors">
            Cookie Policy
          </Link>
        </div>
        <div className="text-on-surface-variant text-xs">
          © {new Date().getFullYear()} HireTuner. Tune your resume to every job.
        </div>
      </div>
    </footer>
  )
}
