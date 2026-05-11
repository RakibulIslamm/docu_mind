"use client"

import Link from "next/link"
import { MessagesSquare, UploadCloud } from "lucide-react"
import { NewChatDialog, type ChatableDocument } from "./new-chat-dialog"

type Props = {
  chatableDocuments: ChatableDocument[]
  canUpload: boolean
}

export function OverviewQuickActions({ chatableDocuments, canUpload }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Link
        href="/dashboard/documents"
        aria-disabled={!canUpload}
        className="group/qa flex items-center gap-4 border border-border bg-card px-5 py-4 transition-colors hover:bg-muted hover:border-foreground/40"
      >
        <div className="flex size-10 shrink-0 items-center justify-center bg-foreground/5 text-foreground">
          <UploadCloud className="size-5" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-semibold">Upload a PDF</span>
          <span className="text-xs text-muted-foreground">
            {canUpload
              ? "Drop a file and start chatting in seconds."
              : "Free limit reached — manage your documents."}
          </span>
        </div>
      </Link>
      <div className="flex items-center gap-4 border border-border bg-card px-5 py-4 transition-colors hover:border-foreground/40">
        <div className="flex size-10 shrink-0 items-center justify-center bg-foreground/5 text-foreground">
          <MessagesSquare className="size-5" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm font-semibold">Start a new chat</span>
          <span className="text-xs text-muted-foreground">
            Pick documents and ask anything.
          </span>
        </div>
        <NewChatDialog documents={chatableDocuments} />
      </div>
    </div>
  )
}
