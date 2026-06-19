/**
 * Tiny telemetry beacon. Fires `POST /api/telemetry` with a one-shot fetch.
 * No retries — the beacon is best-effort and must never block UX. Failure is
 * swallowed silently.
 */

const VERSION = chrome.runtime?.getManifest?.()?.version ?? "0.0.0"

type Kind = "extraction_failed" | "api_error" | "unhandled" | "navigation_error"

async function getApiUrl(): Promise<string> {
  try {
    const stored = await chrome.storage.sync.get(["apiUrl"])
    return ((stored.apiUrl as string | undefined) || "https://hiretuner.com").replace(/\/$/, "")
  } catch {
    return "https://hiretuner.com"
  }
}

export async function reportTelemetry(kind: Kind, message: string, meta?: Record<string, unknown>) {
  try {
    const apiUrl = await getApiUrl()
    const host = typeof window !== "undefined" ? window.location?.host ?? "" : ""
    const body = JSON.stringify({
      source: "extension",
      kind,
      host,
      message: message.slice(0, 500),
      version: VERSION,
      meta,
    })
    // Keep credentials omitted so the cross-origin CORS preflight is simple.
    await fetch(`${apiUrl}/api/telemetry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      // Best-effort fire-and-forget — never block the UI.
      keepalive: true,
    })
  } catch {
    // Telemetry must not throw into product code.
  }
}
