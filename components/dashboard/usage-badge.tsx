"use client"

import { useState } from "react"
import { ArrowUpRight, FileText, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Usage } from "@/lib/billing/limits"
import { UpgradeDialog } from "./upgrade-dialog"

type Props = {
  usage: Usage
  className?: string
}

export function UsageBadge({ usage, className }: Props) {
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  if (usage.plan === "pro") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 border border-border bg-card px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-widest",
          className,
        )}
      >
        <span className="size-1.5 bg-foreground" />
        Pro · Unlimited
      </div>
    )
  }

  const docPct = clamp((usage.documentCount / usage.documentLimit) * 100)
  const qPct = clamp((usage.questionsThisMonth / usage.questionLimit) * 100)
  const docHot = usage.documentsRemaining !== null && usage.documentsRemaining <= 0
  const qHot = usage.questionsRemaining !== null && usage.questionsRemaining <= 0
  const eitherHot = docHot || qHot

  return (
    <>
      <button
        type="button"
        onClick={() => setUpgradeOpen(true)}
        className={cn(
          "group flex items-center gap-3 border border-border bg-card px-3 py-1.5 text-left transition-colors hover:bg-muted",
          eitherHot && "border-destructive/50",
          className,
        )}
        aria-label="Plan usage — click to upgrade"
      >
        <Stat
          icon={FileText}
          used={usage.documentCount}
          total={usage.documentLimit}
          pct={docPct}
          hot={docHot}
          label="docs"
        />
        <span className="h-5 w-px bg-border" />
        <Stat
          icon={MessageSquare}
          used={usage.questionsThisMonth}
          total={usage.questionLimit}
          pct={qPct}
          hot={qHot}
          label="qs"
        />
        <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
      </button>

      <UpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        reason={docHot ? "document_limit" : qHot ? "question_limit" : null}
      />
    </>
  )
}

function Stat({
  icon: Icon,
  used,
  total,
  pct,
  hot,
  label,
}: {
  icon: typeof FileText
  used: number
  total: number
  pct: number
  hot: boolean
  label: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <span
        className={cn(
          "flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-widest",
          hot && "text-destructive",
        )}
      >
        <Icon className="size-3" />
        {used}/{total} {label}
      </span>
      <span className="h-0.5 w-16 overflow-hidden bg-muted">
        <span
          className={cn(
            "block h-full",
            hot ? "bg-destructive" : "bg-foreground",
          )}
          style={{ width: `${pct}%` }}
        />
      </span>
    </div>
  )
}

function clamp(n: number) {
  return Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0))
}
