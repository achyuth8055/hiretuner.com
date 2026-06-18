import { Button } from "@/components/ui/Button"
import { pageMetadata } from "@/lib/seo"

export const metadata = pageMetadata({
  title: "Java Developer Salary Guide 2026",
  description: "Explore Java developer salaries by experience, location, and skills. See market rates, in-demand skills, and how to tailor your resume for top-paying Java roles.",
  path: "/java-developer-salary-guide",
})

export default function JavaDeveloperSalaryGuidePage() {
  return (
    <main className="flex-grow">
      {/* Hero Section */}
      <section className="max-w-[1200px] mx-auto px-margin-page py-stack-xl flex flex-col lg:flex-row gap-gutter items-center">
        <div className="lg:w-1/2 space-y-stack-md">
          <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary">Java Developer Salary Guide</h1>
          <p className="font-body-base text-body-base text-on-surface-variant">Unlock your earning potential. Understand the market rates, in-demand skills, and precisely tailor your resume to land top-tier Java roles.</p>

          <div className="bg-surface-container-lowest border border-surface-variant rounded-xl p-stack-lg shadow-sm mt-stack-lg">
            <h3 className="font-headline-md text-headline-md text-primary mb-stack-sm">Estimator Tool</h3>
            <div className="space-y-stack-sm">
              <div>
                <label className="block font-label-uppercase text-label-uppercase text-on-surface-variant mb-stack-xs">Years of Experience</label>
                <select className="w-full bg-surface-bright border border-surface-variant rounded-lg p-2 font-body-base text-body-base text-on-background focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all" defaultValue="Mid Level (1-3 years)">
                  <option>Entry Level (0-1 year)</option>
                  <option value="Mid Level (1-3 years)">Mid Level (1-3 years)</option>
                  <option>Senior (3-5 years)</option>
                  <option>Lead/Architect (5+ years)</option>
                </select>
              </div>
              <div>
                <label className="block font-label-uppercase text-label-uppercase text-on-surface-variant mb-stack-xs">Location Focus</label>
                <select className="w-full bg-surface-bright border border-surface-variant rounded-lg p-2 font-body-base text-body-base text-on-background focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all" defaultValue="Remote / Global">
                  <option value="Remote / Global">Remote / Global</option>
                  <option>North America</option>
                  <option>Europe</option>
                  <option>Asia-Pacific</option>
                </select>
              </div>
              <div className="pt-stack-xs">
                <div className="bg-surface-container p-stack-sm rounded-lg flex justify-between items-center border border-surface-variant">
                  <span className="font-body-base text-body-base text-on-surface-variant">Estimated Range:</span>
                  <span className="font-headline-md text-headline-md text-primary font-bold">$95,000 - $130,000</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="lg:w-1/2 w-full mt-stack-lg lg:mt-0">
          <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-surface-variant shadow-sm bg-surface-container">
            <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop')" }}></div>
            <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest/80 to-transparent flex items-end p-stack-lg">
              <p className="font-label-uppercase text-label-uppercase text-primary bg-surface-container-lowest/90 px-3 py-1 rounded-full border border-surface-variant backdrop-blur-sm shadow-sm">Data Driven Insights</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary text-on-primary py-stack-xl mt-stack-xl">
        <div className="max-w-[1200px] mx-auto px-margin-page text-center space-y-stack-md">
          <h2 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg">Ready to Maximize Your Value?</h2>
          <p className="font-body-base text-body-base max-w-2xl mx-auto opacity-90">Use AI to precisely align your resume with the highest-paying Java roles.</p>
          <Button variant="outline" className="mt-stack-sm h-auto py-3 bg-white text-primary border-none hover:bg-surface-variant">Tailor My Resume for Java Developer Jobs</Button>
        </div>
      </section>
    </main>
  )
}
