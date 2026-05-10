"use client"

import { Bot, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { extractCitations } from "@/lib/rag/citations"
import { CitedText, type Citation } from "./citations"
import { ToolCallItem, type ToolCallView } from "./tool-call"
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
  onCitationClick?: (citation: Citation) => void
}

export function MessageList({ messages, isStreaming, onCitationClick }: Props) {
  return (
    <div className="flex flex-col gap-6">
      {messages.map((m) => (
        <MessageBubble
          key={m.id}
          message={m}
          isStreaming={isStreaming}
          onCitationClick={onCitationClick}
        />
      ))}
    </div>
  )
}

function MessageBubble({
  message,
  isStreaming,
  onCitationClick,
}: {
  message: UIMessage
  isStreaming: boolean
  onCitationClick?: (citation: Citation) => void
}) {
  const isUser = message.role === "user"
  const text = message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("")
  const toolCalls = message.parts
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
      } satisfies ToolCallView
    })

  const citations = isUser ? [] : extractCitations(text)

  return (
    <div
      className={cn(
        "flex gap-3",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      {!isUser && (
        <div className="flex size-8 shrink-0 items-center justify-center bg-foreground text-background">
          <Bot className="size-4" />
        </div>
      )}
      <div
        className={cn(
          "flex max-w-[85%] flex-col gap-3",
          isUser && "items-end",
        )}
      >
        {!isUser && toolCalls.length > 0 && (
          <div className="flex w-full flex-col gap-1.5">
            {toolCalls.map((c) => (
              <ToolCallItem key={c.toolCallId} call={c} />
            ))}
          </div>
        )}
        {text && (
          <div
            className={cn(
              "px-4 py-3 text-sm leading-relaxed",
              isUser
                ? "bg-foreground text-background"
                : "border border-border bg-card text-foreground",
            )}
          >
            {isUser ? (
              <span className="whitespace-pre-wrap">{text}</span>
            ) : (
              <CitedText
                text={text}
                citations={citations}
                onCitationClick={onCitationClick}
              />
            )}
          </div>
        )}
        {!isUser && !text && toolCalls.length === 0 && isStreaming && (
          <div className="border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            Thinking…
          </div>
        )}
      </div>
      {isUser && (
        <div className="flex size-8 shrink-0 items-center justify-center bg-muted text-foreground">
          <User className="size-4" />
        </div>
      )}
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
