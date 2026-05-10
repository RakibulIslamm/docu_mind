"use client"

import { useMemo, useRef, useState, useEffect } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import {
  PanelRightClose,
  PanelRightOpen,
  Send,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  MessageList,
  persistedToUiMessages,
  type PersistedMessage,
} from "./message-list"
import {
  OutlineTree,
  type OutlineDocument,
  type OutlineNode,
} from "./outline-tree"
import { ReasoningPanel } from "./reasoning-panel"
import type { Citation } from "./citations"

type Props = {
  conversationId: string
  outline: OutlineDocument[]
  persistedMessages: PersistedMessage[]
}

const SUGGESTED_QUESTIONS = [
  "Summarize the document in 5 bullet points.",
  "What are the key conclusions?",
  "Find the section about pricing or cost.",
]

export function ChatWorkspace({
  conversationId,
  outline,
  persistedMessages,
}: Props) {
  const [input, setInput] = useState("")
  const [showReasoning, setShowReasoning] = useState(false)
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
  const transcriptRef = useRef<HTMLDivElement>(null)

  // Hydrate the chat with persisted history so reloads don't lose state.
  const initialMessages = useMemo<UIMessage[]>(
    () => persistedToUiMessages(persistedMessages),
    [persistedMessages],
  )

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages }) => ({
          body: { conversationId, messages },
        }),
      }),
    [conversationId],
  )

  const { messages, sendMessage, status, error } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport,
    onError: (err) => {
      toast.error(friendlyChatError(err))
    },
  })

  const isStreaming = status === "streaming" || status === "submitted"

  // Auto-scroll to bottom when new content arrives.
  useEffect(() => {
    const el = transcriptRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, isStreaming])

  const handleSend = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isStreaming) return
    setInput("")
    try {
      await sendMessage({ text: trimmed })
    } catch (e) {
      toast.error(friendlyChatError(e))
    }
  }

  const handleCitationClick = (citation: Citation) => {
    // Find a section that contains the cited page in any document.
    for (const doc of outline) {
      const match = findSectionForPage(doc.sections, citation.pageStart)
      if (match) {
        setActiveSectionId(match.sectionId)
        return
      }
    }
  }

  return (
    <div className="grid flex-1 grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[280px_1fr_360px]">
      {/* LEFT: Outline */}
      <aside className="hidden border-r border-border/60 lg:block">
        <div className="sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
          <OutlineTree
            outline={outline}
            activeSectionId={activeSectionId}
            onSectionClick={(node) => setActiveSectionId(node.sectionId)}
          />
        </div>
      </aside>

      {/* CENTER: Chat */}
      <section className="flex h-[calc(100vh-3.5rem)] flex-col">
        <div ref={transcriptRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-6 py-8">
            {messages.length === 0 ? (
              <EmptyState
                onSuggestion={handleSend}
                disabled={isStreaming}
              />
            ) : (
              <MessageList
                messages={messages}
                isStreaming={isStreaming}
                onCitationClick={handleCitationClick}
              />
            )}
            {error && (
              <div className="mt-6 border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {friendlyChatError(error)}
              </div>
            )}
          </div>
        </div>

        <Composer
          value={input}
          onChange={setInput}
          onSend={handleSend}
          disabled={isStreaming}
          showReasoning={showReasoning}
          onToggleReasoning={() => setShowReasoning((v) => !v)}
        />
      </section>

      {/* RIGHT: Reasoning (xl screens always; toggleable on smaller) */}
      <aside
        className={cn(
          "border-l border-border/60",
          showReasoning ? "block" : "hidden xl:block",
        )}
      >
        <div className="sticky top-14 h-[calc(100vh-3.5rem)]">
          <ReasoningPanel messages={messages} />
        </div>
      </aside>
    </div>
  )
}

function Composer({
  value,
  onChange,
  onSend,
  disabled,
  showReasoning,
  onToggleReasoning,
}: {
  value: string
  onChange: (v: string) => void
  onSend: (v: string) => void
  disabled: boolean
  showReasoning: boolean
  onToggleReasoning: () => void
}) {
  return (
    <div className="border-t border-border/60 bg-background">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-6 py-4">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSend(value)
          }}
          className="flex items-end gap-2"
        >
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                onSend(value)
              }
            }}
            placeholder="Ask anything about the document…"
            rows={1}
            className="max-h-40 min-h-[44px] resize-none"
            disabled={disabled}
          />
          <Button
            type="submit"
            size="icon-lg"
            disabled={disabled || !value.trim()}
            aria-label="Send message"
          >
            <Send />
          </Button>
        </form>
        <div className="flex items-center justify-between">
          <p className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">
            Enter to send · Shift+Enter for newline
          </p>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={onToggleReasoning}
            className="xl:hidden"
          >
            {showReasoning ? <PanelRightClose /> : <PanelRightOpen />}
            {showReasoning ? "Hide reasoning" : "Show reasoning"}
          </Button>
        </div>
      </div>
    </div>
  )
}

function EmptyState({
  onSuggestion,
  disabled,
}: {
  onSuggestion: (text: string) => void
  disabled: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center bg-foreground text-background">
        <Sparkles className="size-5" />
      </div>
      <div className="space-y-2">
        <h2 className="font-heading text-3xl font-semibold tracking-tight">
          Ask anything about the document
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          The agent will read the outline, fetch the right sections, and cite
          every answer back to a section and page.
        </p>
      </div>
      <div className="flex w-full max-w-md flex-col gap-2">
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            disabled={disabled}
            onClick={() => onSuggestion(q)}
            className="border border-border bg-card px-4 py-3 text-left text-sm transition-colors hover:bg-muted disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}

function findSectionForPage(
  nodes: OutlineNode[],
  page: number,
): OutlineNode | null {
  for (const n of nodes) {
    if (
      n.startPage !== null &&
      n.endPage !== null &&
      page >= n.startPage &&
      page <= n.endPage
    ) {
      const child = findSectionForPage(n.children, page)
      return child ?? n
    }
  }
  return null
}

function friendlyChatError(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e)
  if (/server action/i.test(m)) {
    return "Page got out of sync — refresh and try again."
  }
  if (/fetch failed|timeout|network/i.test(m)) {
    return "Network error — check your connection and retry."
  }
  if (/unauthorized/i.test(m)) {
    return "Your session expired. Please sign in again."
  }
  return m || "Something went wrong while talking to the agent."
}
