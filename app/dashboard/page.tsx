import { AlertTriangle, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { DashboardHeader } from "@/components/site/dashboard-header"
import { UploadDropzone } from "@/components/dashboard/upload-dropzone"
import {
  DocumentCard,
  type DashboardDocument,
} from "@/components/dashboard/document-card"
import { NewChatDialog } from "@/components/dashboard/new-chat-dialog"
import { createClient } from "@/lib/supabase/server"
import { requireUser } from "@/lib/auth/dal"

export default async function DashboardPage() {
  const user = await requireUser()
  const supabase = await createClient()

  // Both queries fail-soft: a transient Supabase blip degrades the dashboard
  // (banner + empty grid) rather than crashing it.
  const [profileResult, docsResult] = await Promise.allSettled([
    supabase
      .from("profiles")
      .select("plan, email")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("documents")
      .select("id, filename, total_pages, status, error_message, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .returns<DashboardDocument[]>(),
  ])

  const profile =
    profileResult.status === "fulfilled" ? profileResult.value.data : null
  const docs =
    docsResult.status === "fulfilled" ? docsResult.value.data : null
  const fetchFailed =
    profileResult.status === "rejected" ||
    docsResult.status === "rejected" ||
    (docsResult.status === "fulfilled" && !!docsResult.value.error)

  const documents = docs ?? []
  const plan = profile?.plan ?? "free"
  const avatarUrl =
    (user.user_metadata?.avatar_url as string | undefined) ?? null

  return (
    <div className="flex flex-1 flex-col">
      <DashboardHeader
        email={user.email}
        avatarUrl={avatarUrl}
        plan={plan}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <h1 className="font-heading text-4xl font-semibold tracking-tight">
              Your documents
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Upload a PDF to start chatting with it.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="hidden sm:inline-flex">
              <Sparkles className="size-3" />
              {plan === "pro" ? "Pro plan" : "Free plan"}
            </Badge>
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

        {documents.length === 0 ? (
          <EmptyState />
        ) : (
          <section>
            <h2 className="mb-5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {documents.length} document{documents.length === 1 ? "" : "s"}
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {documents.map((doc) => (
                <DocumentCard key={doc.id} doc={doc} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

function EmptyState() {
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
