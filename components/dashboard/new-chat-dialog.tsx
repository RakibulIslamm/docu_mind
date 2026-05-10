"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, FileText, Loader2, MessagesSquare } from "lucide-react"
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
import { startConversation } from "@/app/dashboard/chat/actions"

export type ChatableDocument = {
  id: string
  filename: string
  status: string
  total_pages: number | null
}

type Props = {
  documents: ChatableDocument[]
}

export function NewChatDialog({ documents }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  const ready = useMemo(
    () => documents.filter((d) => d.status === "ready"),
    [documents],
  )

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const start = () => {
    if (selected.size === 0) {
      toast.error("Pick at least one document.")
      return
    }
    startTransition(async () => {
      try {
        const result = await startConversation([...selected])
        if (result.ok) {
          setOpen(false)
          router.push(`/dashboard/chat/${result.conversationId}`)
        } else {
          toast.error(result.error)
        }
      } catch (e) {
        const m = e instanceof Error ? e.message : String(e)
        toast.error(
          /server action/i.test(m)
            ? "Page out of sync — refresh and try again."
            : m || "Couldn't start chat.",
        )
      }
    })
  }

  const onOpenChange = (next: boolean) => {
    if (!next && isPending) return
    setOpen(next)
    if (!next) setSelected(new Set())
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Button
        size="lg"
        onClick={() => setOpen(true)}
        disabled={ready.length === 0}
        title={ready.length === 0 ? "Upload a document first" : undefined}
      >
        <MessagesSquare />
        New chat
      </Button>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Start a new chat</DialogTitle>
          <DialogDescription>
            Pick one or more documents. The agent will navigate them to answer
            your questions.
          </DialogDescription>
        </DialogHeader>

        {ready.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            No documents are ready yet. Upload a PDF and wait for it to finish
            processing.
          </p>
        ) : (
          <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
            {ready.map((doc) => {
              const isSelected = selected.has(doc.id)
              return (
                <li key={doc.id}>
                  <button
                    type="button"
                    onClick={() => toggle(doc.id)}
                    disabled={isPending}
                    className={cn(
                      "flex w-full items-center gap-3 border border-transparent bg-card px-3 py-2.5 text-left transition-colors hover:bg-muted",
                      isSelected && "border-foreground bg-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center bg-foreground/5 text-foreground transition-colors",
                        isSelected && "bg-foreground text-background",
                      )}
                    >
                      {isSelected ? (
                        <CheckCircle2 className="size-4" />
                      ) : (
                        <FileText className="size-4" />
                      )}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium">
                        {doc.filename}
                      </span>
                      {doc.total_pages && (
                        <span className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">
                          {doc.total_pages} pages
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <DialogFooter>
          <DialogClose
            render={
              <Button variant="ghost" disabled={isPending}>
                Cancel
              </Button>
            }
          />
          <Button
            onClick={start}
            disabled={isPending || selected.size === 0}
          >
            {isPending && <Loader2 className="animate-spin" />}
            {isPending
              ? "Starting…"
              : `Start chat${selected.size > 0 ? ` (${selected.size})` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
