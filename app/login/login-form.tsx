"use client"

import { useActionState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2, Mail } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { sendMagicLink, type LoginState } from "./actions"
import { GoogleSignInButton } from "./google-button"

const initialState: LoginState = { ok: false }

export function LoginForm() {
  const searchParams = useSearchParams()
  const next = searchParams.get("next") ?? "/dashboard"
  const [state, rawAction, pending] = useActionState(sendMagicLink, initialState)

  // Wrap the action so a thrown server-action error (network blip, stale
  // action ID after hot reload) becomes a toast instead of an unhandled
  // exception.
  const action = async (formData: FormData) => {
    try {
      await rawAction(formData)
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e)
      toast.error(
        /server action/i.test(m)
          ? "The page got out of sync — refresh and try again."
          : /fetch|network|timeout/i.test(m)
            ? "Network error — check your connection and retry."
            : "Couldn't send the magic link. Try again.",
      )
    }
  }

  useEffect(() => {
    if (state.ok && state.message) toast.success(state.message)
    if (!state.ok && state.error) toast.error(state.error)
  }, [state])

  return (
    <div className="flex flex-col gap-6">
      <GoogleSignInButton next={next} />
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-widest">
          <span className="bg-card px-3 text-muted-foreground">
            or continue with email
          </span>
        </div>
      </div>
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
            disabled={pending || state.ok}
          />
        </div>
        <Button type="submit" disabled={pending || state.ok} size="lg">
          {pending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Mail data-icon="inline-start" />
          )}
          {state.ok ? "Link sent" : "Email me a magic link"}
        </Button>
      </form>
    </div>
  )
}
