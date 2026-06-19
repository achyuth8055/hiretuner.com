import { redirect } from "next/navigation"
import { BuildResumeForm } from "@/components/app/BuildResumeForm"
import { getCurrentUser } from "@/lib/auth"

export default async function BuildResumePage() {
  const auth = await getCurrentUser()
  if (!auth) redirect("/login")

  return (
    <div className="p-gutter flex-1 max-w-[1100px] mx-auto w-full">
      <div className="mb-stack-lg">
        <h2 className="font-headline-md text-headline-md text-primary">Build your resume from scratch</h2>
        <p className="font-body-base text-body-base text-on-surface-variant mt-1">
          Fill in your details and we&apos;ll create a tailorable master resume. Each role, project, and skill
          you add gives the JD matcher more to work with — so be generous, especially on responsibilities
          and tech stack.
        </p>
      </div>

      <BuildResumeForm
        defaultName={auth.user.name}
        defaultEmail={auth.user.email}
      />
    </div>
  )
}
