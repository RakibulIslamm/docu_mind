import { FileText, Plus, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DashboardHeader } from "@/components/site/dashboard-header"
import { createClient } from "@/lib/supabase/server"
import { requireUser } from "@/lib/auth/dal"

type Doc = {
  id: string
  filename: string
  total_pages: number | null
  status: string
  created_at: string
}

export default async function DashboardPage() {
  const user = await requireUser()
  const supabase = await createClient()

  const [{ data: profile }, { data: docs }] = await Promise.all([
    supabase
      .from("profiles")
      .select("plan, email")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("documents")
      .select("id, filename, total_pages, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .returns<Doc[]>(),
  ])

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
          <Button size="lg" disabled>
            <Plus />
            Upload PDF
          </Button>
        </div>

        {documents.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="flex size-14 items-center justify-center bg-muted text-muted-foreground">
          <Upload className="size-6" />
        </div>
        <div className="space-y-2">
          <h3 className="font-heading text-2xl font-semibold tracking-tight">
            No documents yet
          </h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            Upload your first PDF and the agent will read, navigate, and
            answer questions with real citations.
          </p>
        </div>
        <Button disabled>
          <Upload />
          Upload PDF
        </Button>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Coming in Phase 2
        </p>
      </CardContent>
    </Card>
  )
}

function DocumentCard({ doc }: { doc: Doc }) {
  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex size-10 items-center justify-center bg-foreground/5 text-foreground">
          <FileText className="size-5" />
        </div>
        <CardTitle className="mt-4 line-clamp-2 normal-case tracking-normal">
          {doc.filename}
        </CardTitle>
        <CardDescription>
          {doc.total_pages ? `${doc.total_pages} pages` : "—"} ·{" "}
          {new Date(doc.created_at).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Badge variant={doc.status === "ready" ? "default" : "secondary"}>
          {doc.status}
        </Badge>
      </CardContent>
    </Card>
  )
}
