import "server-only"

import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import { readOpenRouterEnv, OPENROUTER_SETUP_MESSAGE } from "./env"

export const DOCUMIND_MODEL = "deepseek/deepseek-v4-flash"

type Provider = ReturnType<typeof createOpenAICompatible>

let cachedProvider: Provider | null = null

function getProvider(): Provider {
  if (cachedProvider) return cachedProvider
  const cfg = readOpenRouterEnv()
  if (!cfg.configured) throw new Error(OPENROUTER_SETUP_MESSAGE)
  cachedProvider = createOpenAICompatible({
    name: "openrouter",
    baseURL: cfg.env.baseUrl,
    apiKey: cfg.env.apiKey,
    headers: {
      // Optional but recommended by OpenRouter for traffic attribution.
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "",
      "X-Title": "DocuMind",
    },
  })
  return cachedProvider
}

export function getDocumindModel() {
  return getProvider().chatModel(DOCUMIND_MODEL)
}
