import Link from "next/link"
import { toolLinks } from "@/lib/site"

const companyLinks = [
  { label: "About Us", path: "/about" },
  { label: "Contact Us", path: "/contact" },
  { label: "Blog", path: "/blog" },
  { label: "Salary Guides", path: "/salary-guide" },
]

const legalLinks = [
  { label: "Privacy Policy", path: "/privacy-policy" },
  { label: "Terms of Service", path: "/terms-of-service" },
  { label: "Cookie Policy", path: "/cookie-policy" },
]

export function Footer() {
  return (
    <footer className="bg-surface-container-lowest dark:bg-surface-container-low text-on-surface dark:text-on-surface-variant font-body-sm text-body-sm w-full py-stack-xl border-t border-outline-variant opacity-80 hover:opacity-100 transition-opacity">
      <div className="max-w-[1200px] mx-auto px-margin-page">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-stack-lg gap-y-stack-xl">
          <div className="col-span-2 md:col-span-1 flex flex-col items-start gap-3">
            <Link href="/" className="flex items-center gap-2 text-primary">
              <span className="font-display-lg text-display-lg font-black text-primary leading-none tracking-tight">
                HireTuner
              </span>
            </Link>
            <p className="text-on-surface-variant text-xs max-w-[16rem]">
              Tune your resume to every job. Land more interviews.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="font-label-uppercase text-label-uppercase uppercase tracking-wide text-on-surface font-semibold">
              Free Tools
            </h3>
            <ul className="flex flex-col gap-2">
              {toolLinks.map((tool) => (
                <li key={tool.path}>
                  <Link href={tool.path} className="text-on-surface-variant hover:text-secondary transition-colors">
                    {tool.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="font-label-uppercase text-label-uppercase uppercase tracking-wide text-on-surface font-semibold">
              Company
            </h3>
            <ul className="flex flex-col gap-2">
              {companyLinks.map((link) => (
                <li key={link.path}>
                  <Link href={link.path} className="text-on-surface-variant hover:text-secondary transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="font-label-uppercase text-label-uppercase uppercase tracking-wide text-on-surface font-semibold">
              Legal
            </h3>
            <ul className="flex flex-col gap-2">
              {legalLinks.map((link) => (
                <li key={link.path}>
                  <Link href={link.path} className="text-on-surface-variant hover:text-secondary transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-stack-xl pt-stack-md border-t border-outline-variant/40 text-on-surface-variant text-xs">
          © {new Date().getFullYear()} HireTuner. Tune your resume to every job.
        </div>
      </div>
    </footer>
  )
}
