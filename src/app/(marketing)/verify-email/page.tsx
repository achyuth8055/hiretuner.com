import Link from "next/link"
import { VerifyEmailClient } from "./VerifyEmailClient"

export const metadata = {
  title: "Verify Email - HireTuner",
  description: "Confirm your HireTuner email address.",
  robots: { index: false, follow: false },
}

type Props = {
  searchParams: Promise<{ token?: string }>
}

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { token } = await searchParams
  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant/50 rounded-lg p-stack-lg shadow-sm">
        <h1 className="font-headline-md text-headline-md text-primary mb-2">
          Verify your email
        </h1>
        {!token ? (
          <>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-stack-md">
              Use the link in the verification email we sent. If you can&apos;t find it, check
              spam - or sign in and resend from{" "}
              <Link href="/dashboard/settings" className="text-secondary underline">
                Settings
              </Link>
              .
            </p>
            <Link
              href="/login"
              className="inline-block bg-primary text-on-primary px-4 py-2 rounded font-body-sm text-body-sm"
            >
              Back to sign in
            </Link>
          </>
        ) : (
          <VerifyEmailClient token={token} />
        )}
      </div>
    </main>
  )
}
