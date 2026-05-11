import "server-only"

import { streamText, stepCountIs, type ModelMessage } from "ai"
import { getDocumindModel } from "@/lib/ai/openrouter"
import { buildAgentTools, type ToolContext } from "@/lib/rag/tools"

const SYSTEM_PROMPT = `You are DocuMind, an AI assistant that answers questions about uploaded documents.

You have four tools for navigating documents:
- get_document_outline(documentId): see the table of contents (titles, summaries, page ranges)
- read_section(sectionId): read one section's full text
- search_document(documentId, query): keyword search, returns top pages with snippets
- read_pages(documentId, startPage, endPage): read raw page text (max 5 pages per call)

PROCESS:
1. ALWAYS call get_document_outline FIRST to learn the structure.
2. For broad questions ("summarize", "main points", "list sections"):
   pick 2–4 relevant sections from the outline and call read_section on each.
3. For specific terms the user mentions, call search_document with those
   keywords, then read_section for any promising hits.
4. read_pages is a LAST RESORT for narrow excerpts. Hard limits:
     • Maximum 3 read_pages calls per turn — never more.
     • Each call must target a tight range you have a reason to read,
       not "the next 5 pages".
     • NEVER walk the document sequentially in 5-page increments. That's
       a bug, not a strategy.

WHEN THE OUTLINE LOOKS THIN (e.g. titles like "Pages 1–10", "Pages 11–20",
or only one section): the structure detector failed for this PDF. In that
case, use search_document with a few keywords from the user's question
instead of trying to read every chunk. After 2 searches and at most 2
section reads, STOP and answer with whatever you found.

HARD STOP RULES:
- After 4 tool calls total, if you haven't started writing the answer, STOP.
  Compose the best answer you can from what you've gathered.
- After any read_pages, prefer to write the answer next rather than calling
  another tool.

ANSWER FORMAT:
- Be direct and specific. Quote the document where it helps.
- Cite inline using "Section 3.2 (page 14)" or "(page 42)" or "(pages 12–14)".
  When the conversation has more than one document, prefix the citation with
  the filename: "ContractA.pdf, Section 3.2 (page 14)".
  The frontend turns these into clickable links.
- For "summarize in N bullets" prompts, return exactly N bullets, each ending
  with a citation.
- If the answer genuinely isn't in the document, say so — don't speculate.

RESPONSE LENGTH:
- Your final answer MUST stay under 10,000 tokens (~7,500 words). Be
  concise. If the user asks for an exhaustive dump, deliver the most
  important points and offer to expand on request — never blow past
  the cap.

YOU MUST PRODUCE A NATURAL-LANGUAGE ANSWER. Tool calls are the means; the
written answer is the goal. Never end a turn with only tool calls.`

export type AgentRunOptions = {
  context: ToolContext
  messages: ModelMessage[]
  documents: Array<{ id: string; filename: string; totalPages: number | null }>
  rollingSummary?: string | null
  wasInterrupted?: boolean
}

export function runDocumentChatAgent({
  context,
  messages,
  documents,
  rollingSummary,
  wasInterrupted,
}: AgentRunOptions) {
  const docList = documents
    .map(
      (d, i) =>
        `${i + 1}. id=${d.id} filename="${d.filename}" totalPages=${d.totalPages ?? "?"}`,
    )
    .join("\n")

  const summaryBlock = rollingSummary
    ? `\n\nPRIOR CONVERSATION CONTEXT (summary of earlier turns — treat as authoritative background, do NOT re-derive what's already established here):\n${rollingSummary}\n`
    : ""

  const resumeBlock = wasInterrupted
    ? `\n\nIMPORTANT — RESUME MODE: The previous assistant turn was INTERRUPTED by the user pressing Stop before it finished. If the new user turn asks to "continue", says "go on", or otherwise signals to keep going, you MUST resume from exactly where the previous response left off. Do NOT restart, do NOT re-open with a new title, do NOT call get_document_outline again, do NOT repeat sections you already produced. Pick up at the next unwritten sentence/section and proceed forward only.\n`
    : ""

  const system = `${SYSTEM_PROMPT}

The current conversation is grounded in these documents (use these IDs in tool calls):
${docList}${summaryBlock}${resumeBlock}`

  return streamText({
    model: getDocumindModel(),
    system,
    messages,
    tools: buildAgentTools(context),
    // 15 steps: outline + 2 searches + 4 reads + retry headroom + final
    // answer. The prompt has a 4-tool soft stop earlier; this is the cap.
    stopWhen: stepCountIs(15),
    temperature: 0.2,
    maxOutputTokens: 15000,
  })
}
