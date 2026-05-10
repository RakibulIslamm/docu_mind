import "server-only"

import { generateObject, NoObjectGeneratedError } from "ai"
import { z } from "zod"
import { documindModel } from "@/lib/ai/openrouter"
import type { ExtractedPage } from "./extract-pages"

export const SectionOutlineItem = z.object({
  level: z
    .number()
    .int()
    .min(1)
    .max(4)
    .describe("Heading depth: 1 = H1 (top-level chapter), 2 = H2, etc."),
  section_number: z
    .string()
    .nullable()
    .describe("Numbered label like '3.2.1' or 'Chapter 4', if present."),
  title: z.string().min(1).describe("Section title verbatim."),
  start_page: z.number().int().min(1).describe("Page where the section begins."),
  end_page: z
    .number()
    .int()
    .min(1)
    .describe("Last page included in this section (inclusive)."),
})

export const StructureSchema = z.object({
  sections: z
    .array(SectionOutlineItem)
    .min(1)
    .describe(
      "Flat ordered list of sections in document order. Subsections come immediately after their parent.",
    ),
})

export type SectionOutline = z.infer<typeof SectionOutlineItem>

const SYSTEM_PROMPT = `You are a document-structure extractor.
Given the page-by-page text of a PDF, return its hierarchical outline as a flat ordered list of sections.

Rules:
- Use the visible structure: numbered headings (1, 1.1, 1.1.1), all-caps lines, font-shifted titles, "Chapter N", "Part N", appendices, etc.
- "level" reflects depth: 1 = top-level chapter / part, 2 = section, 3 = subsection, 4 = sub-subsection.
- Sections must appear in reading order. Children come after their parent.
- "start_page" and "end_page" are inclusive 1-based page numbers from the source.
- A section's end_page is the page just before the next sibling/parent starts (or the last page of the document for the final section).
- Cover the entire document — start with page 1 and end with the last page. No gaps, no overlaps.
- Skip front-matter pages without titles (cover, copyright) by absorbing them into the first real section.
- Never invent sections that aren't visible in the text. Never invent page numbers.

IMPORTANT — find structure even when there are no formal headings:
- If you see repeating patterns like "Idea 1", "Idea 2", "Topic 1", "Tip 1", or any recurring discrete units, treat each as a section.
- If the document is a list of distinct items (case studies, recipes, profiles, ideas), each item is its own section. Use the item title as the section title.
- If the topic clearly shifts every few pages (a new subject matter, a new product, a new person), break sections at the shift.
- Only as a last resort — when the document is genuinely a single continuous narrative with no structure — return 5 to 10 sections by splitting the document into roughly equal page ranges. Title each with a short summary of what's actually on those pages (e.g. "Background and motivation", "Methodology", "Results"). Do NOT just return one giant section.

Never return a single section that spans the whole document for a multi-page document. That's a failure mode.`

export async function detectStructure(
  pages: ExtractedPage[],
): Promise<SectionOutline[]> {
  const totalPages = pages.length
  if (totalPages === 0) return []

  // Long documents: send the first ~30 pages plus a sampled tail so the model
  // sees the spine without blowing the context window.
  const HEAD = 30
  const TAIL = 5
  const head = pages.slice(0, HEAD)
  const tail = totalPages > HEAD + TAIL ? pages.slice(-TAIL) : []
  const truncated = totalPages > HEAD + TAIL

  const corpus = [
    ...head.map(formatPage),
    truncated
      ? `\n--- [pages ${HEAD + 1}–${totalPages - TAIL} omitted for brevity] ---\n`
      : "",
    ...tail.map(formatPage),
  ].join("\n")

  const userPrompt = `The document has ${totalPages} pages total.${
    truncated ? " The middle pages were omitted; infer their structure from the head + tail you can see." : ""
  }

PAGES:
${corpus}

Return the outline.`

  try {
    const { object } = await generateObject({
      model: documindModel,
      schema: StructureSchema,
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      temperature: 0,
    })
    const clamped = clampToDocument(object.sections, totalPages)
    // If the LLM returned a degenerate outline (one section covering most of
    // the document), fall back to evenly-sized chunks so the agent has
    // manageable units to read instead of trying read_pages on the whole doc.
    if (isDegenerate(clamped, totalPages)) {
      return chunkFallback(totalPages)
    }
    return clamped
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      return chunkFallback(totalPages)
    }
    throw error
  }
}

function isDegenerate(
  sections: SectionOutline[],
  totalPages: number,
): boolean {
  if (totalPages < 8) return false // small docs are fine with one section
  if (sections.length === 0) return true
  if (sections.length === 1) {
    const span = sections[0].end_page - sections[0].start_page + 1
    return span >= totalPages * 0.7
  }
  return false
}

function chunkFallback(totalPages: number): SectionOutline[] {
  // Create 6–10 sections of roughly equal size so the agent can read in chunks.
  const targetSections = Math.min(10, Math.max(6, Math.ceil(totalPages / 10)))
  const pagesPerSection = Math.ceil(totalPages / targetSections)
  const sections: SectionOutline[] = []
  for (let i = 0; i < targetSections; i++) {
    const start = i * pagesPerSection + 1
    const end = Math.min(totalPages, (i + 1) * pagesPerSection)
    if (start > totalPages) break
    sections.push({
      level: 1,
      section_number: `${i + 1}`,
      title: `Pages ${start}–${end}`,
      start_page: start,
      end_page: end,
    })
  }
  return sections
}

function formatPage(p: ExtractedPage): string {
  // Bound per-page text to keep the context manageable.
  const MAX = 1500
  const body = p.content.length > MAX ? p.content.slice(0, MAX) + "…" : p.content
  return `--- PAGE ${p.page_number} ---\n${body}`
}

function clampToDocument(
  sections: SectionOutline[],
  totalPages: number,
): SectionOutline[] {
  return sections
    .map((s) => ({
      ...s,
      start_page: clamp(s.start_page, 1, totalPages),
      end_page: clamp(s.end_page, 1, totalPages),
    }))
    .filter((s) => s.end_page >= s.start_page)
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}
