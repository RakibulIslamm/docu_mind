"use client"

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import {
  AlertTriangle,
  Send,
  FileText,
  ListTree,
  PanelRightClose,
  PanelRightOpen,
  Sparkles,
  Square,
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
import { ToolPill } from "./tool-pill"
import type { ToolCallView } from "./tool-call"
import type { Citation } from "./citations"
import { UpgradeDialog } from "@/components/dashboard/upgrade-dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

type Props = {
  conversationId: string
  outline: OutlineDocument[]
  persistedMessages: PersistedMessage[]
  aiDisabled?: boolean
  aiDisabledReason?: "disabled" | "missing"
}

const SUGGESTED_QUESTIONS = [
  "Summarize the document in 5 bullet points.",
  "What are the key conclusions?",
  "List the main sections and what each covers.",
]

export function ChatWorkspace({
  conversationId,
  outline,
  persistedMessages,
  aiDisabled = false,
  aiDisabledReason,
}: Props) {
  const [input, setInput] = useState("")
  const [showReasoning, setShowReasoning] = useState(false)
  const [mobileReasoningOpen, setMobileReasoningOpen] = useState(false)
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const transcriptRef = useRef<HTMLDivElement>(null)

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

  const { messages, sendMessage, status, error, stop } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport,
    onError: (err) => {
      const m = err instanceof Error ? err.message : String(err)
      // The 402 response body includes a `limitReached` field. The AI SDK
      // surfaces the body as the error message — sniff it.
      if (/question[_ ]limit|limitReached/i.test(m)) {
        setUpgradeOpen(true)
        return
      }
      toast.error(friendlyChatError(err))
    },
  })

  const isStreaming = status === "streaming" || status === "submitted"

  // Find the live (in-flight) tool call to show in the status strip.
  const liveTool = findLiveTool(messages, isStreaming)

  // Auto-scroll on new content.
  useEffect(() => {
    const el = transcriptRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
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
    for (const doc of outline) {
      const match = findSectionForPage(doc.sections, citation.pageStart)
      if (match) {
        setActiveSectionId(match.sectionId)
        return
      }
    }
  }

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)_340px]">
      <UpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        reason="question_limit"
      />
      {/* LEFT: Outline (xl+) */}
      <aside className="hidden h-full min-h-0 overflow-y-auto border-r border-border/60 bg-muted/20 xl:block">
        <OutlineTree
          outline={outline}
          activeSectionId={activeSectionId}
          onSectionClick={(node) => setActiveSectionId(node.sectionId)}
        />
      </aside>

      {/* CENTER: Chat */}
      <section className="flex h-full min-h-0 min-w-0 flex-col">
        {aiDisabled && (
          <div className="flex shrink-0 items-start gap-2.5 border-b border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span>
              <strong>AI features are disabled for this deployment.</strong>{" "}
              {aiDisabledReason === "missing"
                ? "Set OPENROUTER_API_KEY in .env.local to enable chat."
                : <>Clone the <a href="https://github.com/RakibulIslamm/docu_mind" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:opacity-80">repo</a> locally to try it.</>
              }
            </span>
          </div>
        )}
        {/* Outline trigger when the xl column is hidden */}
        <div className="flex shrink-0 items-center gap-2 border-b border-border/60 bg-background px-4 py-2 xl:hidden">
          <Sheet>
            <SheetTrigger
              render={
                <Button variant="ghost" size="xs">
                  <ListTree />
                  Outline
                </Button>
              }
            />
            <SheetContent side="left" className="w-80 p-0">
              <SheetHeader className="px-4 py-3">
                <SheetTitle>Document outline</SheetTitle>
              </SheetHeader>
              <div className="h-[calc(100dvh-4rem)] overflow-y-auto pb-4">
                <OutlineTree
                  outline={outline}
                  activeSectionId={activeSectionId}
                  onSectionClick={(node) => setActiveSectionId(node.sectionId)}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
        <div ref={transcriptRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
            {messages.length === 0 ? (
              <EmptyState
                outline={outline}
                onSuggestion={handleSend}
                disabled={isStreaming}
              />
            ) : (
              <MessageList
                messages={messages}
                isStreaming={isStreaming}
                isPending={isStreaming && messages.at(-1)?.role === "user"}
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

        {/* {liveTool && (
          <div className="border-t border-border/60 bg-muted/40 px-4 py-2 sm:px-6">
            <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3">
              <ToolPill call={liveTool} compact={false} />
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={stop}
                aria-label="Stop generating"
              >
                <Square />
                Stop
              </Button>
            </div>
          </div>
        )} */}

        <Composer
          value={input}
          onChange={setInput}
          onSend={handleSend}
          onStop={stop}
          isStreaming={isStreaming}
          disabled={aiDisabled}
          showReasoning={showReasoning}
          onToggleReasoning={() => setShowReasoning((v) => !v)}
          onOpenMobileReasoning={() => setMobileReasoningOpen(true)}
        />
      </section>

      {/* RIGHT: Reasoning inline panel — xl+ only */}
      <aside className="hidden xl:block h-full min-h-0 overflow-hidden border-l border-border/60 bg-muted/20">
        <ReasoningPanel messages={messages} />
      </aside>

      {/* Mobile reasoning sheet */}
      <Sheet open={mobileReasoningOpen} onOpenChange={setMobileReasoningOpen}>
        <SheetContent side="right" className="w-[85vw] max-w-xs p-0">
          <SheetHeader className="border-b border-border/60 px-4 py-3">
            <SheetTitle>Agent reasoning</SheetTitle>
          </SheetHeader>
          <div className="h-[calc(100dvh-4rem)] overflow-y-auto">
            <ReasoningPanel messages={messages} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function Composer({
  value,
  onChange,
  onSend,
  onStop,
  isStreaming,
  disabled = false,
  showReasoning,
  onToggleReasoning,
  onOpenMobileReasoning,
}: {
  value: string
  onChange: (v: string) => void
  onSend: (v: string) => void
  onStop: () => void
  isStreaming: boolean
  disabled?: boolean
  showReasoning: boolean
  onToggleReasoning: () => void
  onOpenMobileReasoning: () => void
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  // Auto-resize the textarea up to ~6 lines.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = "auto"
    const next = Math.min(el.scrollHeight, 168)
    el.style.height = `${next}px`
  }, [value])

  const canSend = value.trim().length > 0 && !isStreaming && !disabled

  return (
    <div className="border-t border-border/60 bg-background">
      <div className="mx-auto w-full max-w-3xl px-3 py-3 sm:px-6 sm:py-4">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSend(value)
          }}
          className={cn(
            "flex items-end gap-2 border border-border bg-card p-2 transition-colors",
            "focus-within:border-foreground",
          )}
        >
          <Textarea
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                if (canSend) onSend(value)
              }
            }}
            placeholder={disabled ? "Chat is unavailable — AI is disabled." : "Ask anything about the document…"}
            rows={1}
            className="min-h-9 resize-none border-0 bg-transparent px-2 py-2 text-sm leading-relaxed shadow-none focus-visible:ring-0"
            disabled={isStreaming || disabled}
          />
          {isStreaming ? (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={onStop}
              aria-label="Stop generating"
            >
              <Square className="size-3.5 fill-current" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="sm"
              disabled={!canSend}
              aria-label="Send message"
            >
              <Send className="size-3.5" />
            </Button>
          )}
        </form>
        <div className="mt-2 flex items-center justify-between">
          <p className="hidden text-[0.65rem] uppercase tracking-widest text-muted-foreground sm:block">
            Enter to send · Shift+Enter for newline
          </p>
          <div className="flex items-center gap-2 sm:ml-auto">
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={onOpenMobileReasoning}
              className="xl:hidden"
            >
              <PanelRightOpen />
              Reasoning
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={onToggleReasoning}
              className="hidden xl:flex"
            >
              {showReasoning ? <PanelRightClose /> : <PanelRightOpen />}
              {showReasoning ? "Hide reasoning" : "Show reasoning"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function EmptyState({
  outline,
  onSuggestion,
  disabled,
}: {
  outline: OutlineDocument[]
  onSuggestion: (text: string) => void
  disabled: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-6 py-8 text-center sm:gap-8 sm:py-12">
      <div className="flex size-12 items-center justify-center bg-foreground text-background">
        <Sparkles className="size-5" />
      </div>
      <div className="space-y-2">
        <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Ask anything
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          The agent reads the outline, fetches the right sections, and cites
          every answer back to a section and page.
        </p>
      </div>

      {outline.length > 0 && (
        <div className="w-full max-w-md">
          <p className="mb-2 text-[0.65rem] uppercase tracking-widest text-muted-foreground">
            Chatting with
          </p>
          <ul className="flex flex-col divide-y divide-border border border-border bg-card">
            {outline.map((doc) => (
              <li
                key={doc.documentId}
                className="flex items-center gap-3 px-3 py-2.5 text-left"
              >
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate text-sm" title={doc.filename}>
                  {doc.filename}
                </span>
                {doc.totalPages && (
                  <span className="shrink-0 text-[0.65rem] uppercase tracking-widest text-muted-foreground">
                    {doc.totalPages}p
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex w-full max-w-md flex-col gap-2">
        <p className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">
          Try asking
        </p>
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            disabled={disabled}
            onClick={() => onSuggestion(q)}
            className="border border-border bg-card px-4 py-3 text-left text-sm transition-colors hover:bg-muted hover:border-foreground/40 disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}

function findLiveTool(
  messages: UIMessage[],
  isStreaming: boolean,
): ToolCallView | null {
  if (!isStreaming) return null
  // Walk the most recent assistant message looking for a tool that's still
  // in an `input-*` state — that's the one running right now.
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.role !== "assistant") continue
    let lastTool: ToolCallView | null = null
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
      lastTool = {
        toolCallId: p.toolCallId,
        toolName: p.type.replace(/^tool-/, ""),
        state: p.state,
        input: p.input,
        output: p.output,
        errorText: p.errorText,
      }
      if (p.state === "input-streaming" || p.state === "input-available") {
        return lastTool
      }
    }
    return lastTool && (lastTool.state ?? "").startsWith("input")
      ? lastTool
      : null
  }
  return null
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
