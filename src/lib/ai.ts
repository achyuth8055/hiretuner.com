import "server-only"

import { logger } from "@/lib/logger"

/**
 * Provider-agnostic chat completion helper.
 *
 * DeepSeek is the PRIMARY provider; OpenAI is the FALLBACK. Both expose an
 * OpenAI-compatible `/chat/completions` endpoint, so a single request shape
 * works for both. If the primary errors or has no API key, we transparently
 * fall back to the next provider in order.
 *
 * All providers are configured via env vars (see .env.example). Nothing here
 * runs unless at least one API key is set, so the app keeps working with its
 * deterministic engine until you opt in.
 */

export type ChatRole = "system" | "user" | "assistant"
export type ChatMessage = { role: ChatRole; content: string }

export type ChatOptions = {
  messages: ChatMessage[]
  /** Sampling temperature. Defaults to 0.2 for stable, deterministic-ish output. */
  temperature?: number
  /** Max tokens to generate. */
  maxTokens?: number
  /** Ask the model to return a JSON object (response_format: json_object). */
  json?: boolean
  /** Per-request timeout in ms. Defaults to AI_TIMEOUT_MS or 30s. */
  timeoutMs?: number
}

export type ChatResult = {
  content: string
  /** Which provider actually produced the result ("deepseek" | "openai"). */
  provider: string
  model: string
}

type Provider = {
  name: string
  apiKey: string | undefined
  /** Base URL including any version prefix; "/chat/completions" is appended. */
  baseUrl: string
  model: string
}

function getProviders(): Provider[] {
  // Order defines priority: DeepSeek first (primary), OpenAI second (fallback).
  return [
    {
      name: "deepseek",
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseUrl: (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, ""),
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
    },
    {
      name: "openai",
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, ""),
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    },
  ]
}

/** True when at least one provider has an API key configured. */
export function isAiConfigured(): boolean {
  return getProviders().some((provider) => Boolean(provider.apiKey))
}

const DEFAULT_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS) || 30_000

async function callProvider(provider: Provider, options: ChatOptions): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS)

  try {
    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model,
        messages: options.messages,
        temperature: options.temperature ?? 0.2,
        ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
        ...(options.json ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => "")
      throw new Error(`HTTP ${response.status} ${detail.slice(0, 300)}`)
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[]
    }

    const content = payload.choices?.[0]?.message?.content
    if (!content) {
      throw new Error("empty completion")
    }

    return content
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Run a chat completion against DeepSeek, falling back to OpenAI on failure.
 * Throws only if every configured provider fails (or none are configured).
 */
export async function chatComplete(options: ChatOptions): Promise<ChatResult> {
  const providers = getProviders()
  const failures: string[] = []

  for (const provider of providers) {
    if (!provider.apiKey) {
      failures.push(`${provider.name}: missing API key`)
      continue
    }

    try {
      const content = await callProvider(provider, options)
      if (failures.length) {
        logger.warn("ai", "primary provider failed, used fallback", {
          used: provider.name,
          failures,
        })
      }
      return { content, provider: provider.name, model: provider.model }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      failures.push(`${provider.name}: ${message}`)
      logger.warn("ai", "provider call failed", { provider: provider.name, error: message })
    }
  }

  throw new Error(`All AI providers failed. ${failures.join("; ")}`)
}

/**
 * Convenience wrapper that requests a JSON object and parses it. Returns null
 * if no provider is configured, all providers fail, or the output isn't valid JSON.
 */
export async function chatCompleteJson<T = unknown>(options: ChatOptions): Promise<T | null> {
  if (!isAiConfigured()) return null

  try {
    const { content } = await chatComplete({ ...options, json: true })
    return JSON.parse(content) as T
  } catch (error) {
    logger.error("ai", "chatCompleteJson failed", {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}
