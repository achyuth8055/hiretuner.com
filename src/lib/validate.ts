import "server-only"

/**
 * Lightweight validation helpers - used by API routes to validate request
 * bodies without pulling in a full schema library. Each helper returns either
 * the cleaned value or an Error with a human-friendly message.
 */

export type FieldError = { field: string; message: string }

export class ValidationFailed extends Error {
  readonly errors: FieldError[]
  constructor(errors: FieldError[]) {
    super(errors.map((error) => `${error.field}: ${error.message}`).join("; "))
    this.errors = errors
    this.name = "ValidationFailed"
  }
}

export function requireString(
  field: string,
  value: unknown,
  options: { min?: number; max?: number; trim?: boolean } = {}
) {
  if (typeof value !== "string") throw new ValidationFailed([{ field, message: "must be a string" }])
  const cleaned = options.trim === false ? value : value.trim()
  if (options.min !== undefined && cleaned.length < options.min) {
    throw new ValidationFailed([
      { field, message: `must be at least ${options.min} characters` },
    ])
  }
  if (options.max !== undefined && cleaned.length > options.max) {
    throw new ValidationFailed([{ field, message: `must be at most ${options.max} characters` }])
  }
  return cleaned
}

export function optionalString(
  field: string,
  value: unknown,
  options: { max?: number; trim?: boolean } = {}
) {
  if (value === undefined || value === null || value === "") return ""
  return requireString(field, value, { ...options, min: 0 })
}

export function optionalStringArray(field: string, value: unknown, maxLen = 100) {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value))
    throw new ValidationFailed([{ field, message: "must be an array of strings" }])
  if (value.length > maxLen)
    throw new ValidationFailed([{ field, message: `must contain at most ${maxLen} entries` }])
  return value.map((entry, index) => requireString(`${field}[${index}]`, entry, { max: 500 }))
}

export function enumValue<T extends string>(
  field: string,
  value: unknown,
  allowed: readonly T[]
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new ValidationFailed([
      { field, message: `must be one of: ${allowed.join(", ")}` },
    ])
  }
  return value as T
}
