"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  Loader2,
  MessagesSquare,
  MoreHorizontal,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { deleteConversation } from "@/app/dashboard/chat/actions"
import type { ConversationListItem } from "./conversation-list"

type Props = {
  conversation: ConversationListItem
}

export function ConversationRow({ conversation }: Props) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const handleDelete = () => {
    startTransition(async () => {
      try {
        const result = await deleteConversation(conversation.id)
        if (!result.ok) {
          toast.error(result.error)
          return
        }
        toast.success("Chat deleted")
        setConfirmOpen(false)
        router.refresh()
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
      <div className="group/row relative flex items-stretch">
        <Link
          href={`/dashboard/chat/${conversation.id}`}
          className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted"
        >
          <MessagesSquare className="size-4 shrink-0 text-muted-foreground transition-colors group-hover/row:text-foreground" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span
              className="truncate text-sm font-medium"
              title={conversation.title ?? "Untitled chat"}
            >
              {conversation.title ?? "Untitled chat"}
            </span>
            <span className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">
              {conversation.documentCount} doc
              {conversation.documentCount === 1 ? "" : "s"} ·{" "}
              {formatDate(conversation.created_at)}
            </span>
          </div>
          <ArrowRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/row:opacity-100" />
        </Link>
        <div
          className={cn(
            "flex items-center pr-2 opacity-0 transition-opacity",
            "group-hover/row:opacity-100 focus-within:opacity-100",
          )}
        >
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Actions for ${conversation.title ?? "chat"}`}
                />
              }
            >
              <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
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
        </div>
      </div>

      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={(o) => !pending && setConfirmOpen(o)}
        title={conversation.title ?? "this chat"}
        pending={pending}
        onConfirm={handleDelete}
      />
    </>
  )
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  pending,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  pending: boolean
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete this chat?</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">“{title}”</span> and
            all its messages will be permanently removed. The documents stay
            untouched.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose
            render={
              <Button variant="ghost" disabled={pending}>
                Cancel
              </Button>
            }
          />
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? <Loader2 className="animate-spin" /> : <Trash2 />}
            {pending ? "Deleting…" : "Delete chat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffH = diffMs / (1000 * 60 * 60)
  if (diffH < 1) return "just now"
  if (diffH < 24) return `${Math.floor(diffH)}h ago`
  if (diffH < 24 * 7) return `${Math.floor(diffH / 24)}d ago`
  return d.toLocaleDateString()
}
