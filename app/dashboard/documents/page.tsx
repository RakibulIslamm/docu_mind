import type { Metadata } from "next"
import { AlertTriangle } from "lucide-react"
import { UploadDropzone } from "@/components/dashboard/upload-dropzone"
import { DocumentGrid } from "@/components/dashboard/document-grid"
import type { DashboardDocument } from "@/components/dashboard/document-card"
import { ProcessingGuard } from "@/components/dashboard/processing-guard"
import { createClient } from "@/lib/supabase/server"
import { requireUser } from "@/lib/auth/dal"
import { getUserUsage } from "@/lib/billing/limits"
import { readOpenRouterEnv } from "@/lib/ai/env"

const ACTIVE_STATUSES = new Set(["pending", "processing"])

export const metadata: Metadata = { title: "Documents" }

export default async function DocumentsPage() {
  const user = await requireUser()
  const supabase = await createClient()
  const aiEnv = readOpenRouterEnv()
  const aiDisabled = !aiEnv.configured

  const [docsResult, usageResult] = await Promise.allSettled([
    supabase
      .from("documents")
      .select("id, filename, total_pages, status, error_message, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .returns<DashboardDocument[]>(),
    getUserUsage(supabase, user.id),
  ])

  const documents =
    docsResult.status === "fulfilled" ? (docsResult.value.data ?? []) : []
  const usage =
    usageResult.status === "fulfilled" ? usageResult.value : null
  const fetchFailed =
    docsResult.status === "rejected" ||
    (docsResult.status === "fulfilled" && !!docsResult.value.error)
  const processingIds = documents
    .filter((d) => ACTIVE_STATUSES.has(d.status))
    .map((d) => d.id)

  return (
    <div className="flex-1 overflow-y-auto">
      <ProcessingGuard processingIds={processingIds} />
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-10">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
              Documents
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Upload PDFs and the agent will index sections and pages so you can
              chat with them.
            </p>
          </div>
          {usage && usage.plan === "free" && (
            <div className="flex items-center gap-2 border border-border bg-card px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-widest">
              <span className="size-1.5 bg-foreground" />
              {usage.documentCount} / {usage.documentLimit} used
            </div>
          )}
          {usage && usage.plan === "pro" && (
            <div className="flex items-center gap-2 border border-foreground/40 bg-card px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-widest">
              <span className="size-1.5 bg-foreground" />
              {usage.documentCount} uploaded · Unlimited
            </div>
          )}
        </header>

        {fetchFailed && (
          <div className="mt-6 flex items-start gap-3 border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p className="text-destructive">
              We couldn&rsquo;t load your documents — likely a transient
              Supabase issue. Refresh in a moment.
            </p>
          </div>
        )}

        {aiDisabled && (
          <div className="mt-6 flex items-start gap-3 border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>
              <strong>AI features are disabled for this deployment.</strong>{" "}
              {!aiEnv.configured && aiEnv.reason === "missing"
                ? "Set OPENROUTER_API_KEY in .env.local — document parsing requires it."
                : <>Clone the <a href="https://github.com/RakibulIslamm/docu_mind" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:opacity-80">repo</a> locally to try it.</>
              }
            </p>
          </div>
        )}

        <section className="mt-8">
          <UploadDropzone />
        </section>

        <section className="mt-10">
          <DocumentGrid documents={documents} />
        </section>
      </div>
    </div>
  )
}
