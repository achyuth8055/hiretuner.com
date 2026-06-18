import { AuthForm } from "@/components/app/AuthForm"
import { pageMetadata } from "@/lib/seo"

export const metadata = pageMetadata({
  title: "Log In",
  description: "Log in to your HireTuner workspace to match resumes to jobs, track applications, and access your saved resume tools.",
  path: "/login",
  index: false,
})

export default function LoginPage() {
  return (
    <section className="flex-1 w-full max-w-[1200px] mx-auto px-margin-page py-stack-xl flex items-center justify-center">
      <AuthForm mode="login" />
    </section>
  )
}
