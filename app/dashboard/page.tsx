import { AlertTriangle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { DashboardHeader } from "@/components/site/dashboard-header"
import { UploadDropzone } from "@/components/dashboard/upload-dropzone"
import {
  DocumentCard,
  type DashboardDocument,
} from "@/components/dashboard/document-card"
import { NewChatDialog } from "@/components/dashboard/new-chat-dialog"
import { UsageBadge } from "@/components/dashboard/usage-badge"
import {
  ConversationList,
  type ConversationListItem,
} from "@/components/dashboard/conversation-list"
import { createClient } from "@/lib/supabase/server"
import { requireUser } from "@/lib/auth/dal"
import { getUserUsage } from "@/lib/billing/limits"

type ConvoRow = {
  id: string
  title: string | null
  created_at: string
  document_ids: string[] | null
}

export default async function DashboardPage() {
  const user = await requireUser()
  const supabase = await createClient()

  const [docsResult, convosResult, usageResult] = await Promise.allSettled([
    supabase
      .from("documents")
      .select("id, filename, total_pages, status, error_message, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .returns<DashboardDocument[]>(),
    supabase
      .from("conversations")
      .select("id, title, created_at, document_ids")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .returns<ConvoRow[]>(),
    getUserUsage(supabase, user.id),
  ])

  const docs =
    docsResult.status === "fulfilled" ? docsResult.value.data : null
  const convos =
    convosResult.status === "fulfilled" ? convosResult.value.data : null
  const usage =
    usageResult.status === "fulfilled"
      ? usageResult.value
      : null
  const fetchFailed =
    docsResult.status === "rejected" ||
    (docsResult.status === "fulfilled" && !!docsResult.value.error)

  const documents = docs ?? []
  const conversations: ConversationListItem[] = (convos ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    created_at: c.created_at,
    documentCount: (c.document_ids ?? []).length,
  }))

  const avatarUrl =
    (user.user_metadata?.avatar_url as string | undefined) ?? null

  return (
    <div className="flex flex-1 flex-col">
      <DashboardHeader
        email={user.email}
        avatarUrl={avatarUrl}
        plan={usage?.plan ?? "free"}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-heading text-4xl font-semibold tracking-tight">
              Your documents
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Upload a PDF to start chatting with it.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {usage && <UsageBadge usage={usage} />}
            <NewChatDialog
              documents={documents.map((d) => ({
                id: d.id,
                filename: d.filename,
                status: d.status,
                total_pages: d.total_pages,
              }))}
            />
          </div>
        </div>

        {fetchFailed && (
          <div className="mb-8 flex items-start gap-3 border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p className="text-destructive">
              We couldn’t load your documents right now — likely a transient
              Supabase connection issue. Refresh in a moment.
            </p>
          </div>
        )}

        <section className="mb-10">
          <UploadDropzone />
        </section>

        <div className="grid gap-10 lg:grid-cols-[1fr_280px]">
          <section>
            <h2 className="mb-5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {documents.length === 0
                ? "No documents yet"
                : `${documents.length} document${documents.length === 1 ? "" : "s"}`}
            </h2>
            {documents.length === 0 ? (
              <EmptyDocs />
            ) : (
              <div className="grid gap-6 sm:grid-cols-2">
                {documents.map((doc) => (
                  <DocumentCard key={doc.id} doc={doc} />
                ))}
              </div>
            )}
          </section>

          <aside>
            <h2 className="mb-5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Recent chats
            </h2>
            <ConversationList conversations={conversations} />
          </aside>
        </div>
      </main>
    </div>
  )
}

function EmptyDocs() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <h3 className="font-heading text-2xl font-semibold tracking-tight">
          No documents yet
        </h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          Drop a PDF above and the agent will read, navigate, and answer
          questions with real citations.
        </p>
      </CardContent>
    </Card>
  )
}
