import "server-only"

type Level = "info" | "warn" | "error" | "debug"

const isProd = process.env.NODE_ENV === "production"

function emit(level: Level, scope: string, message: string, meta?: Record<string, unknown>) {
  if (level === "debug" && isProd) return

  const payload = {
    ts: new Date().toISOString(),
    level,
    scope,
    message,
    ...(meta ?? {}),
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
