import { createBrowserClient } from "@supabase/ssr"
import { readSupabaseEnv, SUPABASE_SETUP_MESSAGE } from "./env"

export function createClient() {
  const cfg = readSupabaseEnv()
  if (!cfg.configured) throw new Error(SUPABASE_SETUP_MESSAGE)
  return createBrowserClient(cfg.env.url, cfg.env.anonKey)
}
