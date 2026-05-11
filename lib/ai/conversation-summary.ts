import "server-only"

import { generateText } from "ai"
import { getDocumindModel } from "@/lib/ai/openrouter"

type RecentMessage = { role: "user" | "assistant"; content: string }

export type SummaryInput = {
  priorSummary: string | null
  recentMessages: RecentMessage[]
  documents: Array<{ filename: string }>
}

export async function generateRollingSummary(
  input: SummaryInput,
): Promise<string> {
  const docList = input.documents.map((d) => `- ${d.filename}`).join("\n")
  const prior = input.priorSummary
    ? `PRIOR SUMMARY:\n${input.priorSummary}\n\n`
    : ""
  const transcript = input.recentMessages
    .map((m) => `[${m.role.toUpperCase()}]\n${m.content}`)
    .join("\n\n")

  const { text } = await generateText({
    model: getDocumindModel(),
    temperature: 0.1,
    maxOutputTokens: 600,
    system:
      "You write concise running summaries of an AI document-Q&A conversation. " +
      "Output ~250 words max. Capture: (1) what the user is investigating, " +
      "(2) which sections / pages have already been examined, (3) the key " +
      "facts the assistant has established, (4) any open threads. Do NOT " +
      "echo verbatim quotes. Do NOT add commentary about the summary itself. " +
      "Write in clear neutral prose, no markdown headings.",
    prompt: `Documents in scope:\n${docList}\n\n${prior}NEW TURNS TO INCORPORATE:\n${transcript}\n\nWrite the updated running summary now.`,
  })

  return text.trim().slice(0, 3000)
}
