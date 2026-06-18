"use client"

import { useEffect } from "react"

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error("Global error boundary:", error)
  }, [error])

  return (
    // global-error must include html and body tags - it replaces the root layout when active.
    <html lang="en">
      <body
        style={{
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f172a",
          color: "#e2e8f0",
          padding: "24px",
        }}
      >
        <div
          style={{
            maxWidth: 480,
            width: "100%",
            background: "#111827",
            borderRadius: 16,
            padding: 32,
            border: "1px solid #1f2937",
            boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
          }}
        >
          <h1 style={{ fontSize: 24, margin: 0, marginBottom: 12 }}>Something went wrong</h1>
          <p style={{ fontSize: 14, lineHeight: 1.5, opacity: 0.8, margin: 0, marginBottom: 20 }}>
            We hit an unexpected error while rendering this page. Try again or return home.
          </p>
          {error.digest && (
            <p style={{ fontSize: 12, opacity: 0.6, margin: 0, marginBottom: 20 }}>
              Error ID: {error.digest}
            </p>
          )}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => unstable_retry()}
              style={{
                appearance: "none",
                border: "none",
                cursor: "pointer",
                background: "#6366f1",
                color: "white",
                padding: "10px 18px",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Try again
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- global-error replaces the root layout; next/link is not available here. */}
            <a
              href="/"
              style={{
                background: "transparent",
                color: "#cbd5e1",
                padding: "10px 18px",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
                border: "1px solid #1f2937",
              }}
            >
              Go home
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
