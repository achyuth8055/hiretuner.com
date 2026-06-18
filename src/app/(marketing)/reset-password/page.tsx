import { AuthForm } from "@/components/app/AuthForm"
import { pageMetadata } from "@/lib/seo"

export const metadata = pageMetadata({
  title: "Reset Password",
  description: "Reset your HireTuner password to regain access to your workspace, resume matches, and saved job applications.",
  path: "/reset-password",
  index: false,
})

export default function ResetPasswordPage() {
  return (
    <section className="flex-1 w-full max-w-[1200px] mx-auto px-margin-page py-stack-xl flex items-center justify-center">
      <AuthForm mode="reset" />
    </section>
  )
}
