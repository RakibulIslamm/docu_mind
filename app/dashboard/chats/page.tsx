import type { Metadata } from "next"
import { AlertTriangle } from "lucide-react"
import { ConversationsPane } from "@/components/dashboard/conversations-pane"
import type { ConversationListItem } from "@/components/dashboard/conversation-list"
import type { ChatableDocument } from "@/components/dashboard/new-chat-dialog"
import { createClient } from "@/lib/supabase/server"
import { requireUser } from "@/lib/auth/dal"
import { getUserUsage } from "@/lib/billing/limits"

export const metadata: Metadata = { title: "Chats" }

type ConvoRow = {
  id: string
  title: string | null
  created_at: string
  document_ids: string[] | null
}

export default async function ChatsPage() {
  const user = await requireUser()
  const supabase = await createClient()

  const [convosResult, docsResult, usageResult] = await Promise.allSettled([
    supabase
      .from("conversations")
      .select("id, title, created_at, document_ids")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .returns<ConvoRow[]>(),
    supabase
      .from("documents")
      .select("id, filename, status, total_pages")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    getUserUsage(supabase, user.id),
  ])

  const convos =
    convosResult.status === "fulfilled" ? (convosResult.value.data ?? []) : []
  const docs =
    docsResult.status === "fulfilled" ? (docsResult.value.data ?? []) : []
  const usage =
    usageResult.status === "fulfilled" ? usageResult.value : null

  const conversations: ConversationListItem[] = convos.map((c) => ({
    id: c.id,
    title: c.title,
    created_at: c.created_at,
    documentCount: (c.document_ids ?? []).length,
  }))

  const chatableDocuments: ChatableDocument[] = docs.map((d) => ({
    id: d.id,
    filename: d.filename,
    status: d.status,
    total_pages: d.total_pages,
  }))

  const fetchFailed = convosResult.status === "rejected"

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-10">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
              Chats
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Every conversation you&rsquo;ve had with your documents. Resume,
              search, or delete.
            </p>
          </div>
          {usage && (
            <div className="flex items-center gap-2 border border-border bg-card px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-widest">
              <span className="size-1.5 bg-foreground" />
              {usage.questionsThisMonth} / {usage.questionLimit} questions · {usage.questionsRemaining ?? 0} remaining
            </div>
          )}
        </header>

        {fetchFailed && (
          <div className="mt-6 flex items-start gap-3 border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p className="text-destructive">
              We couldn&rsquo;t load your chats — likely a transient Supabase
              issue. Refresh in a moment.
            </p>
          </div>
        )}

        <section className="mt-8">
          <ConversationsPane
            conversations={conversations}
            chatableDocuments={chatableDocuments}
          />
        </section>
      </div>
    </div>
  )
}
