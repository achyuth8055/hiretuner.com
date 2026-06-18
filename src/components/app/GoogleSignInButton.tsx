"use client"

import { useState } from "react"
import { signInWithPopup } from "firebase/auth"
import { Button } from "@/components/ui/Button"
import {
  buildGoogleProvider,
  getFirebaseAuth,
  isFirebaseClientEnabled,
} from "@/lib/firebase-client"
import { PRICING_INTENT_KEY } from "@/components/app/PricingCTA"

/**
 * Continue-with-Google flow:
 *  1. Firebase signInWithPopup → ID token
 *  2. POST /api/auth/firebase with the ID token → server mints our session cookie
 *  3. Honor any pending upgrade intent, otherwise route to /dashboard
 */
export function GoogleSignInButton({ className }: { className?: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSignIn() {
    setError("")
    setLoading(true)
    try {
      if (!isFirebaseClientEnabled()) {
        throw new Error(
          "Google sign-in is not configured. Add NEXT_PUBLIC_FIREBASE_* keys to .env.",
        )
      }
      const auth = getFirebaseAuth()
      if (!auth) throw new Error("Firebase Auth could not initialize.")

      const provider = buildGoogleProvider()
      const credential = await signInWithPopup(auth, provider)
      const idToken = await credential.user.getIdToken()

      const response = await fetch("/api/auth/firebase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      })
      const json = (await response.json()) as {
        ok?: boolean
        error?: { message?: string }
      }
      if (!response.ok || !json.ok) {
        throw new Error(json.error?.message ?? "Could not sign in with Google.")
      }

      // Honor pending upgrade intent if it was set by a pricing CTA.
      const intentRaw =
        typeof window !== "undefined"
          ? window.sessionStorage.getItem(PRICING_INTENT_KEY)
          : null
      if (intentRaw) {
        window.sessionStorage.removeItem(PRICING_INTENT_KEY)
        try {
          const intent = JSON.parse(intentRaw) as { interval?: "monthly" | "yearly" }
          const interval = intent.interval === "yearly" ? "yearly" : "monthly"
          const checkout = await fetch("/api/billing/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ interval }),
          })
          const checkoutJson = (await checkout.json()) as {
            ok?: boolean
            data?: { checkoutUrl?: string }
          }
          if (checkout.ok && checkoutJson.ok && checkoutJson.data?.checkoutUrl) {
            window.location.href = checkoutJson.data.checkoutUrl
            return
          }
        } catch {
          /* fall through to dashboard */
        }
      }

      window.location.href = "/dashboard"
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sign-in failed.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={className}>
      <Button
        className="w-full gap-2"
        variant="outline"
        onClick={handleSignIn}
        disabled={loading}
        type="button"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 18 18"
          width="16"
          height="16"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
            fill="#4285F4"
          />
          <path
            d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.583-5.036-3.71H.96v2.332A8.997 8.997 0 0 0 9 18z"
            fill="#34A853"
          />
          <path
            d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.96A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.96 4.039l3.004-2.332z"
            fill="#FBBC05"
          />
          <path
            d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .96 4.961L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
            fill="#EA4335"
          />
        </svg>
        {loading ? "Signing in…" : "Continue with Google"}
      </Button>
      {error && <p className="text-xs text-error mt-2">{error}</p>}
    </div>
  )
}
