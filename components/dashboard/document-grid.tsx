"use client"

import { useMemo, useState } from "react"
import { FileText, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DocumentCard, type DashboardDocument } from "./document-card"

type Props = {
  documents: DashboardDocument[]
}

export function DocumentGrid({ documents }: Props) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return documents
    return documents.filter((d) => d.filename.toLowerCase().includes(q))
  }, [documents, query])

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 border border-dashed border-border bg-card py-16 text-center">
        <div className="flex size-12 items-center justify-center bg-foreground/5 text-foreground">
          <FileText className="size-5" />
        </div>
        <h3 className="font-heading text-xl font-semibold tracking-tight">
          No documents yet
        </h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          Drop a PDF above and the agent will read, navigate, and answer
          questions with real citations.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by filename"
            className="h-10 pl-9 pr-9"
            type="search"
          />
          {query && (
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              aria-label="Clear search"
              onClick={() => setQuery("")}
              className="absolute top-1/2 right-1.5 -translate-y-1/2"
            >
              <X />
            </Button>
          )}
        </div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          {filtered.length} of {documents.length} document
          {documents.length === 1 ? "" : "s"}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="border border-dashed border-border bg-card px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No documents match &ldquo;{query}&rdquo;.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} />
          ))}
        </div>
      )}
    </div>
  )
}
