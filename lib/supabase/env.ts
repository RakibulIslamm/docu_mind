export type SupabaseEnv = {
  url: string
  anonKey: string
}

export function readSupabaseEnv():
  | { configured: true; env: SupabaseEnv }
  | { configured: false; missing: string[] } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const missing: string[] = []
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL")
  if (!anonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY")

  if (missing.length > 0) return { configured: false, missing }
  return {
    configured: true,
    env: { url: url!, anonKey: anonKey! },
  }
}

export const SUPABASE_SETUP_MESSAGE =
  "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local."
