import { notFound } from "next/navigation"
import { ChatHeaderActions } from "@/components/chat/chat-header-actions"
import { ChatWorkspace } from "@/components/chat/chat-workspace"
import { requireUser } from "@/lib/auth/dal"
import { createClient } from "@/lib/supabase/server"
import type { OutlineNode, OutlineDocument } from "@/components/chat/outline-tree"
import type { PersistedMessage } from "@/components/chat/message-list"

type DbSection = {
  id: string
  document_id: string
  parent_id: string | null
  position: number
  level: number
  section_number: string | null
  title: string
  start_page: number | null
  end_page: number | null
  content_summary: string | null
}

type DbMessage = {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  tool_calls: unknown
  citations: unknown
  created_at: string
}

export default async function ChatPage({
  params,
}: {
  params: Promise<{ conversationId: string }>
}) {
  const { conversationId } = await params
  const user = await requireUser()
  const supabase = await createClient()

  const { data: convo } = await supabase
    .from("conversations")
    .select("id, user_id, document_ids, title, created_at")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (!convo) notFound()

  const documentIds = (convo.document_ids ?? []) as string[]

  const [docsResult, sectionsResult, messagesResult] = await Promise.all([
    supabase
      .from("documents")
      .select("id, filename, total_pages, status")
      .in("id", documentIds),
    supabase
      .from("document_sections")
      .select(
        "id, document_id, parent_id, position, level, section_number, title, start_page, end_page, content_summary",
      )
      .in("document_id", documentIds)
      .order("position", { ascending: true })
      .returns<DbSection[]>(),
    supabase
      .from("messages")
      .select("id, role, content, tool_calls, citations, created_at")
      .eq("conversation_id", convo.id)
      .order("created_at", { ascending: true })
      .returns<DbMessage[]>(),
  ])

  const docs = docsResult.data ?? []
  const sections = sectionsResult.data ?? []
  const messages = messagesResult.data ?? []

  const outline: OutlineDocument[] = docs.map((doc) => ({
    documentId: doc.id,
    filename: doc.filename,
    totalPages: doc.total_pages,
    sections: buildOutlineTree(
      sections.filter((s) => s.document_id === doc.id),
    ),
  }))

  const persistedMessages: PersistedMessage[] = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      toolCalls: Array.isArray(m.tool_calls)
        ? (m.tool_calls as PersistedMessage["toolCalls"])
        : null,
      citations: Array.isArray(m.citations)
        ? (m.citations as PersistedMessage["citations"])
        : null,
    }))

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <h1 className="truncate text-sm font-semibold" title={convo.title ?? undefined}>
            {convo.title ?? "Untitled chat"}
          </h1>
          <span className="hidden shrink-0 text-[0.65rem] uppercase tracking-widest text-muted-foreground sm:inline">
            · {docs.length} doc{docs.length === 1 ? "" : "s"}
          </span>
        </div>
        <ChatHeaderActions
          conversationId={convo.id}
          title={convo.title ?? "this chat"}
        />
      </header>
      <ChatWorkspace
        conversationId={convo.id}
        outline={outline}
        persistedMessages={persistedMessages}
      />
    </div>
  )
}

function buildOutlineTree(rows: DbSection[]): OutlineNode[] {
  const byId = new Map<string, OutlineNode>()
  const roots: OutlineNode[] = []
  for (const r of rows) {
    const node: OutlineNode = {
      sectionId: r.id,
      documentId: r.document_id,
      sectionNumber: r.section_number,
      title: r.title,
      level: r.level,
      startPage: r.start_page,
      endPage: r.end_page,
      summary: r.content_summary,
      children: [],
    }
    byId.set(r.id, node)
    if (r.parent_id && byId.has(r.parent_id)) {
      byId.get(r.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}
