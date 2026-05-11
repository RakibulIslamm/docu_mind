import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { readSupabaseEnv, SUPABASE_SETUP_MESSAGE } from "./env"

export async function createClient() {
  const cfg = readSupabaseEnv()
  if (!cfg.configured) throw new Error(SUPABASE_SETUP_MESSAGE)

  const cookieStore = await cookies()

  return createServerClient(cfg.env.url, cfg.env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        } catch {
          // Setting cookies from a Server Component throws — safe to ignore
          // when a proxy/route-handler is also refreshing the session.
        }
      },
    },
  })
}
