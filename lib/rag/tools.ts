import "server-only"

import { tool } from "ai"
import { z } from "zod"
import type { SupabaseClient } from "@supabase/supabase-js"

export type ToolContext = {
  supabase: SupabaseClient
  userId: string
  documentIds: string[] // whitelist — tools refuse anything outside
}

// ---------- Tool 1: get_document_outline ----------
type OutlineRow = {
  id: string
  document_id: string
  parent_id: string | null
  position: number
  level: number
  section_number: string | null
  title: string
  start_page: number | null
  end_page: number | null
  content_summary: string | null
}

type OutlineNode = {
  sectionId: string
  sectionNumber: string | null
  title: string
  level: number
  startPage: number | null
  endPage: number | null
  summary: string | null
  children: OutlineNode[]
}

function buildOutlineTree(rows: OutlineRow[]): OutlineNode[] {
  const byId = new Map<string, OutlineNode>()
  const roots: OutlineNode[] = []
  const sorted = [...rows].sort((a, b) => a.position - b.position)
  for (const r of sorted) {
    const node: OutlineNode = {
      sectionId: r.id,
      sectionNumber: r.section_number,
      title: r.title,
      level: r.level,
      startPage: r.start_page,
      endPage: r.end_page,
      summary: r.content_summary,
      children: [],
    }
    byId.set(r.id, node)
    if (r.parent_id && byId.has(r.parent_id)) {
      byId.get(r.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

const getDocumentOutline = (ctx: ToolContext) =>
  tool({
    description:
      "Get the hierarchical outline (table of contents) of a document. " +
      "Returns nested sections with titles, summaries, and page ranges. " +
      "ALWAYS call this first to understand a document's structure before reading specific sections.",
    inputSchema: z.object({
      documentId: z
        .string()
        .uuid()
        .describe("ID of the document to outline. Must be one of the conversation's documents."),
    }),
    execute: async ({ documentId }) => {
      if (!ctx.documentIds.includes(documentId)) {
        return {
          error: `Document ${documentId} is not part of this conversation. Available documents: ${ctx.documentIds.join(", ")}`,
        }
      }

      const { data: doc, error: docErr } = await ctx.supabase
        .from("documents")
        .select("id, filename, total_pages, status")
        .eq("id", documentId)
        .single()
      if (docErr || !doc) {
        return { error: `Document not found: ${docErr?.message ?? "unknown"}` }
      }

      const { data: rows, error } = await ctx.supabase
        .from("document_sections")
        .select(
          "id, document_id, parent_id, position, level, section_number, title, start_page, end_page, content_summary",
        )
        .eq("document_id", documentId)
        .order("position", { ascending: true })
        .returns<OutlineRow[]>()

      if (error) return { error: error.message }

      return {
        document: {
          id: doc.id,
          filename: doc.filename,
          totalPages: doc.total_pages,
        },
        outline: buildOutlineTree(rows ?? []),
      }
    },
  })

// ---------- Tool 2: read_section ----------
const readSection = (ctx: ToolContext) =>
  tool({
    description:
      "Read the full text of a specific section, identified by its sectionId from the outline. " +
      "Use this once you've identified relevant sections via get_document_outline.",
    inputSchema: z.object({
      sectionId: z
        .string()
        .uuid()
        .describe("ID of the section to read (from get_document_outline)."),
    }),
    execute: async ({ sectionId }) => {
      const { data, error } = await ctx.supabase
        .from("document_sections")
        .select(
          "id, document_id, title, section_number, level, start_page, end_page, content",
        )
        .eq("id", sectionId)
        .single()

      if (error || !data) return { error: error?.message ?? "Section not found" }

      if (!ctx.documentIds.includes(data.document_id)) {
        return { error: "That section is not part of this conversation." }
      }

      // Cap content size returned to the LLM to keep token counts in check.
      const MAX = 12_000
      const content = (data.content ?? "").slice(0, MAX)
      const truncated = (data.content?.length ?? 0) > MAX

      return {
        sectionId: data.id,
        documentId: data.document_id,
        title: data.title,
        sectionNumber: data.section_number,
        level: data.level,
        pageRange: { start: data.start_page, end: data.end_page },
        content,
        truncated,
      }
    },
  })

// ---------- Tool 3: search_document ----------
const searchDocument = (ctx: ToolContext) =>
  tool({
    description:
      "Full-text search a document for keywords. Returns the top 5 most relevant pages with highlighted snippets. " +
      "Use this when the user asks about a specific term that may not appear in section titles.",
    inputSchema: z.object({
      documentId: z
        .string()
        .uuid()
        .describe("ID of the document to search."),
      query: z
        .string()
        .min(1)
        .max(200)
        .describe("Keywords to search for. Supports phrases, AND, OR, NOT (websearch syntax)."),
    }),
    execute: async ({ documentId, query }) => {
      if (!ctx.documentIds.includes(documentId)) {
        return {
          error: `Document ${documentId} is not part of this conversation.`,
        }
      }

      const { data, error } = await ctx.supabase.rpc("search_document_pages", {
        p_document_id: documentId,
        p_query: query,
        p_limit: 5,
      })

      if (error) return { error: error.message }

      type Hit = { page_number: number; rank: number; snippet: string }
      const hits = (data ?? []) as Hit[]

      return {
        query,
        results: hits.map((h) => ({
          pageNumber: h.page_number,
          score: Number(h.rank.toFixed(4)),
          // Convert <<word>> markers from ts_headline to a stable form.
          snippet: h.snippet.replace(/<<|>>/g, "**"),
        })),
      }
    },
  })

// ---------- Tool 4: read_pages ----------
const MAX_PAGES_PER_CALL = 5

const readPages = (ctx: ToolContext) =>
  tool({
    description:
      `Read raw text from a contiguous page range. Max ${MAX_PAGES_PER_CALL} pages per call (inclusive). ` +
      "If you request more, the range is silently clamped to the first " +
      `${MAX_PAGES_PER_CALL} pages and a 'clamped' flag is returned. ` +
      "Prefer read_section over read_pages whenever possible — sections give you the same content with hierarchy and summaries.",
    inputSchema: z.object({
      documentId: z.string().uuid().describe("ID of the document to read."),
      startPage: z
        .number()
        .int()
        .min(1)
        .describe("First page number (inclusive, 1-based)."),
      endPage: z
        .number()
        .int()
        .min(1)
        .describe(
          `Last page number (inclusive, 1-based). Must be >= startPage. ` +
            `(endPage - startPage + 1) should be <= ${MAX_PAGES_PER_CALL}; larger requests are clamped.`,
        ),
    }),
    execute: async ({ documentId, startPage, endPage }) => {
      if (!ctx.documentIds.includes(documentId)) {
        return {
          error: `Document ${documentId} is not part of this conversation.`,
        }
      }
      if (endPage < startPage) {
        return {
          error: `endPage (${endPage}) must be >= startPage (${startPage}).`,
        }
      }

      const requested = endPage - startPage + 1
      const clampedEnd =
        requested > MAX_PAGES_PER_CALL
          ? startPage + MAX_PAGES_PER_CALL - 1
          : endPage
      const clamped = clampedEnd !== endPage

      const { data, error } = await ctx.supabase
        .from("document_pages")
        .select("page_number, content")
        .eq("document_id", documentId)
        .gte("page_number", startPage)
        .lte("page_number", clampedEnd)
        .order("page_number", { ascending: true })

      if (error) return { error: error.message }

      const pages = data ?? []
      if (pages.length === 0) {
        return {
          error: `No pages found in range ${startPage}-${clampedEnd}. The document may be shorter than that.`,
        }
      }

      return {
        documentId,
        pageRange: { start: startPage, end: clampedEnd },
        clamped,
        clampedNote: clamped
          ? `Requested ${requested} pages; clamped to ${MAX_PAGES_PER_CALL}. Call again with startPage=${clampedEnd + 1} to continue.`
          : undefined,
        pages: pages.map((p) => ({
          pageNumber: p.page_number,
          content: (p.content ?? "").slice(0, 4_000),
        })),
      }
    },
  })

export function buildAgentTools(ctx: ToolContext) {
  return {
    get_document_outline: getDocumentOutline(ctx),
    read_section: readSection(ctx),
    search_document: searchDocument(ctx),
    read_pages: readPages(ctx),
  } as const
}

export type AgentTools = ReturnType<typeof buildAgentTools>
