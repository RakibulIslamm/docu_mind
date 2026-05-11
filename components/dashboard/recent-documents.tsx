import Link from "next/link"
import { ArrowUpRight, FileText, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { DashboardDocument } from "./document-card"

type Props = {
  documents: DashboardDocument[]
}

export function RecentDocuments({ documents }: Props) {
  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 border border-dashed border-border bg-card px-4 py-10 text-center">
        <div className="flex size-10 items-center justify-center bg-foreground/5 text-foreground">
          <FileText className="size-5" />
        </div>
        <p className="text-sm font-medium">No documents yet</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          Upload your first PDF to get started.
        </p>
        <Link
          href="/dashboard/documents"
          className="mt-2 text-xs font-semibold uppercase tracking-widest underline underline-offset-4 hover:no-underline"
        >
          Go to documents →
        </Link>
      </div>
    )
  }

  return (
    <ul className="flex flex-col divide-y divide-border border border-border bg-card">
      {documents.map((doc) => {
        const ready = doc.status === "ready"
        const failed = doc.status === "failed"
        const inFlight = doc.status === "pending" || doc.status === "processing"
        const href = ready
          ? `/dashboard/chat/new?documentId=${doc.id}`
          : "/dashboard/documents"
        return (
          <li key={doc.id}>
            <Link
              href={href}
              className="group/recentdoc flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted"
            >
              <div className="flex size-9 shrink-0 items-center justify-center bg-foreground/5 text-foreground">
                <FileText className="size-4" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span
                  className="truncate text-sm font-medium"
                  title={doc.filename}
                >
                  {doc.filename}
                </span>
                <span className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">
                  {doc.total_pages ? `${doc.total_pages} pages · ` : ""}
                  {formatDate(doc.created_at)}
                </span>
              </div>
              <Status status={doc.status} />
              <ArrowUpRight
                className={cn(
                  "size-3.5 shrink-0 text-muted-foreground transition-opacity",
                  ready
                    ? "opacity-0 group-hover/recentdoc:opacity-100"
                    : "opacity-0",
                )}
              />
              {(failed || inFlight) && (
                <span className="sr-only">
                  {failed ? "Failed" : "Processing"}
                </span>
              )}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function Status({ status }: { status: string }) {
  switch (status) {
    case "ready":
      return null
    case "processing":
    case "pending":
      return (
        <Badge variant="secondary" className="gap-1.5">
          <Loader2 className="size-3 animate-spin" />
          {status === "pending" ? "Queued" : "Processing"}
        </Badge>
      )
    case "failed":
      return <Badge variant="destructive">Failed</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const diffH = (Date.now() - d.getTime()) / (1000 * 60 * 60)
  if (diffH < 1) return "just now"
  if (diffH < 24) return `${Math.floor(diffH)}h ago`
  if (diffH < 24 * 7) return `${Math.floor(diffH / 24)}d ago`
  return d.toLocaleDateString()
}
