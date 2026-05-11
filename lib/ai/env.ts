export type OpenRouterEnv = {
  apiKey: string
  baseUrl: string
}

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1"

export function readOpenRouterEnv():
  | { configured: true; env: OpenRouterEnv }
  | { configured: false; missing: string[] } {
  const apiKey = process.env.OPENROUTER_API_KEY
  const baseUrl = process.env.OPENROUTER_BASE_URL ?? DEFAULT_BASE_URL

  const missing: string[] = []
  if (!apiKey) missing.push("OPENROUTER_API_KEY")

  if (missing.length > 0) return { configured: false, missing }
  return {
    configured: true,
    env: { apiKey: apiKey!, baseUrl },
  }
}

export const OPENROUTER_SETUP_MESSAGE =
  "OpenRouter is not configured. Set OPENROUTER_API_KEY in .env.local."
