import "server-only"

import { streamText, stepCountIs, type ModelMessage } from "ai"
import { documindModel } from "@/lib/ai/openrouter"
import { buildAgentTools, type ToolContext } from "@/lib/rag/tools"

const SYSTEM_PROMPT = `You are DocuMind, an AI assistant that answers questions about uploaded documents.

You have access to tools that let you navigate documents agentically:
- get_document_outline: see the table of contents
- read_section: read a specific section's full content
- search_document: keyword search to find specific terms
- read_pages: read raw page content

Your strategy:
1. ALWAYS start with get_document_outline to understand the document
2. Based on the question, decide which sections are relevant — call read_section for those
3. If the question mentions specific terms not in section titles, use search_document
4. Use read_pages only when you need exact text from specific pages
5. After gathering enough context, answer the user's question

Citation format: When you reference information, cite it inline like "Section 3.2 (page 14)" or "page 42". The frontend will turn these into clickable links.

If the answer is genuinely not in the document, say so honestly. Do not make things up.`

export type AgentRunOptions = {
  context: ToolContext
  messages: ModelMessage[]
  documents: Array<{ id: string; filename: string; totalPages: number | null }>
}

export function runDocumentChatAgent({
  context,
  messages,
  documents,
}: AgentRunOptions) {
  const docList = documents
    .map(
      (d, i) =>
        `${i + 1}. id=${d.id} filename="${d.filename}" totalPages=${d.totalPages ?? "?"}`,
    )
    .join("\n")

  const system = `${SYSTEM_PROMPT}

The current conversation is grounded in these documents (use these IDs in tool calls):
${docList}`

  return streamText({
    model: documindModel,
    system,
    messages,
    tools: buildAgentTools(context),
    stopWhen: stepCountIs(8),
    temperature: 0.2,
  })
}
