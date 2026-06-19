"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { GoogleSignInButton } from "@/components/app/GoogleSignInButton"
import { PRICING_INTENT_KEY } from "@/components/app/PricingCTA"

type AuthFormProps = {
  mode: "login" | "signup" | "reset"
}

type ApiError = {
  error?: {
    message?: string
    details?: unknown
  }
}

export function AuthForm({ mode }: AuthFormProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const isSignup = mode === "signup"
  const isReset = mode === "reset"

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError("")
    setMessage("")

    const endpoint = isReset ? "/api/auth/reset-password" : isSignup ? "/api/auth/signup" : "/api/auth/login"
    const payload = isReset ? { email } : isSignup ? { name, email, password } : { email, password }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = (await response.json()) as ApiError & {
        ok?: boolean
        data?: { message?: string; resetToken?: string }
      }

      if (!response.ok || !json.ok) {
        throw new Error(json.error?.message ?? "Something went wrong.")
      }

      if (isReset) {
        setMessage(
          json.data?.resetToken
            ? `${json.data.message} Dev reset token: ${json.data.resetToken}`
            : json.data?.message ?? "Reset instructions sent if the account exists."
        )
        return
      }

      // If the user arrived via a pricing CTA, honor the stored upgrade intent
      // by kicking off Stripe checkout immediately rather than dumping them on
      // the dashboard with no follow-up action.
      const intentRaw =
        typeof window !== "undefined" ? window.sessionStorage.getItem(PRICING_INTENT_KEY) : null
      if (intentRaw) {
        window.sessionStorage.removeItem(PRICING_INTENT_KEY)
        try {
          const intent = JSON.parse(intentRaw) as {
            interval?: "monthly" | "yearly"
            plan?: "starter" | "pro"
          }
          const interval = intent.interval === "yearly" ? "yearly" : "monthly"
          const plan = intent.plan === "pro" ? "pro" : "starter"
          const checkout = await fetch("/api/billing/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plan, interval }),
          })
          const checkoutJson = (await checkout.json()) as {
            ok?: boolean
            data?: { checkoutUrl?: string }
            error?: { message?: string }
          }
          if (checkout.ok && checkoutJson.ok && checkoutJson.data?.checkoutUrl) {
            window.location.href = checkoutJson.data.checkoutUrl
            return
          }
          // Stripe not configured (or any other error) - fall through to dashboard
          // and surface the message so the user understands why no redirect happened.
          if (checkoutJson.error?.message) {
            setMessage(checkoutJson.error.message)
            setTimeout(() => {
              window.location.href = "/dashboard?upgrade=pending"
            }, 1500)
            return
          }
        } catch {
          // Ignore malformed intent and proceed to dashboard.
        }
      }

      window.location.href = "/dashboard"
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant/50 rounded-lg p-stack-lg shadow-sm">
      <div className="mb-stack-lg">
        <h1 className="font-headline-md text-headline-md text-primary">
          {isReset ? "Reset your password" : isSignup ? "Create your free account" : "Log in to HireTuner"}
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
          {isReset
            ? "Enter your email and we will create a reset token when email is configured."
            : "Upload your resume, analyze jobs, and track applications from one workspace."}
        </p>
      </div>

      <form className="space-y-4" onSubmit={submit}>
        {isSignup && (
          <div>
            <label className="font-label-uppercase text-label-uppercase text-on-surface-variant mb-1 block">
              Name
            </label>
            <Input value={name} onChange={(event) => setName(event.target.value)} required />
          </div>
        )}

        <div>
          <label className="font-label-uppercase text-label-uppercase text-on-surface-variant mb-1 block">
            Email
          </label>
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        {!isReset && (
          <div>
            <label className="font-label-uppercase text-label-uppercase text-on-surface-variant mb-1 block">
              Password
            </label>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
            />
          </div>
        )}

        {error && (
          <div className="rounded border border-error/30 bg-error/5 p-3 text-body-sm text-error" role="alert">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded border border-[#10B981]/30 bg-[#10B981]/5 p-3 text-body-sm text-primary">
            {message}
          </div>
        )}

        <Button className="w-full" disabled={loading} type="submit">
          {loading ? "Please wait..." : isReset ? "Send reset instructions" : isSignup ? "Create Account" : "Log In"}
        </Button>
      </form>

      {!isReset && (
        <div className="mt-stack-md border-t border-outline-variant/30 pt-stack-md">
          <GoogleSignInButton />
        </div>
      )}

      <div className="mt-stack-md text-body-sm text-on-surface-variant">
        {isReset ? (
          <Link className="text-secondary hover:underline" href="/login">
            Back to login
          </Link>
        ) : isSignup ? (
          <>
            Already have an account?{" "}
            <Link className="text-secondary hover:underline" href="/login">
              Log in
            </Link>
          </>
        ) : (
          <div className="flex justify-between gap-3">
            <Link className="text-secondary hover:underline" href="/signup">
              Create account
            </Link>
            <Link className="text-secondary hover:underline" href="/reset-password">
              Forgot password?
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
