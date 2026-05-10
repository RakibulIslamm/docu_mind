"use client"

import { Crown, Infinity as InfinityIcon, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { StartCheckoutButton } from "./billing-actions"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  reason?: "document_limit" | "question_limit" | null
}

const PERKS = [
  { icon: InfinityIcon, label: "Unlimited documents" },
  { icon: Zap, label: "Unlimited questions per month" },
  { icon: Crown, label: "Priority model latency" },
]

export function UpgradeDialog({ open, onOpenChange, reason }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-2 flex size-10 items-center justify-center bg-foreground text-background">
            <Crown className="size-5" />
          </div>
          <DialogTitle>Upgrade to Pro</DialogTitle>
          <DialogDescription>
            {reason === "document_limit"
              ? "You've hit the 3-document cap on the Free plan. Upgrade for unlimited uploads."
              : reason === "question_limit"
                ? "You've used all 50 questions for this month. Upgrade for unlimited."
                : "Unlock unlimited documents, questions, and priority model latency."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-baseline gap-2 py-2">
          <span className="font-heading text-4xl font-semibold tracking-tight">
            $29
          </span>
          <span className="text-sm text-muted-foreground">per month</span>
        </div>
        <ul className="flex flex-col gap-3 py-2">
          {PERKS.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-3 text-sm">
              <Icon className="size-4 text-foreground" />
              {label}
            </li>
          ))}
        </ul>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost">Maybe later</Button>} />
          <StartCheckoutButton size="default" />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
