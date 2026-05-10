import { convertToModelMessages, type UIMessage } from "ai"
import { z } from "zod"
import { getUser } from "@/lib/auth/dal"
import { createClient } from "@/lib/supabase/server"
import { runDocumentChatAgent } from "@/lib/ai/agents/document-chat"
import { extractCitations } from "@/lib/rag/citations"
import { describeLimit, getUserUsage } from "@/lib/billing/limits"

const RequestSchema = z.object({
  conversationId: z.string().uuid(),
  messages: z.array(z.any()),
})

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

  // Free-tier question gate.
  const usage = await getUserUsage(supabase, user.id)
  if (!usage.canAsk) {
    return Response.json(
      {
        error: describeLimit("question_limit", usage),
        limitReached: "question_limit",
      },
      { status: 402 },
    )
  }

  // Authorize the conversation.
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

  // useChat sends the full UI message history (hydrated from DB on page load),
  // so the client is the source of truth. No need to re-merge with DB here.
  const modelMessages = await convertToModelMessages(uiMessages)

  const result = runDocumentChatAgent({
    context: {
      supabase,
      userId: user.id,
      documentIds: ready.map((d) => d.id),
    },
    messages: modelMessages,
    documents: ready.map((d) => ({
      id: d.id,
      filename: d.filename,
      totalPages: d.total_pages,
    })),
  })

  return result.toUIMessageStreamResponse({
    onFinish: async ({ responseMessage, isAborted }) => {
      if (isAborted) return

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
      // Persist even if assistantText is empty — at least we record the
      // tool-call attempt so the user can see what happened on reload.
      rows.push({
        conversation_id: conversation.id,
        role: "assistant",
        content: assistantText,
        tool_calls: toolCalls.length > 0 ? toolCalls : null,
        citations: citations.length > 0 ? citations : null,
      })

      const { error } = await supabase.from("messages").insert(rows)
      if (error) {
        console.error("[chat] failed to persist messages:", error.message)
      }

      // Auto-title from the first user question (only if this is the first
      // turn — i.e., the conversation now has exactly one user message).
      if (userText) {
        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", conversation.id)
          .eq("role", "user")
        if (count === 1) {
          const newTitle = userText.replace(/\s+/g, " ").trim().slice(0, 80)
          await supabase
            .from("conversations")
            .update({ title: newTitle })
            .eq("id", conversation.id)
        }
      }
    },
  })
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
