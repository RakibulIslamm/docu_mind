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
- If the document has no headings, return ONE section with title="Document", level=1, start_page=1, end_page=<last>.
- Skip front-matter pages without titles (cover, copyright) by absorbing them into the first real section.
- Never invent sections that aren't visible in the text. Never invent page numbers.`

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
    return clampToDocument(object.sections, totalPages)
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      // Fall back to a single section spanning the whole document.
      return [
        {
          level: 1,
          section_number: null,
          title: "Document",
          start_page: 1,
          end_page: totalPages,
        },
      ]
    }
    throw error
  }
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
