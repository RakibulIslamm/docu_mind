"use client"

import { Activity } from "lucide-react"
import { ToolCallItem, type ToolCallView } from "./tool-call"
import type { UIMessage } from "ai"

type Props = {
  messages: UIMessage[]
}

export function ReasoningPanel({ messages }: Props) {
  // Flatten all tool calls (across the whole conversation) into one feed.
  const calls: ToolCallView[] = []
  for (const m of messages) {
    if (m.role !== "assistant") continue
    for (const part of m.parts) {
      if (typeof part.type !== "string" || !part.type.startsWith("tool-"))
        continue
      const p = part as unknown as {
        type: string
        toolCallId: string
        state?: string
        input?: unknown
        output?: unknown
        errorText?: string
      }
      calls.push({
        toolCallId: p.toolCallId,
        toolName: p.type.replace(/^tool-/, ""),
        state: p.state,
        input: p.input,
        output: p.output,
        errorText: p.errorText,
      })
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <Activity className="size-4 text-foreground" />
        <h2 className="text-xs font-semibold uppercase tracking-widest">
          Agent reasoning
        </h2>
        <span className="ml-auto text-[0.65rem] uppercase tracking-widest text-muted-foreground">
          {calls.length} call{calls.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {calls.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Tool calls will stream in here as the agent navigates the document.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {calls.map((c) => (
              <li key={c.toolCallId}>
                <ToolCallItem call={c} defaultOpen={false} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
