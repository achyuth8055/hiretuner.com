import { AuthForm } from "@/components/app/AuthForm"
import { pageMetadata } from "@/lib/seo"

export const metadata = pageMetadata({
  title: "Sign Up",
  description: "Create a free HireTuner account and try two resume matches. Tailor your resume to any job, track applications, and improve your ATS score.",
  path: "/signup",
  index: false,
})

export default function SignupPage() {
  return (
    <section className="flex-1 w-full max-w-[1200px] mx-auto px-margin-page py-stack-xl flex items-center justify-center">
      <AuthForm mode="signup" />
    </section>
  )
}
