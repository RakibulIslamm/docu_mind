"use client"

import { useTransition } from "react"
import { Crown, Loader2, Settings } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

export function StartCheckoutButton({
  size = "default",
  className,
  children,
}: {
  size?: "default" | "sm" | "lg" | "xs"
  className?: string
  children?: React.ReactNode
}) {
  const [pending, startTransition] = useTransition()

  const onClick = () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/stripe/checkout", { method: "POST" })
        const data = (await res.json()) as { url?: string; error?: string }
        if (!res.ok || !data.url) {
          toast.error(data.error ?? "Checkout failed.")
          return
        }
        window.location.href = data.url
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Checkout failed.")
      }
    })
  }

  return (
    <Button
      size={size}
      className={className}
      onClick={onClick}
      disabled={pending}
    >
      {pending ? <Loader2 className="animate-spin" /> : <Crown />}
      {children ?? (pending ? "Redirecting…" : "Upgrade to Pro")}
    </Button>
  )
}

export function ManageSubscriptionButton({
  className,
}: {
  className?: string
}) {
  const [pending, startTransition] = useTransition()

  const onClick = () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/stripe/portal", { method: "POST" })
        const data = (await res.json()) as { url?: string; error?: string }
        if (!res.ok || !data.url) {
          toast.error(data.error ?? "Couldn't open billing portal.")
          return
        }
        window.location.href = data.url
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Portal failed.")
      }
    })
  }

  return (
    <Button
      variant="outline"
      onClick={onClick}
      disabled={pending}
      className={className}
    >
      {pending ? <Loader2 className="animate-spin" /> : <Settings />}
      Manage subscription
    </Button>
  )
}
