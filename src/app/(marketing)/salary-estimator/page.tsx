import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { SalaryEstimatorTool } from "@/components/app/PublicTools"
import { pageMetadata, JsonLd, breadcrumbLd, webApplicationLd } from "@/lib/seo"

const TITLE = "Salary Estimator: Estimate Your Pay Range"
const DESCRIPTION =
  "Estimate directional salary ranges by role, experience, location, skills, work mode, and industry to benchmark offers and negotiate with confidence."
const PATH = "/salary-estimator"

export const metadata = pageMetadata({ title: TITLE, description: DESCRIPTION, path: PATH })

export default function SalaryEstimatorPage() {
  return (
    <main className="flex-1 w-full relative z-0 pb-stack-xl">
      <JsonLd data={breadcrumbLd([{ name: "Salary Estimator", path: PATH }])} />
      <JsonLd data={webApplicationLd({ name: TITLE, description: DESCRIPTION, path: PATH })} />
      <header className="max-w-[1200px] mx-auto px-margin-page pt-stack-xl pb-stack-lg border-b border-outline-variant/20">
        <h1 className="font-display-lg-mobile text-display-lg-mobile md:font-display-lg md:text-display-lg text-primary tracking-tight mb-4">
          Precision Salary Estimator
        </h1>
        <p className="font-body-base text-body-base text-on-surface-variant max-w-2xl">
          Estimate salary range by role, experience, location, skills, and work mode. Outputs are directional and not salary guarantees.
        </p>
      </header>

      <section className="max-w-[1200px] mx-auto px-margin-page py-stack-lg">
        <SalaryEstimatorTool />
      </section>

      <section className="max-w-[1200px] mx-auto px-margin-page">
        <div className="bg-primary-container text-on-primary-container rounded-xl p-stack-lg relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-stack-md border border-primary-fixed-variant/20">
          <div className="z-10 text-center sm:text-left">
            <h2 className="font-headline-md text-headline-md text-on-primary-container mb-1">Targeting the high end?</h2>
            <p className="font-body-sm text-body-sm text-on-primary-container/80">
              Align your resume with role keywords that support higher-paying opportunities.
            </p>
          </div>
          <Button variant="secondary" asChild>
            <Link href="/signup">Tailor Resume Now</Link>
          </Button>
        </div>
      </section>
    </main>
  )
}
