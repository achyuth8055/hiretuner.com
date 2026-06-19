import "server-only"

type Level = "info" | "warn" | "error" | "debug"

const isProd = process.env.NODE_ENV === "production"

// PII redaction. In production the logger replaces values for these meta keys
// with a short hash so log search still groups by user but the raw PII never
// hits Railway's log store. Set `LOG_REDACT_PII=0` to opt out (e.g. for an
// incident investigation), and set `LOG_REDACT_PII=1` outside production to
// rehearse the behavior.
const PII_KEYS = new Set(["email", "userId", "metadataUserId", "recordUserId", "uid"])

function redactPiiEnabled() {
  if (process.env.LOG_REDACT_PII === "1") return true
  if (process.env.LOG_REDACT_PII === "0") return false
  return isProd
}

function shortHash(value: string): string {
  // Cheap non-crypto djb2-style hash, base36 — small enough to fit log lines
  // but stable across processes so the same user gets the same token.
  let hash = 5381
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) + hash + value.charCodeAt(i)) | 0
  }
  return `redacted:${(hash >>> 0).toString(36).slice(0, 8)}`
}

function redactMeta(meta: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(meta)) {
    if (PII_KEYS.has(key) && typeof value === "string" && value.length > 0) {
      out[key] = shortHash(value)
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = redactMeta(value as Record<string, unknown>)
    } else {
      out[key] = value
    }
  }
  return out
}

function emit(level: Level, scope: string, message: string, meta?: Record<string, unknown>) {
  if (level === "debug" && isProd) return

  const safeMeta = meta && redactPiiEnabled() ? redactMeta(meta) : meta
  const payload = {
    ts: new Date().toISOString(),
    level,
    scope,
    message,
    ...(safeMeta ?? {}),
  }

  const serialized = JSON.stringify(payload)

  if (level === "error") {
    console.error(serialized)
  } else if (level === "warn") {
    console.warn(serialized)
  } else {
    console.log(serialized)
  }
}

export const logger = {
  info: (scope: string, message: string, meta?: Record<string, unknown>) =>
    emit("info", scope, message, meta),
  warn: (scope: string, message: string, meta?: Record<string, unknown>) =>
    emit("warn", scope, message, meta),
  error: (scope: string, message: string, meta?: Record<string, unknown>) =>
    emit("error", scope, message, meta),
  debug: (scope: string, message: string, meta?: Record<string, unknown>) =>
    emit("debug", scope, message, meta),
}
