import Link from "next/link"
import { ArrowRight, MessagesSquare } from "lucide-react"

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
          <Link
            href={`/dashboard/chat/${c.id}`}
            className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted"
          >
            <MessagesSquare className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span
                className="truncate text-sm font-medium"
                title={c.title ?? "Untitled chat"}
              >
                {c.title ?? "Untitled chat"}
              </span>
              <span className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">
                {c.documentCount} doc{c.documentCount === 1 ? "" : "s"} ·{" "}
                {formatDate(c.created_at)}
              </span>
            </div>
            <ArrowRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        </li>
      ))}
    </ul>
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
