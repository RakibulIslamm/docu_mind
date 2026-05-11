"use client"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { deleteDocument, reprocessDocument } from "@/app/dashboard/actions"

export type DashboardDocument = {
  id: string
  filename: string
  total_pages: number | null
  status: string
  error_message: string | null
  created_at: string
}

const POLL_INTERVAL_MS = 3000
const ACTIVE_STATUSES = new Set(["pending", "processing"])

export function DocumentCard({ doc: initial }: { doc: DashboardDocument }) {
  const router = useRouter()
  const [doc, setDoc] = useState(initial)
  const [isPending, startTransition] = useTransition()

  // Keep local state in sync if server data changes underneath us.
  useEffect(() => {
    setDoc(initial)
  }, [initial])

  // Poll the status endpoint while the doc is still being parsed.
  useEffect(() => {
    if (!ACTIVE_STATUSES.has(doc.status)) return

    let cancelled = false
    const tick = async () => {
      try {
        const res = await fetch(`/api/documents/${doc.id}/process`, {
          cache: "no-store",
        })
        if (!res.ok) return
        const next = (await res.json()) as Partial<DashboardDocument> & {
          id: string
          status: string
        }
        if (cancelled) return
        setDoc((prev) => ({
          ...prev,
          status: next.status,
          total_pages: next.total_pages ?? prev.total_pages,
          error_message: next.error_message ?? null,
        }))
        if (!ACTIVE_STATUSES.has(next.status)) {
          // Final state — refresh server-rendered card metadata.
          router.refresh()
        }
      } catch {
        // Network blip — try again next tick.
      }
    }

    const interval = setInterval(tick, POLL_INTERVAL_MS)
    void tick()
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [doc.id, doc.status, router])

  const isReady = doc.status === "ready"
  const isFailed = doc.status === "failed"
  const isActive = ACTIVE_STATUSES.has(doc.status)

  const cardBody = (
    <>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex size-10 items-center justify-center bg-foreground/5 text-foreground">
            <FileText className="size-5" />
          </div>
          {/* The whole card is wrapped in a <Link> below, so clicks on the
              menu trigger bubble up and navigate to the chat page. Stop the
              pointer + click events here so the menu opens instead. The
              menu items themselves are portaled outside the Link. */}
          <div
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
            }}
          >
            <DocumentMenu
              disabled={isPending}
              onReprocess={() =>
                startTransition(async () => {
                  try {
                    const r = await reprocessDocument(doc.id)
                    if (r.ok) {
                      toast.success("Reprocessing…")
                      setDoc((prev) => ({ ...prev, status: "pending" }))
                    } else {
                      toast.error(r.error)
                    }
                  } catch (e) {
                    toast.error(friendlyError(e))
                  }
                })
              }
              onDelete={() =>
                startTransition(async () => {
                  try {
                    const r = await deleteDocument(doc.id)
                    if (r.ok) {
                      toast.success("Deleted")
                      router.refresh()
                    } else {
                      toast.error(r.error ?? "Delete failed")
                    }
                  } catch (e) {
                    toast.error(friendlyError(e))
                  }
                })
              }
            />
          </div>
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
        <StatusBadge status={doc.status} />
        {isFailed && doc.error_message && (
          <p
            className="mt-3 line-clamp-2 text-xs text-destructive"
            title={doc.error_message}
          >
            {doc.error_message}
          </p>
        )}
      </CardContent>
    </>
  )

  return (
    <Card
      size="sm"
      className={cn(
        isReady && "transition-shadow hover:shadow-md",
        isActive && "animate-pulse-soft",
      )}
    >
      {isReady ? (
        <Link
          href={`/dashboard/chat/new?documentId=${doc.id}`}
          className="contents"
          aria-label={`Chat with ${doc.filename}`}
        >
          {cardBody}
        </Link>
      ) : (
        cardBody
      )}
    </Card>
  )
}

function friendlyError(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e)
  if (/server action/i.test(m)) {
    return "The page got out of sync — refresh and try again."
  }
  if (/fetch|network|timeout/i.test(m)) {
    return "Network error — check your connection and retry."
  }
  return m || "Action failed."
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "ready":
      return (
        <Badge variant="default" className="gap-1.5">
          <CheckCircle2 className="size-3" />
          Ready
        </Badge>
      )
    case "processing":
      return (
        <Badge variant="secondary" className="gap-1.5">
          <Loader2 className="size-3 animate-spin" />
          Processing
        </Badge>
      )
    case "pending":
      return (
        <Badge variant="secondary" className="gap-1.5">
          <Loader2 className="size-3 animate-spin" />
          Queued
        </Badge>
      )
    case "failed":
      return (
        <Badge variant="destructive" className="gap-1.5">
          <AlertTriangle className="size-3" />
          Failed
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function DocumentMenu({
  disabled,
  onReprocess,
  onDelete,
}: {
  disabled: boolean
  onReprocess: () => void
  onDelete: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Document actions"
            disabled={disabled}
          />
        }
      >
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem
          onClick={(event) => {
            event.preventDefault()
            onReprocess()
          }}
        >
          <RefreshCw data-icon="inline-start" />
          Reprocess
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onClick={(event) => {
            event.preventDefault()
            onDelete()
          }}
        >
          <Trash2 data-icon="inline-start" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

