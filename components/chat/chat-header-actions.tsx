"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, MoreHorizontal, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { deleteConversation } from "@/app/dashboard/chat/actions"
import { ConfirmDeleteDialog } from "@/components/dashboard/conversation-row"

type Props = {
  conversationId: string
  title: string
}

export function ChatHeaderActions({ conversationId, title }: Props) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const handleDelete = () => {
    startTransition(async () => {
      try {
        const result = await deleteConversation(conversationId)
        if (!result.ok) {
          toast.error(result.error)
          return
        }
        toast.success("Chat deleted")
        router.push("/dashboard")
      } catch (e) {
        const m = e instanceof Error ? e.message : String(e)
        toast.error(
          /server action/i.test(m)
            ? "Page out of sync — refresh and try again."
            : m || "Delete failed.",
        )
      }
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Chat actions"
              disabled={pending}
            />
          }
        >
          {pending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <MoreHorizontal />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            variant="destructive"
            onClick={(event) => {
              event.preventDefault()
              setConfirmOpen(true)
            }}
          >
            <Trash2 data-icon="inline-start" />
            Delete chat
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={(o) => !pending && setConfirmOpen(o)}
        title={title}
        pending={pending}
        onConfirm={handleDelete}
      />
    </>
  )
}
