/**
 * Single source of truth for debug-mode logging in the extension.
 *
 * Set `debug=true` in chrome.storage.sync (via Options page) to see internal
 * traces in the user's devtools console. By default the extension is silent
 * in production — see EXT-E30 in EXTENSION_E2E_BUGS.md.
 *
 * We cache the value for 10 s rather than reading sync storage on every log
 * call. That's the trade-off: a toggle takes effect within 10 s, which is
 * fine because debug is rarely used in production.
 */

let cached: { value: boolean; readAt: number } | null = null
const CACHE_TTL_MS = 10_000

async function readDebugFlag(): Promise<boolean> {
  // chrome.storage.sync may be unavailable in unit tests; bail safely.
  if (typeof chrome === 'undefined' || !chrome.storage?.sync) return false
  try {
    const stored = await chrome.storage.sync.get(['debug'])
    return Boolean(stored.debug)
  } catch {
    return false
  }
}

export async function isDebug(): Promise<boolean> {
  const now = Date.now()
  if (cached && now - cached.readAt < CACHE_TTL_MS) return cached.value
  const value = await readDebugFlag()
  cached = { value, readAt: now }
  return value
}

export async function dlog(scope: string, message: string, meta?: unknown) {
  if (await isDebug()) {
    if (meta !== undefined) {
      // eslint-disable-next-line no-console
      console.log(`[${scope}] ${message}`, meta)
    } else {
      // eslint-disable-next-line no-console
      console.log(`[${scope}] ${message}`)
    }
  }
}

export async function dwarn(scope: string, message: string, meta?: unknown) {
  if (await isDebug()) {
    // eslint-disable-next-line no-console
    console.warn(`[${scope}] ${message}`, meta)
  }
}
