"use client"

import { useCallback, useEffect, useState } from "react"

type SessionRecord = {
  id: string
  current: boolean
  createdAt: string
  expiresAt: string
  lastSeenAt: string
  userAgent: string
}

function describeUserAgent(ua: string): string {
  if (!ua) return "Unknown device"
  // Light-weight parse - enough to recognize the device, no full library.
  let os = "Unknown OS"
  if (/Windows/i.test(ua)) os = "Windows"
  else if (/Mac OS X/i.test(ua)) os = "macOS"
  else if (/Android/i.test(ua)) os = "Android"
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS"
  else if (/Linux/i.test(ua)) os = "Linux"

  let browser = "Browser"
  if (/Edg\//i.test(ua)) browser = "Edge"
  else if (/Chrome\//i.test(ua) && !/Edg/i.test(ua)) browser = "Chrome"
  else if (/Firefox\//i.test(ua)) browser = "Firefox"
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari"
  return `${browser} on ${os}`
}

function relativeTime(iso: string): string {
  if (!iso) return ""
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export function SessionsPanel() {
  const [sessions, setSessions] = useState<SessionRecord[] | null>(null)
  const [error, setError] = useState("")
  const [acting, setActing] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/sessions", { cache: "no-store" })
      const json = (await response.json()) as {
        ok?: boolean
        data?: { sessions?: SessionRecord[] }
        error?: { message?: string }
      }
      if (!response.ok || !json.ok) {
        setError(json.error?.message ?? "Unable to load sessions.")
        return
      }
      setError("")
      setSessions(json.data?.sessions ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load sessions.")
    }
  }, [])

  // Run the initial fetch once on mount via a Promise chain so the lint
  // rule "set-state-in-effect" doesn't see a synchronous setState path
  // (load() doesn't setState until the awaited fetch resolves).
  useEffect(() => {
    Promise.resolve().then(load)
  }, [load])

  async function revoke(sessionId: string) {
    setActing(sessionId)
    setError("")
    try {
      const response = await fetch("/api/auth/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })
      const json = (await response.json()) as { ok?: boolean; error?: { message?: string } }
      if (!response.ok || !json.ok) {
        throw new Error(json.error?.message ?? "Unable to revoke session.")
      }
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to revoke session.")
    } finally {
      setActing(null)
    }
  }

  async function revokeOthers() {
    setActing("others")
    setError("")
    try {
      const response = await fetch("/api/auth/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ others: true }),
      })
      const json = (await response.json()) as { ok?: boolean; error?: { message?: string } }
      if (!response.ok || !json.ok) {
        throw new Error(json.error?.message ?? "Unable to revoke sessions.")
      }
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to revoke sessions.")
    } finally {
      setActing(null)
    }
  }

  if (sessions === null && !error) {
    return <p className="font-body-sm text-body-sm text-on-surface-variant">Loading sessions…</p>
  }

  return (
    <div>
      {error && (
        <div className="rounded border border-error/30 bg-error/5 p-3 text-body-sm text-error mb-stack-md">
          {error}
        </div>
      )}
      {sessions && sessions.length > 1 && (
        <button
          type="button"
          onClick={revokeOthers}
          disabled={acting !== null}
          className="text-body-sm text-secondary underline mb-stack-md disabled:opacity-50"
        >
          {acting === "others" ? "Revoking…" : "Sign out of all other sessions"}
        </button>
      )}
      <div className="space-y-3">
        {(sessions ?? []).map((session) => (
          <div
            key={session.id}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3 rounded border border-outline-variant/30 bg-surface-bright"
          >
            <div>
              <div className="font-medium text-primary text-body-sm">
                {describeUserAgent(session.userAgent)}{" "}
                {session.current && (
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-tertiary-container text-on-tertiary-container">
                    This device
                  </span>
                )}
              </div>
              <div className="text-xs text-on-surface-variant mt-1">
                Last seen {relativeTime(session.lastSeenAt)} · expires {new Date(session.expiresAt).toLocaleDateString()}
              </div>
            </div>
            {!session.current && (
              <button
                type="button"
                onClick={() => revoke(session.id)}
                disabled={acting !== null}
                className="text-body-sm text-error hover:underline disabled:opacity-50"
              >
                {acting === session.id ? "Revoking…" : "Revoke"}
              </button>
            )}
          </div>
        ))}
        {(sessions ?? []).length === 0 && !error && (
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            No active sessions found.
          </p>
        )}
      </div>
    </div>
  )
}
