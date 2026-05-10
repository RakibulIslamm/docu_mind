"use client"

import { useTransition } from "react"
import { Loader2, LogOut } from "lucide-react"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { signOut } from "@/lib/auth/actions"

export function SignOutMenuItem() {
  const [pending, startTransition] = useTransition()
  return (
    <DropdownMenuItem
      disabled={pending}
      onClick={(event) => {
        event.preventDefault()
        startTransition(() => signOut())
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
