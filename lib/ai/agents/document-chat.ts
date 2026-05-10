import "server-only"

import { streamText, stepCountIs, type ModelMessage } from "ai"
import { documindModel } from "@/lib/ai/openrouter"
import { buildAgentTools, type ToolContext } from "@/lib/rag/tools"

const SYSTEM_PROMPT = `You are DocuMind, an AI assistant that answers questions about uploaded documents.

You have four tools for navigating documents:
- get_document_outline(documentId): see the table of contents (titles, summaries, page ranges)
- read_section(sectionId): read one section's full text
- search_document(documentId, query): keyword search, returns top pages with snippets
- read_pages(documentId, startPage, endPage): read raw page text (max 5 pages per call)

PROCESS:
1. ALWAYS call get_document_outline FIRST to learn the structure.
2. For broad questions ("summarize", "main points", "what is this about"):
   pick 2–4 relevant sections from the outline and call read_section on each.
   Do NOT use read_pages for broad questions — sections are higher-signal.
3. For specific terms or quotes the user mentions, call search_document
   with those keywords, then read_section for any promising hits.
4. Use read_pages only as a last resort, when neither sections nor search
   surface what you need. Stay within the 5-page limit per call.
5. Once you have enough context (usually after 2–4 tool calls), STOP calling
   tools and write your answer. Do not over-explore.

ANSWER FORMAT:
- Be direct and specific. Quote the document where it helps.
- Cite inline using "Section 3.2 (page 14)" or "(page 42)" or "(pages 12–14)".
  The frontend turns these into clickable links.
- For "summarize in N bullets" prompts, return exactly N bullets, each ending
  with a citation.
- If the answer genuinely isn't in the document, say so — don't speculate.

YOU MUST PRODUCE A NATURAL-LANGUAGE ANSWER. Tool calls are the means; the
written answer is the goal. Never end a turn with only tool calls.`

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
    // 12 steps gives the agent room: outline + ~3 reads + final answer,
    // with headroom for one or two tool errors.
    stopWhen: stepCountIs(12),
    temperature: 0.2,
  })
}
