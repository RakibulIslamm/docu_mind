"use client"

import { Fragment, type ReactNode } from "react"
import { cn } from "@/lib/utils"

export type Citation = {
  raw: string
  pageStart: number
  pageEnd: number
  sectionNumber?: string
  sectionTitle?: string
}

type Props = {
  text: string
  citations: Citation[]
  onCitationClick?: (citation: Citation) => void
  className?: string
}

/**
 * Splits a message body into text + clickable citation chips. We render
 * each `citation.raw` substring as an inline button. Anything outside is
 * plain text. Whitespace is preserved.
 */
export function CitedText({
  text,
  citations,
  onCitationClick,
  className,
}: Props) {
  if (!text) return null
  if (citations.length === 0) {
    return <span className={cn("whitespace-pre-wrap", className)}>{text}</span>
  }

  // Find unique non-overlapping spans, leftmost first, longest match wins.
  const spans = findCitationSpans(text, citations)

  if (spans.length === 0) {
    return <span className={cn("whitespace-pre-wrap", className)}>{text}</span>
  }

  const out: ReactNode[] = []
  let cursor = 0
  spans.forEach((span, i) => {
    if (span.start > cursor) {
      out.push(
        <Fragment key={`t-${i}`}>{text.slice(cursor, span.start)}</Fragment>,
      )
    }
    const c = span.citation
    out.push(
      <button
        key={`c-${i}`}
        type="button"
        onClick={() => onCitationClick?.(c)}
        title={c.sectionTitle ?? `Page ${c.pageStart}${c.pageEnd !== c.pageStart ? `–${c.pageEnd}` : ""}`}
        className="mx-0.5 inline-flex items-baseline gap-1 border border-border bg-muted/60 px-1.5 py-px text-[0.7rem] font-semibold uppercase tracking-wider text-foreground transition-colors hover:bg-foreground hover:text-background"
      >
        {text.slice(span.start, span.end)}
      </button>,
    )
    cursor = span.end
  })
  if (cursor < text.length) {
    out.push(<Fragment key="t-end">{text.slice(cursor)}</Fragment>)
  }

  return (
    <span className={cn("whitespace-pre-wrap", className)}>{out}</span>
  )
}

type Span = { start: number; end: number; citation: Citation }

function findCitationSpans(text: string, citations: Citation[]): Span[] {
  const spans: Span[] = []
  for (const c of citations) {
    if (!c.raw) continue
    let from = 0
    while (true) {
      const idx = text.indexOf(c.raw, from)
      if (idx === -1) break
      spans.push({ start: idx, end: idx + c.raw.length, citation: c })
      from = idx + c.raw.length
    }
  }
  // Sort by start, drop overlaps (keep the earliest-found / longer match).
  spans.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start))
  const out: Span[] = []
  let lastEnd = -1
  for (const s of spans) {
    if (s.start >= lastEnd) {
      out.push(s)
      lastEnd = s.end
    }
  }
  return out
}
