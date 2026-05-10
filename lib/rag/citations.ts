/**
 * Lightweight citation parser. The agent is instructed to cite inline like
 * "Section 3.2 (page 14)" or "page 42". We extract those references from
 * the assistant's final text so they can be persisted alongside the message
 * and rendered as clickable badges.
 *
 * This is a best-effort regex parser — the agent isn't constrained to any
 * specific format, so we recognise a few common patterns. Anything we miss
 * just won't be clickable; the answer text itself is still correct.
 */

export type Citation = {
  raw: string // the literal substring from the message
  pageStart: number
  pageEnd: number
  sectionNumber?: string
  sectionTitle?: string
}

export function extractCitations(text: string): Citation[] {
  if (!text) return []
  const citations: Citation[] = []
  const seen = new Set<string>()

  const push = (c: Citation) => {
    const key = `${c.pageStart}-${c.pageEnd}-${c.sectionNumber ?? ""}-${c.sectionTitle ?? ""}`
    if (seen.has(key)) return
    seen.add(key)
    citations.push(c)
  }

  // "Section 3.2 (page 14)" or "Section 3.2 (pages 14-16)"
  const sectionWithPages = /Section\s+([\d.]+)\s*\(\s*pages?\s+(\d+)(?:\s*[-–]\s*(\d+))?\s*\)/gi
  for (const m of text.matchAll(sectionWithPages)) {
    const start = Number(m[2])
    const end = m[3] ? Number(m[3]) : start
    push({
      raw: m[0],
      sectionNumber: m[1],
      pageStart: start,
      pageEnd: end,
    })
  }

  // "(page 14)" / "(pages 14-16)" — bare page references in parentheses
  const bareParenPages = /\(\s*pages?\s+(\d+)(?:\s*[-–]\s*(\d+))?\s*\)/gi
  for (const m of text.matchAll(bareParenPages)) {
    const start = Number(m[1])
    const end = m[2] ? Number(m[2]) : start
    push({ raw: m[0], pageStart: start, pageEnd: end })
  }

  // " on page 42" / " on pages 12-14" — natural-language references
  const naturalPages = /\bpages?\s+(\d+)(?:\s*[-–]\s*(\d+))?\b/gi
  for (const m of text.matchAll(naturalPages)) {
    const start = Number(m[1])
    const end = m[2] ? Number(m[2]) : start
    push({ raw: m[0], pageStart: start, pageEnd: end })
  }

  return citations
}
