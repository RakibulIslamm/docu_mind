import "server-only"

import { createOpenAICompatible } from "@ai-sdk/openai-compatible"

export const DOCUMIND_MODEL = "deepseek/deepseek-v4-flash"

const openrouter = createOpenAICompatible({
  name: "openrouter",
  baseURL:
    process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  headers: {
    // Optional but recommended by OpenRouter for traffic attribution.
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "",
    "X-Title": "DocuMind",
  },
})

export const documindModel = openrouter.chatModel(DOCUMIND_MODEL)
