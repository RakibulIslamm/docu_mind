"use client"

import { useState } from "react"
import {
  ChevronDown,
  CircleAlert,
  CircleCheck,
  FileSearch,
  ListTree,
  Loader2,
  ScrollText,
  Search,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type ToolCallView = {
  toolCallId: string
  toolName: string
  state?: string
  input?: unknown
  output?: unknown
  errorText?: string
}

const TOOL_LABELS: Record<string, { label: string; icon: typeof Search }> = {
  get_document_outline: { label: "Reading outline", icon: ListTree },
  read_section: { label: "Reading section", icon: ScrollText },
  search_document: { label: "Searching document", icon: Search },
  read_pages: { label: "Reading pages", icon: FileSearch },
}

type Props = {
  call: ToolCallView
  defaultOpen?: boolean
}

export function ToolCallItem({ call, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const meta = TOOL_LABELS[call.toolName] ?? {
    label: call.toolName,
    icon: Search,
  }
  const Icon = meta.icon
  const status = describeStatus(call)
  const headline = formatHeadline(call, meta.label)

  return (
    <div className="border border-border bg-card text-xs">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted"
      >
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center bg-muted text-foreground",
            status === "running" && "text-foreground",
            status === "error" && "bg-destructive/10 text-destructive",
          )}
        >
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
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-xs font-semibold uppercase tracking-widest">
            {meta.label}
          </span>
          <span className="truncate font-mono text-[0.65rem] text-muted-foreground">
            {headline}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="border-t border-border/60 bg-muted/30 px-3 py-2 font-mono text-[0.7rem]">
          {call.errorText ? (
            <p className="text-destructive">{call.errorText}</p>
          ) : (
            <>
              {call.input !== undefined && (
                <div className="mb-2">
                  <p className="mb-1 uppercase tracking-widest text-muted-foreground">
                    Input
                  </p>
                  <pre className="overflow-x-auto whitespace-pre-wrap break-all text-foreground">
                    {safeStringify(call.input)}
                  </pre>
                </div>
              )}
              {call.output !== undefined && (
                <div>
                  <p className="mb-1 uppercase tracking-widest text-muted-foreground">
                    Output
                  </p>
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all text-foreground/90">
                    {summarizeOutput(call.toolName, call.output)}
                  </pre>
                </div>
              )}
              {call.output === undefined && status === "running" && (
                <p className="text-muted-foreground">Running…</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function describeStatus(call: ToolCallView): "running" | "done" | "error" | "idle" {
  if (call.errorText) return "error"
  const s = call.state ?? ""
  if (s.startsWith("output")) return s === "output-error" ? "error" : "done"
  if (s.startsWith("input")) return "running"
  if (call.output !== undefined) return "done"
  return "idle"
}

function formatHeadline(call: ToolCallView, fallback: string): string {
  const input = call.input as Record<string, unknown> | undefined
  if (!input) return fallback
  switch (call.toolName) {
    case "search_document":
      return `“${String(input.query ?? "").slice(0, 60)}”`
    case "read_section":
      return `section ${String(input.sectionId ?? "").slice(0, 8)}…`
    case "read_pages":
      return `pages ${input.startPage}–${input.endPage}`
    case "get_document_outline":
      return "TOC"
    default:
      return safeStringify(input).slice(0, 80)
  }
}

function summarizeOutput(toolName: string, output: unknown): string {
  // Trim long outputs — full content is in the database, this is for display.
  const json = safeStringify(output)
  return json.length > 4_000 ? json.slice(0, 4_000) + "\n…(truncated)" : json
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}
