"use client"

import { useState } from "react"
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Hash,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type OutlineNode = {
  sectionId: string
  documentId: string
  sectionNumber: string | null
  title: string
  level: number
  startPage: number | null
  endPage: number | null
  summary: string | null
  children: OutlineNode[]
}

export type OutlineDocument = {
  documentId: string
  filename: string
  totalPages: number | null
  sections: OutlineNode[]
}

type Props = {
  outline: OutlineDocument[]
  activeSectionId?: string | null
  onSectionClick?: (node: OutlineNode) => void
}

export function OutlineTree({ outline, activeSectionId, onSectionClick }: Props) {
  if (outline.length === 0) {
    return (
      <p className="px-4 py-6 text-xs text-muted-foreground">
        No outline available.
      </p>
    )
  }

  return (
    <nav className="flex flex-col gap-6 py-4">
      {outline.map((doc) => (
        <DocumentOutline
          key={doc.documentId}
          doc={doc}
          activeSectionId={activeSectionId}
          onSectionClick={onSectionClick}
          showHeader={outline.length > 1}
        />
      ))}
    </nav>
  )
}

function DocumentOutline({
  doc,
  activeSectionId,
  onSectionClick,
  showHeader,
}: {
  doc: OutlineDocument
  activeSectionId?: string | null
  onSectionClick?: (node: OutlineNode) => void
  showHeader: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      {showHeader && (
        <div className="mb-1 flex items-center gap-2 px-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <FileText className="size-3.5" />
          <span className="truncate" title={doc.filename}>
            {doc.filename}
          </span>
        </div>
      )}
      {doc.sections.length === 0 ? (
        <p className="px-3 text-xs text-muted-foreground">
          (no sections detected)
        </p>
      ) : (
        <ul className="flex flex-col">
          {doc.sections.map((node) => (
            <SectionItem
              key={node.sectionId}
              node={node}
              depth={0}
              activeSectionId={activeSectionId}
              onSectionClick={onSectionClick}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function SectionItem({
  node,
  depth,
  activeSectionId,
  onSectionClick,
}: {
  node: OutlineNode
  depth: number
  activeSectionId?: string | null
  onSectionClick?: (node: OutlineNode) => void
}) {
  const [open, setOpen] = useState(depth < 1)
  const hasChildren = node.children.length > 0
  const isActive = activeSectionId === node.sectionId

  return (
    <li>
      <div
        className={cn(
          "group/section flex cursor-pointer items-start gap-1.5 px-2 py-1.5 text-sm transition-colors hover:bg-muted",
          isActive && "bg-muted",
        )}
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={() => onSectionClick?.(node)}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            if (hasChildren) setOpen((o) => !o)
          }}
          className={cn(
            "mt-0.5 flex size-4 shrink-0 items-center justify-center text-muted-foreground",
            !hasChildren && "invisible",
          )}
          aria-label={open ? "Collapse" : "Expand"}
        >
          {open ? (
            <ChevronDown className="size-3.5" />
          ) : (
            <ChevronRight className="size-3.5" />
          )}
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-baseline gap-1.5">
            {node.sectionNumber && (
              <span className="shrink-0 font-mono text-[0.65rem] tracking-wider text-muted-foreground">
                {node.sectionNumber}
              </span>
            )}
            <span className="line-clamp-2 text-sm leading-tight">
              {node.title}
            </span>
          </div>
          {node.startPage !== null && (
            <span className="flex items-center gap-1 text-[0.65rem] uppercase tracking-widest text-muted-foreground">
              <Hash className="size-2.5" />
              {node.startPage}
              {node.endPage && node.endPage !== node.startPage
                ? `–${node.endPage}`
                : ""}
            </span>
          )}
        </div>
      </div>
      {hasChildren && open && (
        <ul>
          {node.children.map((child) => (
            <SectionItem
              key={child.sectionId}
              node={child}
              depth={depth + 1}
              activeSectionId={activeSectionId}
              onSectionClick={onSectionClick}
            />
          ))}
        </ul>
      )}
    </li>
  )
}
