export type OpenRouterEnv = {
  apiKey: string
  baseUrl: string
}

/**
 * Reasons AI is unavailable, in priority order:
 *   - "disabled": operator set AI_DISABLED=true (kill switch). Used on the
 *     public demo so visitors can browse without burning the operator's credits.
 *   - "missing": required env vars are absent (local setup incomplete).
 *
 * "disabled" wins even when keys are present so the kill switch can be tested
 * locally without unsetting working dev keys.
 */
export type OpenRouterEnvResult =
  | { configured: true; env: OpenRouterEnv }
  | { configured: false; reason: "disabled" }
  | { configured: false; reason: "missing"; missing: string[] }

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1"

export function readOpenRouterEnv(): OpenRouterEnvResult {
  if (process.env.AI_DISABLED === "true") {
    return { configured: false, reason: "disabled" }
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  const baseUrl = process.env.OPENROUTER_BASE_URL ?? DEFAULT_BASE_URL

  const missing: string[] = []
  if (!apiKey) missing.push("OPENROUTER_API_KEY")

  if (missing.length > 0) return { configured: false, reason: "missing", missing }
  return { configured: true, env: { apiKey: apiKey!, baseUrl } }
}

export const OPENROUTER_SETUP_MESSAGE =
  "OpenRouter is not configured. Set OPENROUTER_API_KEY in .env.local."

export const AI_DISABLED_MESSAGE =
  "AI features are disabled for this deployment. Clone the repo locally to try them — see README."

/** Returns the appropriate error string for a non-configured result. */
export function aiUnavailableMessage(
  result: Extract<OpenRouterEnvResult, { configured: false }>,
): string {
  return result.reason === "disabled" ? AI_DISABLED_MESSAGE : OPENROUTER_SETUP_MESSAGE
}
