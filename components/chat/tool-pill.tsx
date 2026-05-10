"use client"

import {
  CircleAlert,
  CircleCheck,
  FileSearch,
  ListTree,
  Loader2,
  ScrollText,
  Search,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { ToolCallView } from "./tool-call"

const META: Record<string, { verb: string; icon: typeof Search }> = {
  get_document_outline: { verb: "Reading outline", icon: ListTree },
  read_section: { verb: "Reading section", icon: ScrollText },
  search_document: { verb: "Searching", icon: Search },
  read_pages: { verb: "Reading pages", icon: FileSearch },
}

type Props = {
  call: ToolCallView
  /** When true, show as a compact in-message badge. */
  compact?: boolean
  className?: string
}

export function ToolPill({ call, compact = true, className }: Props) {
  const meta = META[call.toolName] ?? { verb: call.toolName, icon: Search }
  const Icon = meta.icon
  const status = describeStatus(call)
  const detail = formatDetail(call)

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border border-border bg-muted/40 px-2 py-1 text-[0.7rem] font-medium",
        status === "error" && "border-destructive/40 bg-destructive/5 text-destructive",
        status === "running" && "bg-foreground/5",
        status === "done" && "text-muted-foreground",
        compact ? "" : "px-3 py-1.5 text-xs",
        className,
      )}
      title={call.errorText ?? detail ?? meta.verb}
    >
      <span className="flex size-3.5 shrink-0 items-center justify-center">
        {status === "running" ? (
          <Loader2 className="size-3 animate-spin" />
        ) : status === "error" ? (
          <CircleAlert className="size-3" />
        ) : status === "done" ? (
          <CircleCheck className="size-3" />
        ) : (
          <Icon className="size-3" />
        )}
      </span>
      <span className="truncate uppercase tracking-widest">{meta.verb}</span>
      {detail && (
        <span className="truncate font-mono normal-case tracking-normal text-muted-foreground">
          · {detail}
        </span>
      )}
    </span>
  )
}

function describeStatus(call: ToolCallView): "running" | "done" | "error" | "idle" {
  if (call.errorText) return "error"
  const s = call.state ?? ""
  if (s === "output-error") return "error"
  if (s.startsWith("output")) return "done"
  if (s.startsWith("input")) return "running"
  if (call.output !== undefined) return "done"
  return "idle"
}

function formatDetail(call: ToolCallView): string | null {
  const input = call.input as Record<string, unknown> | undefined
  if (!input) return null
  switch (call.toolName) {
    case "search_document":
      return `“${truncate(String(input.query ?? ""), 36)}”`
    case "read_pages":
      return `${input.startPage}–${input.endPage}`
    case "read_section":
      return null
    case "get_document_outline":
      return null
    default:
      return null
  }
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + "…" : s
}
