"use client"

import { Bot, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { extractCitations } from "@/lib/rag/citations"
import { type Citation } from "./citations"
import { Markdown } from "./markdown"
import { ReasoningDisclosure } from "./reasoning-disclosure"
import { SourcesRow } from "./sources-row"
import type { ToolCallView } from "./tool-call"
import type { UIMessage } from "ai"

export type PersistedMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  toolCalls: ToolCallView[] | null
  citations: Citation[] | null
}

type Props = {
  messages: UIMessage[]
  isStreaming: boolean
  isPending?: boolean
  onCitationClick?: (citation: Citation) => void
}

export function MessageList({ messages, isStreaming, isPending, onCitationClick }: Props) {
  return (
    <div className="flex flex-col gap-8">
      {messages.map((m, i) => (
        <MessageBubble
          key={m.id}
          message={m}
          isLast={i === messages.length - 1}
          isStreaming={isStreaming}
          onCitationClick={onCitationClick}
        />
      ))}
      {isPending && (
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center bg-foreground text-background">
            <Bot className="size-3.5" />
          </div>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-block size-2 animate-pulse bg-foreground" />
            Thinking…
          </p>
        </div>
      )}
    </div>
  )
}

function MessageBubble({
  message,
  isLast,
  isStreaming,
  onCitationClick,
}: {
  message: UIMessage
  isLast: boolean
  isStreaming: boolean
  onCitationClick?: (citation: Citation) => void
}) {
  const isUser = message.role === "user"
  const text = message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("")
  const toolCalls: ToolCallView[] = message.parts
    .filter((p) => typeof p.type === "string" && p.type.startsWith("tool-"))
    .map((p) => {
      const part = p as unknown as {
        type: string
        toolCallId: string
        state?: string
        input?: unknown
        output?: unknown
        errorText?: string
      }
      return {
        toolCallId: part.toolCallId,
        toolName: part.type.replace(/^tool-/, ""),
        state: part.state,
        input: part.input,
        output: part.output,
        errorText: part.errorText,
      }
    })

  const citations = isUser ? [] : extractCitations(text)
  const showThinking =
    !isUser && !text && toolCalls.length === 0 && isStreaming && isLast

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="flex max-w-[85%] items-start gap-3">
          <div className="bg-foreground px-4 py-3 text-sm leading-relaxed text-background">
            <span className="whitespace-pre-wrap">{text}</span>
          </div>
          <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center bg-muted text-foreground">
            <User className="size-3.5" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center bg-foreground text-background">
        <Bot className="size-3.5" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {toolCalls.length > 0 && (
          <ReasoningDisclosure
            calls={toolCalls}
            isLive={isStreaming && isLast}
          />
        )}
        {text && (
          <div>
            <Markdown text={text} />
            <SourcesRow
              citations={citations}
              onCitationClick={onCitationClick}
            />
          </div>
        )}
        {showThinking && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-block size-2 animate-pulse bg-foreground" />
            Thinking…
          </p>
        )}
      </div>
    </div>
  )
}

export function persistedToUiMessages(persisted: PersistedMessage[]): UIMessage[] {
  return persisted.map((m) => {
    const parts: UIMessage["parts"] = []
    if (m.role === "assistant" && m.toolCalls) {
      for (const c of m.toolCalls) {
        parts.push({
          type: `tool-${c.toolName}`,
          toolCallId: c.toolCallId,
          state: (c.state as never) ?? ("output-available" as never),
          input: c.input,
          output: c.output,
          errorText: c.errorText,
        } as unknown as UIMessage["parts"][number])
      }
    }
    if (m.content) {
      parts.push({ type: "text", text: m.content, state: "done" } as never)
    }
    return {
      id: m.id,
      role: m.role,
      parts,
    } as UIMessage
  })
}
