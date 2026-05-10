"use server"

import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const EmailSchema = z.object({ email: z.email("Please enter a valid email.") })

export type LoginState = {
  ok: boolean
  error?: string
  message?: string
}

export async function sendMagicLink(
  _prev: LoginState | undefined,
  formData: FormData,
): Promise<LoginState> {
  const parsed = EmailSchema.safeParse({ email: formData.get("email") })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid email." }
  }

  const supabase = await createClient()
  const next = (formData.get("next") as string) || "/dashboard"
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=${encodeURIComponent(next)}`

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: redirectTo },
  })

  if (error) return { ok: false, error: error.message }

  return {
    ok: true,
    message: "Check your inbox — we sent you a magic link.",
  }
}
