"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/site/sidebar-context"

export function ChatPageNav() {
  const router = useRouter()
  const { collapsed, toggle } = useSidebar()

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => router.back()}
        aria-label="Back"
      >
        <ArrowLeft />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={toggle}
        className="hidden md:inline-flex"
        aria-label={collapsed ? "Show sidebar" : "Hide sidebar"}
      >
        {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
      </Button>
    </div>
  )
}
