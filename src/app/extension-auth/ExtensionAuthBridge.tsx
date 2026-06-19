"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { signInWithPopup } from "firebase/auth"
import { Button } from "@/components/ui/Button"
import {
  buildGoogleProvider,
  getFirebaseAuth,
  isFirebaseClientEnabled,
} from "@/lib/firebase-client"

/**
 * Bridge page for the Chrome extension. The extension opens this page via
 * chrome.identity.launchWebAuthFlow with a `redirect` query param set to its
 * `chromiumapp.org` callback URL. When the user finishes Firebase popup
 * sign-in here, we navigate the window to `<redirect>#idToken=...&email=...`
 * - chrome.identity intercepts that URL and hands it back to the extension.
 *
 * Using a bridge avoids requiring a separate Chrome App OAuth client; the
 * existing Firebase Web SDK + Authorized Domains setup is enough.
 */
type Phase = "ready" | "configuring" | "signing-in" | "complete" | "error"

function computeInitial(redirect: string): { safeRedirect: string | null; phase: Phase; error: string } {
  let safeRedirect: string | null = null
  if (redirect) {
    try {
      const url = new URL(redirect)
      // Accept only chrome.identity callback URLs.
      if (url.protocol === "https:" && url.host.endsWith(".chromiumapp.org")) {
        safeRedirect = redirect
      }
    } catch {
      /* fall-through */
    }
  }
  if (!safeRedirect) {
    return {
      safeRedirect: null,
      phase: "error",
      error: redirect
        ? "Invalid redirect URL. This page only accepts chrome-extension callbacks (chromiumapp.org)."
        : "Missing redirect parameter. Open this page from the HireTuner Chrome extension.",
    }
  }
  if (!isFirebaseClientEnabled()) {
    return {
      safeRedirect,
      phase: "configuring",
      error: "Firebase is not configured on this deployment yet. Set NEXT_PUBLIC_FIREBASE_* env vars.",
    }
  }
  return { safeRedirect, phase: "ready", error: "" }
}

export function ExtensionAuthBridge() {
  const params = useSearchParams()
  const redirect = params.get("redirect") || ""

  // Initialize state from props/URL synchronously so we never call setState
  // inside an effect just to derive initial state (react-hooks/set-state-in-effect).
  const initial = computeInitial(redirect)
  const safeRedirect = initial.safeRedirect

  const [phase, setPhase] = useState<Phase>(initial.phase)
  const [error, setError] = useState(initial.error)
  const [user, setUser] = useState<{ email: string; name: string } | null>(null)

  async function handleSignIn() {
    if (!safeRedirect) return
    setError("")
    setPhase("signing-in")
    try {
      const auth = getFirebaseAuth()
      if (!auth) throw new Error("Firebase Auth could not initialize.")
      const provider = buildGoogleProvider()
      const credential = await signInWithPopup(auth, provider)
      const idToken = await credential.user.getIdToken()
      const email = credential.user.email ?? ""
      const name = credential.user.displayName ?? ""

      // Also tell the HireTuner server so a session cookie is minted on the
      // browser - useful if the user opens hiretuner.com in another tab next.
      try {
        await fetch("/api/auth/firebase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        })
      } catch {
        /* extension still works without the cookie */
      }

      setUser({ email, name })
      setPhase("complete")

      const target = new URL(safeRedirect)
      const hash = new URLSearchParams()
      hash.set("idToken", idToken)
      hash.set("email", email)
      hash.set("name", name)
      // Return the actual Firebase UID so the extension stops using `email`
      // as a stand-in `firebaseUid` (EXT-E17).
      if (credential.user.uid) hash.set("uid", credential.user.uid)
      target.hash = hash.toString()
      // Brief delay so the user sees confirmation before the popup closes.
      setTimeout(() => {
        window.location.href = target.toString()
      }, 800)
    } catch (reason) {
      setPhase("error")
      setError(reason instanceof Error ? reason.message : "Sign-in failed.")
    }
  }

  return (
    <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant/50 rounded-lg p-stack-lg shadow-sm">
      <h1 className="font-headline-md text-headline-md text-primary mb-2">
        Connect HireTuner Extension
      </h1>
      <p className="font-body-sm text-body-sm text-on-surface-variant mb-stack-md">
        Sign in once and the Chrome extension will use your account on every job site you visit.
      </p>

      {phase === "complete" ? (
        <div className="rounded border border-[#10B981]/30 bg-[#10B981]/5 p-4 text-body-sm text-primary">
          <strong>Connected.</strong> Returning you to the extension…
          {user && (
            <div className="text-xs text-on-surface-variant mt-1">
              Signed in as {user.name || user.email}
            </div>
          )}
        </div>
      ) : phase === "error" || phase === "configuring" ? (
        <div className="rounded border border-error/30 bg-error/5 p-3 text-body-sm text-error">
          {error}
        </div>
      ) : (
        <Button
          className="w-full gap-2"
          onClick={handleSignIn}
          disabled={phase === "signing-in" || !safeRedirect}
        >
          <svg aria-hidden="true" viewBox="0 0 18 18" width="16" height="16">
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
          {phase === "signing-in" ? "Opening Google…" : "Continue with Google"}
        </Button>
      )}
    </div>
  )
}
