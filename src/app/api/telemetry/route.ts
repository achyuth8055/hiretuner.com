import type { NextRequest } from "next/server"
import { jsonError, jsonOk, readJson } from "@/lib/http"
import { logger } from "@/lib/logger"
import { ipFromRequest, rateLimit, rateLimitedResponse } from "@/lib/rate-limit"

export const runtime = "nodejs"

// Lightweight telemetry beacon. Both the website error boundary and the
// Chrome extension POST to this route when something user-affecting goes
// wrong. We deliberately don't accept anything sensitive: just an event kind,
// the hostname / page where it happened, a short message, and the client
// version. The server-side logger emits a structured `telemetry.client`
// record that operators can grep for in Railway logs.
//
// No auth — by design. The extension may not be signed in when extraction
// breaks, and the website error boundary may fire before auth resolves.
// Rate limiting is per-IP so an attacker can't flood logs.
const TELEMETRY_PER_IP_LIMIT = 60
const TELEMETRY_PER_IP_WINDOW_SEC = 60

const ALLOWED_SOURCES = new Set(["extension", "web"])
const ALLOWED_KINDS = new Set([
  "extraction_failed",
  "api_error",
  "unhandled",
  "navigation_error",
])

type TelemetryBody = {
  source?: string
  kind?: string
  host?: string
  message?: string
  version?: string
  meta?: Record<string, unknown>
}

function cap(value: string | undefined, max: number) {
  if (typeof value !== "string") return ""
  return value.slice(0, max)
}

export function OPTIONS() {
  // The extension calls us cross-origin; allow it explicitly.
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  })
}

export async function POST(request: NextRequest) {
  const ip = ipFromRequest(request)
  const gate = rateLimit(`telemetry:${ip}`, TELEMETRY_PER_IP_LIMIT, TELEMETRY_PER_IP_WINDOW_SEC)
  if (!gate.ok) {
    return rateLimitedResponse(gate, "Telemetry rate limit reached.")
  }

  const body = await readJson<TelemetryBody>(request)
  const source = cap(body?.source, 16)
  const kind = cap(body?.kind, 32)
  if (!ALLOWED_SOURCES.has(source) || !ALLOWED_KINDS.has(kind)) {
    return jsonError("Unknown telemetry source or kind.", 422, "validation_error")
  }

  logger.info("telemetry.client", "Client telemetry beacon", {
    source,
    kind,
    host: cap(body?.host, 200),
    message: cap(body?.message, 500),
    version: cap(body?.version, 32),
    userAgent: cap(request.headers.get("user-agent") ?? "", 200),
    ip,
    meta: body?.meta && typeof body.meta === "object" ? body.meta : undefined,
  })

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  })
}

// jsonOk is unused — manual response above so we can return CORS headers
// inline. Keeping the import for jsonError above.
void jsonOk
