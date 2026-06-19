import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { pageMetadata, JsonLd, breadcrumbLd, webApplicationLd } from "@/lib/seo"

const TITLE = "Job Application Tracker"
const DESCRIPTION =
  "Track every job application in one place: companies, roles, statuses, resume versions, match scores, notes, and follow-up dates so nothing slips away."
const PATH = "/job-application-tracker"

export const metadata = pageMetadata({ title: TITLE, description: DESCRIPTION, path: PATH })

const sampleRows = [
  ["Acme Health", "Java Developer", "Applied", "v3", "84%", "Follow up next week"],
  ["CloudWorks", "Backend Engineer", "Saved", "v2", "81%", "Need referral"],
  ["FinTech Global", "Systems Analyst", "Interview", "v4", "92%", "Prep Spring Boot examples"],
]

export default function JobApplicationTrackerPage() {
  return (
    <main className="flex-grow w-full max-w-[1200px] mx-auto px-margin-page py-12 md:py-24">
      <JsonLd data={breadcrumbLd([{ name: "Job Application Tracker", path: PATH }])} />
      <JsonLd data={webApplicationLd({ name: TITLE, description: DESCRIPTION, path: PATH })} />
      <div className="text-center mb-16 max-w-3xl mx-auto">
        <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary mb-6">
          Job Application Tracker
        </h1>
        <p className="font-body-base text-body-base text-on-surface-variant text-lg">
          Track which tailored resume version you used for each company, status, match score, notes, and follow-up timing.
        </p>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-left font-body-sm text-body-sm">
          <thead className="bg-surface-container-low text-on-surface-variant border-b border-outline-variant/30">
            <tr>
              {["Company", "Job title", "Status", "Resume version", "Match score", "Notes"].map((heading) => (
                <th key={heading} className="px-4 py-3 font-medium">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/20">
            {sampleRows.map((row) => (
              <tr key={`${row[0]}-${row[1]}`}>
                {row.map((cell) => (
                  <td key={cell} className="px-4 py-3 text-primary">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="mt-stack-xl bg-primary-container text-on-primary-container rounded-xl p-stack-lg flex flex-col md:flex-row justify-between gap-stack-md">
        <div>
          <h2 className="font-headline-md text-headline-md">Start tracking applications</h2>
          <p className="font-body-sm text-body-sm text-on-primary-container/80 mt-1">
            HireTuner automatically saves generated tailored resumes as application records.
          </p>
        </div>
        <Button variant="secondary" asChild>
          <Link href="/signup">Start Tracking Applications</Link>
        </Button>
      </section>
    </main>
  )
}
