"use client"

import { useTransition } from "react"
import { Loader2, LogOut } from "lucide-react"
import { toast } from "sonner"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { signOut } from "@/lib/auth/actions"

export function SignOutMenuItem() {
  const [pending, startTransition] = useTransition()
  return (
    <DropdownMenuItem
      disabled={pending}
      onClick={(event) => {
        event.preventDefault()
        startTransition(async () => {
          try {
            await signOut()
          } catch (e) {
            const m = e instanceof Error ? e.message : String(e)
            // signOut() always redirects on success — a thrown error here is
            // a real failure (network, action mismatch). Surface it.
            if (!/NEXT_REDIRECT/i.test(m)) {
              toast.error(/server action/i.test(m)
                ? "Page out of sync — refresh and try again."
                : "Sign out failed. Try again.")
            }
          }
        })
      }}
    >
      {pending ? (
        <Loader2 className="animate-spin" />
      ) : (
        <LogOut data-icon="inline-start" />
      )}
      Sign out
    </DropdownMenuItem>
  )
}
