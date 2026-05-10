"use client"

import { useState } from "react"
import { Brain, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { ToolPill } from "./tool-pill"
import type { ToolCallView } from "./tool-call"

type Props = {
  calls: ToolCallView[]
  /** True if this assistant message is the one currently streaming. */
  isLive: boolean
}

/**
 * A single collapsible row that summarises the agent's tool calls inline.
 * Default closed; click to expand the full pill list. While streaming, shows
 * a pulsing indicator and the current tool name instead of a step count.
 *
 * Lives in the chat transcript itself; full per-call detail is also always
 * available in the right "Agent reasoning" panel.
 */
export function ReasoningDisclosure({ calls, isLive }: Props) {
  const [open, setOpen] = useState(false)
  if (calls.length === 0) return null

  const active = isLive ? findActiveCall(calls) : null
  const summary = isLive
    ? active
      ? humanize(active)
      : "Thinking…"
    : `Reasoned across ${calls.length} step${calls.length === 1 ? "" : "s"}`

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "group/disclosure inline-flex items-center gap-2 self-start border border-border bg-card px-2.5 py-1.5 text-[0.7rem] font-medium text-muted-foreground transition-colors",
          "hover:border-foreground/40 hover:bg-muted hover:text-foreground",
          open && "bg-muted text-foreground",
        )}
        aria-expanded={open}
      >
        {isLive ? (
          <span className="relative flex size-2 items-center justify-center">
            <span className="absolute inline-flex size-2 animate-ping rounded-full bg-foreground opacity-60" />
            <span className="relative inline-flex size-1.5 rounded-full bg-foreground" />
          </span>
        ) : (
          <Brain className="size-3.5" />
        )}
        <span className="uppercase tracking-widest">{summary}</span>
        <ChevronDown
          className={cn(
            "size-3 shrink-0 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="flex flex-wrap items-center gap-1.5 border-l-2 border-border pl-3">
          {calls.map((c) => (
            <ToolPill key={c.toolCallId} call={c} />
          ))}
        </div>
      )}
    </div>
  )
}

function findActiveCall(calls: ToolCallView[]): ToolCallView | null {
  // Last call in an `input-*` state is the one currently running.
  for (let i = calls.length - 1; i >= 0; i--) {
    const s = calls[i].state ?? ""
    if (s.startsWith("input")) return calls[i]
  }
  return calls[calls.length - 1] ?? null
}

function humanize(call: ToolCallView): string {
  const input = call.input as Record<string, unknown> | undefined
  switch (call.toolName) {
    case "get_document_outline":
      return "Reading outline"
    case "read_section":
      return "Reading section"
    case "search_document":
      return input?.query
        ? `Searching for “${truncate(String(input.query), 32)}”`
        : "Searching"
    case "read_pages":
      return `Reading pages ${input?.startPage}–${input?.endPage}`
    default:
      return call.toolName
  }
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + "…" : s
}
