"use client"

import { memo, useDeferredValue } from "react"
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

type BubbleProps = {
  message: UIMessage
  isLast: boolean
  isStreaming: boolean
  onCitationClick?: (citation: Citation) => void
}

function MessageBubbleImpl({
  message,
  isLast,
  isStreaming,
  onCitationClick,
}: BubbleProps) {
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

  // During streaming the last message's text grows ~30-60×/s. useDeferredValue
  // lets React skip the heavy markdown re-parse when input is changing faster
  // than the browser can paint. For settled messages it's a no-op.
  const deferredText = useDeferredValue(text)

  const citations = isUser ? [] : extractCitations(deferredText)
  const showThinking =
    !isUser && !text && toolCalls.length === 0 && isStreaming && isLast

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="flex max-w-[85%] items-start gap-3">
          <div className="min-w-0 wrap-break-word bg-foreground px-4 py-3 text-sm leading-relaxed text-background">
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
        {deferredText && (
          <div className="min-w-0">
            <Markdown text={deferredText} />
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

// Memo so stable older messages skip re-render on every streamed token.
// Equality: bail unless this message changed (parts ref / isLast / isStreaming
// for the currently-streaming bubble), or the citation handler changed.
const MessageBubble = memo(MessageBubbleImpl, (prev, next) => {
  if (prev.onCitationClick !== next.onCitationClick) return false
  if (prev.message !== next.message) return false
  // Only the last bubble's `isStreaming` matters — flipping it on a stable
  // older bubble doesn't change what it renders.
  if (prev.isLast !== next.isLast) return false
  if (next.isLast && prev.isStreaming !== next.isStreaming) return false
  return true
})

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
