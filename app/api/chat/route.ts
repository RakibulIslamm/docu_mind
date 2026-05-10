import {
  convertToModelMessages,
  type UIMessage,
  type ModelMessage,
} from "ai"
import { z } from "zod"
import { getUser } from "@/lib/auth/dal"
import { createClient } from "@/lib/supabase/server"
import { runDocumentChatAgent } from "@/lib/ai/agents/document-chat"
import { extractCitations } from "@/lib/rag/citations"

const RequestSchema = z.object({
  conversationId: z.string().uuid(),
  messages: z.array(z.any()), // UIMessage shape — validated by SDK
})

const HISTORY_LIMIT = 10

export async function POST(req: Request) {
  const user = await getUser()
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return Response.json(
      { error: "OPENROUTER_API_KEY is not configured on the server." },
      { status: 500 },
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    )
  }
  const { conversationId, messages: rawMessages } = parsed.data
  const uiMessages = rawMessages as UIMessage[]

  const supabase = await createClient()

  // Load + authorize the conversation.
  const { data: conversation, error: convoErr } = await supabase
    .from("conversations")
    .select("id, user_id, document_ids")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .single()
  if (convoErr || !conversation) {
    return Response.json(
      { error: "Conversation not found." },
      { status: 404 },
    )
  }

  const documentIds = (conversation.document_ids ?? []) as string[]
  if (documentIds.length === 0) {
    return Response.json(
      { error: "Conversation has no attached documents." },
      { status: 400 },
    )
  }

  // Hydrate document metadata for the system prompt.
  const { data: docs, error: docsErr } = await supabase
    .from("documents")
    .select("id, filename, total_pages, status")
    .in("id", documentIds)
  if (docsErr || !docs) {
    return Response.json(
      { error: "Failed to load attached documents." },
      { status: 500 },
    )
  }
  const ready = docs.filter((d) => d.status === "ready")
  if (ready.length === 0) {
    return Response.json(
      {
        error:
          "All attached documents are still processing or failed. Try again once they're ready.",
      },
      { status: 400 },
    )
  }

  // Pull persisted history (older than what the client sent).
  const { data: history } = await supabase
    .from("messages")
    .select("role, content, created_at")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT)

  const persistedMessages: ModelMessage[] = (history ?? [])
    .reverse()
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }))

  // The client's UIMessages include the just-sent user message and the
  // current in-flight assistant turn. Append them to the persisted history.
  const liveMessages = await convertToModelMessages(uiMessages)

  // De-dupe: if the client's first message is the same role+text as the last
  // persisted message, drop it. This prevents duplication when useChat is
  // initialized with persisted messages.
  const merged = mergeHistories(persistedMessages, liveMessages)

  const result = runDocumentChatAgent({
    context: { supabase, userId: user.id, documentIds: ready.map((d) => d.id) },
    messages: merged,
    documents: ready.map((d) => ({
      id: d.id,
      filename: d.filename,
      totalPages: d.total_pages,
    })),
  })

  return result.toUIMessageStreamResponse({
    onFinish: async ({ responseMessage, isAborted }) => {
      if (isAborted) return

      // Persist the user's last message and the assistant's response.
      const lastUser = [...uiMessages].reverse().find((m) => m.role === "user")
      const userText = lastUser ? extractText(lastUser) : ""

      const assistantText = extractText(responseMessage)
      const toolCalls = collectToolCalls(responseMessage)
      const citations = extractCitations(assistantText)

      const rows: Array<{
        conversation_id: string
        role: "user" | "assistant"
        content: string
        tool_calls: unknown
        citations: unknown
      }> = []

      if (userText) {
        rows.push({
          conversation_id: conversation.id,
          role: "user",
          content: userText,
          tool_calls: null,
          citations: null,
        })
      }
      rows.push({
        conversation_id: conversation.id,
        role: "assistant",
        content: assistantText,
        tool_calls: toolCalls.length > 0 ? toolCalls : null,
        citations: citations.length > 0 ? citations : null,
      })

      if (rows.length > 0) {
        const { error } = await supabase.from("messages").insert(rows)
        if (error) {
          console.error("[chat] failed to persist messages:", error.message)
        }
      }
    },
  })
}

function mergeHistories(
  persisted: ModelMessage[],
  live: ModelMessage[],
): ModelMessage[] {
  if (persisted.length === 0) return live
  const last = persisted[persisted.length - 1]
  const first = live[0]
  if (
    first &&
    first.role === last.role &&
    typeof first.content === "string" &&
    typeof last.content === "string" &&
    first.content === last.content
  ) {
    return [...persisted, ...live.slice(1)]
  }
  return [...persisted, ...live]
}

function extractText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("")
    .trim()
}

function collectToolCalls(message: UIMessage) {
  return message.parts
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
        toolName: part.type.replace(/^tool-/, ""),
        toolCallId: part.toolCallId,
        state: part.state,
        input: part.input,
        output: part.output,
        errorText: part.errorText,
      }
    })
}
