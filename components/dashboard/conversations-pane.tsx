"use client"

import { useMemo, useState } from "react"
import { MessagesSquare, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ConversationRow } from "./conversation-row"
import {
  NewChatDialog,
  type ChatableDocument,
} from "./new-chat-dialog"
import type { ConversationListItem } from "./conversation-list"

type Props = {
  conversations: ConversationListItem[]
  chatableDocuments: ChatableDocument[]
}

export function ConversationsPane({
  conversations,
  chatableDocuments,
}: Props) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter((c) =>
      (c.title ?? "Untitled chat").toLowerCase().includes(q),
    )
  }, [conversations, query])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats"
            className="h-10 pl-9 pr-9"
            type="search"
          />
          {query && (
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              aria-label="Clear search"
              onClick={() => setQuery("")}
              className="absolute top-1/2 right-1.5 -translate-y-1/2"
            >
              <X />
            </Button>
          )}
        </div>
        <NewChatDialog documents={chatableDocuments} />
      </div>

      {conversations.length === 0 ? (
        <EmptyState />
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-border bg-card px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No chats match &ldquo;{query}&rdquo;.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-border border border-border bg-card">
          {filtered.map((c) => (
            <li key={c.id}>
              <ConversationRow conversation={c} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 border border-dashed border-border bg-card py-16 text-center">
      <div className="flex size-12 items-center justify-center bg-foreground/5 text-foreground">
        <MessagesSquare className="size-5" />
      </div>
      <h3 className="font-heading text-xl font-semibold tracking-tight">
        No chats yet
      </h3>
      <p className="max-w-sm text-sm text-muted-foreground">
        Click &ldquo;New chat&rdquo; above and pick one or more documents to get
        started.
      </p>
    </div>
  )
}
