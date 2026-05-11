import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { extractPages } from "./extract-pages"
import { detectStructure } from "./detect-structure"
import { buildSections } from "./build-sections"

type ProcessResult =
  | { ok: true; totalPages: number; sectionCount: number }
  | { ok: false; error: string }

/**
 * End-to-end parse pipeline. Idempotent — wipes any prior pages/sections
 * for the doc before re-inserting, so it's safe to retry.
 */
export async function processDocument(documentId: string): Promise<ProcessResult> {
  const supabase = createAdminClient()

  const { data: doc, error: fetchErr } = await supabase
    .from("documents")
    .select("id, user_id, file_path, status")
    .eq("id", documentId)
    .single()

  if (fetchErr || !doc) {
    return { ok: false, error: fetchErr?.message ?? "Document not found" }
  }

  await supabase
    .from("documents")
    .update({ status: "processing", error_message: null })
    .eq("id", documentId)

  try {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error(
        "OPENROUTER_API_KEY is not set. Add it to .env.local and restart the dev server.",
      )
    }

    // Wipe any leftover state from a prior failed run.
    await Promise.all([
      supabase.from("document_pages").delete().eq("document_id", documentId),
      supabase.from("document_sections").delete().eq("document_id", documentId),
    ])

    // Step A — download + extract pages.
    const { data: blob, error: dlErr } = await supabase.storage
      .from("documents")
      .download(doc.file_path)
    if (dlErr || !blob) {
      throw new Error(dlErr?.message ?? "Failed to download PDF from storage")
    }
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const { totalPages, pages } = await extractPages(bytes)

    if (pages.length === 0 || totalPages === 0) {
      throw new Error("PDF contained no extractable text")
    }

    // Insert pages in chunks (Supabase has a row limit per request).
    await insertInChunks(
      "document_pages",
      pages.map((p) => ({
        document_id: documentId,
        user_id: doc.user_id,
        page_number: p.page_number,
        content: p.content,
      })),
      supabase,
    )

    // Step B — outline.
    const outline = await detectStructure(pages)

    // Step C — content + summaries.
    const enriched = await buildSections(outline, pages)

    // Insert sections in two passes so we can wire up parent_id with real UUIDs.
    type InsertedSection = { id: string; position: number }
    const ids: string[] = []
    for (const section of enriched) {
      const { data, error } = await supabase
        .from("document_sections")
        .insert({
          document_id: documentId,
          user_id: doc.user_id,
          parent_id:
            section.parent_index !== null ? ids[section.parent_index] : null,
          position: section.position,
          level: section.level,
          section_number: section.section_number,
          title: section.title,
          start_page: section.start_page,
          end_page: section.end_page,
          content: section.content,
          content_summary: section.content_summary,
        })
        .select("id, position")
        .single<InsertedSection>()

      if (error || !data) {
        throw new Error(error?.message ?? "Section insert failed")
      }
      ids.push(data.id)
    }

    await supabase
      .from("documents")
      .update({
        status: "ready",
        total_pages: totalPages,
        error_message: null,
      })
      .eq("id", documentId)

    return { ok: true, totalPages, sectionCount: enriched.length }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await supabase
      .from("documents")
      .update({ status: "failed", error_message: message })
      .eq("id", documentId)
    return { ok: false, error: message }
  }
}

async function insertInChunks(
  table: "document_pages" | "document_sections",
  rows: Record<string, unknown>[],
  supabase: ReturnType<typeof createAdminClient>,
) {
  const CHUNK = 100
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK)
    const { error } = await supabase.from(table).insert(slice)
    if (error) throw new Error(`${table} insert failed: ${error.message}`)
  }
}
