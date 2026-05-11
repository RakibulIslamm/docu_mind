import Link from "next/link"
import {
  ArrowRight,
  AlertTriangle,
  Crown,
  FileText,
  MessagesSquare,
  Sparkles,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { OverviewQuickActions } from "@/components/dashboard/overview-quick-actions"
import { RecentDocuments } from "@/components/dashboard/recent-documents"
import { RecentChats } from "@/components/dashboard/recent-chats"
import { createClient } from "@/lib/supabase/server"
import { requireUser } from "@/lib/auth/dal"
import { getUserUsage, type Usage } from "@/lib/billing/limits"
import type { DashboardDocument } from "@/components/dashboard/document-card"
import type { ConversationListItem } from "@/components/dashboard/conversation-list"
import type { ChatableDocument } from "@/components/dashboard/new-chat-dialog"

type ConvoRow = {
  id: string
  title: string | null
  created_at: string
  document_ids: string[] | null
}

export default async function DashboardOverviewPage() {
  const user = await requireUser()
  const supabase = await createClient()

  const [docsResult, convosResult, usageResult] = await Promise.allSettled([
    supabase
      .from("documents")
      .select("id, filename, total_pages, status, error_message, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(4)
      .returns<DashboardDocument[]>(),
    supabase
      .from("conversations")
      .select("id, title, created_at, document_ids")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(4)
      .returns<ConvoRow[]>(),
    getUserUsage(supabase, user.id),
  ])

  const documents =
    docsResult.status === "fulfilled" ? (docsResult.value.data ?? []) : []
  const convos =
    convosResult.status === "fulfilled" ? (convosResult.value.data ?? []) : []
  const usage =
    usageResult.status === "fulfilled" ? usageResult.value : null

  // Pull a fuller list of "ready" documents for the New Chat dialog.
  const { data: readyDocsRaw } = await supabase
    .from("documents")
    .select("id, filename, status, total_pages")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
  const chatableDocs: ChatableDocument[] = (readyDocsRaw ?? []).map((d) => ({
    id: d.id,
    filename: d.filename,
    status: d.status,
    total_pages: d.total_pages,
  }))

  const conversations: ConversationListItem[] = convos.map((c) => ({
    id: c.id,
    title: c.title,
    created_at: c.created_at,
    documentCount: (c.document_ids ?? []).length,
  }))

  const fetchFailed =
    docsResult.status === "rejected" ||
    (docsResult.status === "fulfilled" && !!docsResult.value.error)

  const greeting = greetingFor(user.email)

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-10">
        <header className="flex flex-col gap-3">
          <Badge variant="outline" className="self-start">
            <Sparkles className="size-3" />
            {usage?.plan === "pro" ? "Pro plan" : "Free plan"}
          </Badge>
          <h1 className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
            {greeting}
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Upload a PDF and the agent will read, navigate, and answer questions
            with real citations — no embeddings, no chunking heuristics.
          </p>
        </header>

        {fetchFailed && (
          <div className="mt-8 flex items-start gap-3 border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p className="text-destructive">
              We couldn&rsquo;t load your dashboard right now — likely a
              transient Supabase connection issue. Refresh in a moment.
            </p>
          </div>
        )}

        {/* Stats */}
        <section className="mt-10 grid gap-4 md:grid-cols-3">
          <StatCard
            icon={<FileText className="size-4" />}
            label="Documents"
            primary={
              usage
                ? usage.plan === "pro"
                  ? `${usage.documentCount}`
                  : `${usage.documentCount} / ${usage.documentLimit}`
                : "—"
            }
            sub={
              usage?.plan === "pro"
                ? "Unlimited on Pro"
                : usage
                  ? `${usage.documentsRemaining ?? 0} remaining`
                  : "Loading…"
            }
            progress={
              usage && usage.plan === "free"
                ? Math.min(
                    100,
                    Math.round(
                      (usage.documentCount / Math.max(1, usage.documentLimit)) *
                        100,
                    ),
                  )
                : null
            }
            hot={
              usage?.plan === "free" &&
              (usage.documentsRemaining ?? 0) <= 0
            }
          />
          <StatCard
            icon={<MessagesSquare className="size-4" />}
            label="Questions this month"
            primary={
              usage
                ? usage.plan === "pro"
                  ? `${usage.questionsThisMonth}`
                  : `${usage.questionsThisMonth} / ${usage.questionLimit}`
                : "—"
            }
            sub={
              usage?.plan === "pro"
                ? "Unlimited on Pro"
                : usage
                  ? `${usage.questionsRemaining ?? 0} remaining`
                  : "Loading…"
            }
            progress={
              usage && usage.plan === "free"
                ? Math.min(
                    100,
                    Math.round(
                      (usage.questionsThisMonth /
                        Math.max(1, usage.questionLimit)) *
                        100,
                    ),
                  )
                : null
            }
            hot={
              usage?.plan === "free" &&
              (usage.questionsRemaining ?? 0) <= 0
            }
          />
          <PlanCard usage={usage} />
        </section>

        {/* Quick actions */}
        <section className="mt-10">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Quick actions
          </h2>
          <OverviewQuickActions
            chatableDocuments={chatableDocs}
            canUpload={usage?.canUpload ?? true}
          />
        </section>

        {/* Recent activity */}
        <section className="mt-12 grid gap-8 lg:grid-cols-2">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Recent documents
              </h2>
              <Button
                variant="ghost"
                size="xs"
                nativeButton={false}
                render={<Link href="/dashboard/documents" />}
              >
                View all
                <ArrowRight />
              </Button>
            </div>
            <RecentDocuments documents={documents.slice(0, 3)} />
          </div>
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Recent chats
              </h2>
              <Button
                variant="ghost"
                size="xs"
                nativeButton={false}
                render={<Link href="/dashboard/chats" />}
              >
                View all
                <ArrowRight />
              </Button>
            </div>
            <RecentChats conversations={conversations.slice(0, 3)} />
          </div>
        </section>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  primary,
  sub,
  progress,
  hot,
}: {
  icon: React.ReactNode
  label: string
  primary: string
  sub: string
  progress: number | null
  hot?: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <CardDescription className="text-xs uppercase tracking-widest">
            {label}
          </CardDescription>
        </div>
        <CardTitle className="mt-2 font-heading text-3xl font-semibold tracking-tight normal-case">
          {primary}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {progress !== null && (
          <div className="mb-3 h-1 w-full overflow-hidden bg-muted">
            <div
              className={hot ? "h-full bg-destructive" : "h-full bg-foreground"}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        <p
          className={
            hot
              ? "text-xs text-destructive"
              : "text-xs text-muted-foreground"
          }
        >
          {sub}
        </p>
      </CardContent>
    </Card>
  )
}

function PlanCard({ usage }: { usage: Usage | null }) {
  const isPro = usage?.plan === "pro"
  return (
    <Card className={isPro ? "border-foreground/40" : undefined}>
      <CardHeader>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Crown className="size-4" />
          <CardDescription className="text-xs uppercase tracking-widest">
            Plan
          </CardDescription>
        </div>
        <CardTitle className="mt-2 font-heading text-3xl font-semibold tracking-tight normal-case">
          {isPro ? "Pro" : "Free"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-xs text-muted-foreground">
          {isPro
            ? "Unlimited documents and questions."
            : "Upgrade for unlimited documents and questions."}
        </p>
        <Button
          variant={isPro ? "outline" : "default"}
          size="sm"
          nativeButton={false}
          render={<Link href="/dashboard/billing" />}
          className="w-full"
        >
          {isPro ? "Manage subscription" : "Upgrade to Pro"}
          <ArrowRight />
        </Button>
      </CardContent>
    </Card>
  )
}

function greetingFor(email: string | undefined | null): string {
  const hour = new Date().getHours()
  const slug = (email ?? "").split("@")[0]
  const name =
    slug && slug.length <= 24
      ? slug.charAt(0).toUpperCase() + slug.slice(1)
      : "there"
  if (hour < 12) return `Good morning, ${name}.`
  if (hour < 18) return `Good afternoon, ${name}.`
  return `Good evening, ${name}.`
}
