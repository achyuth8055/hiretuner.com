import "server-only"

import { logger } from "@/lib/logger"

/**
 * Tiny email-send wrapper.
 *
 * Provider: Resend (https://resend.com). Free tier: 100/day, 3k/month.
 * Selected for the fastest onboarding among transactional providers — sign up,
 * verify a sending domain, paste the API key into Railway as `RESEND_API_KEY`,
 * done.
 *
 * IMPORTANT: this module deliberately does NOT `import "resend"` at module
 * load. We dynamically import inside the send function so the rest of the
 * server doesn't pay the bundle cost if email is never sent, AND so the
 * application boots cleanly when the operator hasn't installed the package
 * yet (the Sprint 1 deploy may land before `npm install resend` is run on the
 * server image). When the package is missing OR the API key is unset, we log
 * a warning and skip sending. The route still returns the privacy-preserving
 * generic message; no leakage of "we did/didn't send to you".
 */

const FROM_DEFAULT = "HireTuner <support@hiretuner.com>"

function isConfigured() {
  return Boolean(process.env.RESEND_API_KEY) && !process.env.RESEND_API_KEY?.includes("replace")
}

export function isEmailEnabled() {
  return isConfigured()
}

type SendOptions = {
  to: string
  subject: string
  html: string
  text?: string
}

async function send(options: SendOptions): Promise<{ ok: boolean; error?: string }> {
  if (!isConfigured()) {
    logger.warn("lib.email", "Email provider not configured (RESEND_API_KEY missing) — message not sent", {
      to: options.to,
      subject: options.subject,
    })
    return { ok: false, error: "email_not_configured" }
  }
  try {
    // Dynamic import keeps boot fast and lets the server start before the npm
    // package is installed. Wrap the import error so a missing package looks
    // the same as a missing key from the caller's perspective.
    let ResendCtor: { new (key: string): { emails: { send: (args: unknown) => Promise<unknown> } } }
    try {
      // Defeat TypeScript / bundler resolution of an optional npm package —
      // `resend` may not be installed yet on the deploy that lands this code.
      // The runtime string specifier prevents the compiler from inlining the
      // import; the catch block below handles a missing package at runtime.
      const moduleName = "resend"
      const mod = (await import(/* webpackIgnore: true */ moduleName)) as {
        Resend: typeof ResendCtor
      }
      ResendCtor = mod.Resend
    } catch (importError) {
      logger.warn(
        "lib.email",
        "`resend` package is not installed — run `npm install resend`. Message not sent.",
        { to: options.to, error: importError instanceof Error ? importError.message : String(importError) },
      )
      return { ok: false, error: "email_package_missing" }
    }
    const client = new ResendCtor(process.env.RESEND_API_KEY!)
    await client.emails.send({
      from: process.env.EMAIL_FROM || FROM_DEFAULT,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    })
    return { ok: true }
  } catch (error) {
    logger.error("lib.email", "Email send failed", {
      to: options.to,
      subject: options.subject,
      error: error instanceof Error ? error.message : String(error),
    })
    return { ok: false, error: "send_failed" }
  }
}

function appBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://hiretuner.com").replace(/\/$/, "")
}

/**
 * Send the email-verification link to a brand-new account.
 */
export async function sendVerificationEmail(to: string, name: string, token: string) {
  const link = `${appBaseUrl()}/verify-email?token=${encodeURIComponent(token)}`
  const subject = "Verify your HireTuner email"
  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
      <h1 style="font-size: 18px; color: #111;">Welcome to HireTuner, ${escapeHtml(name)}!</h1>
      <p style="font-size: 14px; color: #444; line-height: 1.5;">
        Confirm your email address so we can keep your account secure and let you upgrade to a paid plan when you're ready.
      </p>
      <p style="margin: 24px 0;">
        <a href="${link}" style="display: inline-block; background: #111; color: #fff; padding: 10px 16px; border-radius: 6px; text-decoration: none; font-size: 14px;">
          Verify my email
        </a>
      </p>
      <p style="font-size: 12px; color: #777; line-height: 1.5;">
        This link expires in 48 hours. You can still use the free tier without verifying, but the Starter (paid) tier requires it.
      </p>
      <p style="font-size: 12px; color: #777; line-height: 1.5; word-break: break-all;">
        Or paste this link into your browser: ${link}
      </p>
    </div>
  `.trim()
  const text = `Welcome to HireTuner, ${name}!\n\nVerify your email: ${link}\n\nThis link expires in 48 hours.\n`
  return send({ to, subject, html, text })
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/**
 * Send the password-reset link to a user. Returns the send result so the
 * caller can decide whether to dev-echo the token. The route still must NOT
 * differentiate response shape between "found user" vs "not found".
 */
export async function sendPasswordResetEmail(to: string, token: string) {
  const link = `${appBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`
  const subject = "Reset your HireTuner password"
  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
      <h1 style="font-size: 18px; color: #111;">Reset your HireTuner password</h1>
      <p style="font-size: 14px; color: #444; line-height: 1.5;">
        Someone (hopefully you) asked to reset the password for the HireTuner account associated with this email address.
      </p>
      <p style="margin: 24px 0;">
        <a href="${link}" style="display: inline-block; background: #111; color: #fff; padding: 10px 16px; border-radius: 6px; text-decoration: none; font-size: 14px;">
          Reset your password
        </a>
      </p>
      <p style="font-size: 12px; color: #777; line-height: 1.5;">
        This link expires in 30 minutes. If you didn't request a reset, you can ignore this email — your password won't change.
      </p>
      <p style="font-size: 12px; color: #777; line-height: 1.5; word-break: break-all;">
        Or paste this link into your browser: ${link}
      </p>
    </div>
  `.trim()
  const text = `Reset your HireTuner password: ${link}\n\nThis link expires in 30 minutes. If you didn't request a reset, you can ignore this email.\n`
  return send({ to, subject, html, text })
}
