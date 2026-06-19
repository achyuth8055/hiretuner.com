"use client"

import { useState } from "react"
import { getFirebaseAuth, isFirebaseClientEnabled } from "@/lib/firebase-client"

export function LogoutButton({ className }: { className?: string }) {
  const [loading, setLoading] = useState(false)

  async function logout() {
    setLoading(true)
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch {
      /* still try Firebase signOut even if our backend is unreachable */
    }
    // Also sign out of Firebase so the next "Continue with Google" click shows
    // the account chooser instead of silently re-signing the previous user in.
    if (isFirebaseClientEnabled()) {
      try {
        const auth = getFirebaseAuth()
        if (auth) {
          const { signOut: firebaseSignOut } = await import("firebase/auth")
          await firebaseSignOut(auth)
        }
      } catch {
        /* non-fatal - backend cookie is already cleared above */
      }
    }
    window.location.href = "/login"
  }

  return (
    <button className={className} onClick={logout} disabled={loading}>
      <span className="material-symbols-outlined">logout</span>
      {loading ? "Logging out..." : "Log Out"}
    </button>
  )
}
