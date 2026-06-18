import { NextResponse } from "next/server"

export const runtime = "nodejs"

/**
 * Legacy stub kept for backwards-compatibility with any link still pointing
 * at /api/auth/google. The real Google sign-in happens client-side via
 * GoogleSignInButton (Firebase signInWithPopup → /api/auth/firebase).
 *
 * Redirects the user to /login where the new button lives.
 */
export function GET(request: Request) {
  const url = new URL(request.url)
  return NextResponse.redirect(new URL("/login?provider=google", url.origin), { status: 302 })
}
