import type { UIMessage } from "ai"

type ToolPart = {
  type: string
  toolCallId: string
  state?: string
  input?: unknown
  output?: unknown
  errorText?: string
}

type CompactedOutput = {
  summary: string
  elided: true
}

export function compactToolOutputsInHistory(
  messages: UIMessage[],
): UIMessage[] {
  let lastAssistantIdx = -1
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") {
      lastAssistantIdx = i
      break
    }
  }

  return messages.map((message, idx) => {
    if (message.role !== "assistant") return message
    if (idx === lastAssistantIdx) return message

    const parts = message.parts.map((p) => {
      const part = p as unknown as ToolPart
      if (typeof part.type !== "string" || !part.type.startsWith("tool-")) {
        return p
      }
      const toolName = part.type.slice("tool-".length)
      return {
        ...part,
        output: summarizeToolOutput(toolName, part.output),
      } as unknown as UIMessage["parts"][number]
    })

    return { ...message, parts }
  })
}

function summarizeToolOutput(
  toolName: string,
  output: unknown,
): CompactedOutput {
  const o = (output ?? {}) as Record<string, unknown>

  if (o.error) {
    return { summary: `${toolName} error`, elided: true }
  }

  switch (toolName) {
    case "get_document_outline": {
      const doc = (o.document ?? {}) as Record<string, unknown>
      const outline = Array.isArray(o.outline) ? o.outline : null
      const totalPages =
        typeof doc.totalPages === "number" ? doc.totalPages : null
      const filename = typeof doc.filename === "string" ? doc.filename : null
      const bits: string[] = []
      if (outline) bits.push(`${outline.length} top-level sections`)
      if (totalPages !== null) bits.push(`${totalPages} pages`)
      const suffix = filename ? ` of ${filename}` : ""
      return {
        summary: `outline${suffix}${bits.length ? ` — ${bits.join(", ")}` : ""}`,
        elided: true,
      }
    }
    case "read_section": {
      const id = typeof o.sectionId === "string" ? o.sectionId : "?"
      const title = typeof o.title === "string" ? o.title : null
      const content = typeof o.content === "string" ? o.content : ""
      const truncated = o.truncated === true ? ", truncated" : ""
      const titleBit = title ? ` "${title}"` : ""
      return {
        summary: `read_section ${id}${titleBit} — ${content.length} chars${truncated}`,
        elided: true,
      }
    }
    case "search_document": {
      const results = Array.isArray(o.results) ? o.results : []
      const query = typeof o.query === "string" ? o.query : ""
      const pages = results
        .map((r) => {
          const rec = r as Record<string, unknown>
          return typeof rec.pageNumber === "number" ? rec.pageNumber : null
        })
        .filter((n): n is number => n !== null)
      const pageList = pages.length ? ` on pages ${pages.join(", ")}` : ""
      return {
        summary: query
          ? `search "${query}" — ${results.length} hits${pageList}`
          : `search — ${results.length} hits${pageList}`,
        elided: true,
      }
    }
    case "read_pages": {
      const range = (o.pageRange ?? {}) as Record<string, unknown>
      const start = typeof range.start === "number" ? range.start : null
      const end = typeof range.end === "number" ? range.end : null
      const pageCount = Array.isArray(o.pages) ? o.pages.length : null
      const r = start !== null && end !== null ? `${start}–${end}` : "?"
      const countSuffix = pageCount !== null ? ` (${pageCount} pages)` : ""
      const clamped = o.clamped === true ? ", clamped" : ""
      return { summary: `read_pages ${r}${countSuffix}${clamped}`, elided: true }
    }
    default: {
      return { summary: `${toolName} (elided)`, elided: true }
    }
  }
}
