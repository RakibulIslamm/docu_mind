import "server-only"

import { generateText } from "ai"
import { getDocumindModel } from "@/lib/ai/openrouter"
import type { ExtractedPage } from "./extract-pages"
import type { SectionOutline } from "./detect-structure"

export type EnrichedSection = SectionOutline & {
  position: number
  parent_index: number | null
  content: string
  content_summary: string | null
}

const BATCH_SIZE = 5
const MAX_SUMMARY_INPUT = 8000

export async function buildSections(
  outline: SectionOutline[],
  pages: ExtractedPage[],
): Promise<EnrichedSection[]> {
  const pageByNumber = new Map<number, string>(
    pages.map((p) => [p.page_number, p.content]),
  )

  // 1. Concatenate page text for each section + assign position.
  const withContent = outline.map<EnrichedSection>((section, index) => {
    const buf: string[] = []
    for (let p = section.start_page; p <= section.end_page; p++) {
      const t = pageByNumber.get(p)
      if (t) buf.push(t)
    }
    return {
      ...section,
      position: index,
      parent_index: findParentIndex(outline, index),
      content: buf.join("\n\n"),
      content_summary: null,
    }
  })

  // 2. Generate one-sentence summaries in parallel batches.
  for (let i = 0; i < withContent.length; i += BATCH_SIZE) {
    const batch = withContent.slice(i, i + BATCH_SIZE)
    const summaries = await Promise.all(batch.map(summarizeSection))
    summaries.forEach((s, j) => {
      withContent[i + j].content_summary = s
    })
  }

  return withContent
}

function findParentIndex(
  outline: SectionOutline[],
  index: number,
): number | null {
  const me = outline[index]
  if (me.level <= 1) return null
  for (let i = index - 1; i >= 0; i--) {
    if (outline[i].level < me.level) return i
  }
  return null
}

async function summarizeSection(
  section: EnrichedSection,
): Promise<string | null> {
  const trimmed = section.content.slice(0, MAX_SUMMARY_INPUT).trim()
  if (!trimmed) return null

  try {
    const { text } = await generateText({
      model: getDocumindModel(),
      system:
        "You write one-sentence summaries of document sections. Be concrete and specific. Never start with 'This section'. Maximum 25 words. Output the sentence only — no preamble, no quotes.",
      prompt: `Section title: ${section.title}\n\nSection text:\n${trimmed}\n\nOne-sentence summary:`,
      temperature: 0.2,
    })
    return text.trim().replace(/^["'\s]+|["'\s]+$/g, "") || null
  } catch {
    return null
  }
}
