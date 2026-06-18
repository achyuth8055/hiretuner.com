import { Suspense } from "react"
import { ExtensionAuthBridge } from "./ExtensionAuthBridge"

export const metadata = {
  title: "Sign in to HireTuner — Extension",
  description: "Sign in to your HireTuner account so the Chrome extension can use your plan.",
  robots: { index: false, follow: false },
}

export default function ExtensionAuthPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-surface">
      <Suspense
        fallback={
          <div className="text-on-surface-variant text-body-sm">Loading sign-in…</div>
        }
      >
        <ExtensionAuthBridge />
      </Suspense>
    </main>
  )
}
