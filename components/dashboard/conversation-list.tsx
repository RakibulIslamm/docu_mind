import { MessagesSquare } from "lucide-react"
import { ConversationRow } from "./conversation-row"

export type ConversationListItem = {
  id: string
  title: string | null
  created_at: string
  documentCount: number
}

type Props = {
  conversations: ConversationListItem[]
}

export function ConversationList({ conversations }: Props) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 border border-border bg-card px-4 py-10 text-center">
        <div className="flex size-10 items-center justify-center bg-foreground/5 text-foreground">
          <MessagesSquare className="size-5" />
        </div>
        <p className="text-sm font-medium">No conversations yet</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          Click a ready document or use the “New chat” button to start one.
        </p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col divide-y divide-border border border-border bg-card">
      {conversations.map((c) => (
        <li key={c.id}>
          <ConversationRow conversation={c} />
        </li>
      ))}
    </ul>
  )
}
