"use client"

import { BookOpen } from "lucide-react"
import type { Citation } from "./citations"

type Props = {
  citations: Citation[]
  onCitationClick?: (c: Citation) => void
}

export function SourcesRow({ citations, onCitationClick }: Props) {
  if (citations.length === 0) return null
  const unique = dedupe(citations)

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-3">
      <span className="mr-1 inline-flex items-center gap-1 text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
        <BookOpen className="size-3" />
        Sources
      </span>
      {unique.map((c, i) => (
        <button
          key={`${c.pageStart}-${c.pageEnd}-${c.sectionNumber ?? ""}-${i}`}
          type="button"
          onClick={() => onCitationClick?.(c)}
          title={c.sectionTitle ?? labelFor(c)}
          className="inline-flex items-baseline gap-1 border border-border bg-card px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wider text-foreground transition-colors hover:border-foreground hover:bg-foreground hover:text-background"
        >
          {labelFor(c)}
        </button>
      ))}
    </div>
  )
}

function labelFor(c: Citation): string {
  const pages =
    c.pageStart === c.pageEnd
      ? `p.${c.pageStart}`
      : `p.${c.pageStart}–${c.pageEnd}`
  if (c.sectionNumber) return `§${c.sectionNumber} · ${pages}`
  return pages
}

function dedupe(citations: Citation[]): Citation[] {
  const seen = new Set<string>()
  const out: Citation[] = []
  for (const c of citations) {
    const key = `${c.sectionNumber ?? ""}|${c.pageStart}|${c.pageEnd}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(c)
  }
  return out
}
