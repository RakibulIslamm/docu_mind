"use client"

import { useCallback, useState, useTransition } from "react"
import { useDropzone, type FileRejection } from "react-dropzone"
import { useRouter } from "next/navigation"
import { CheckCircle2, FileUp, Loader2, UploadCloud, XCircle } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { uploadDocument } from "@/app/dashboard/actions"
import { UpgradeDialog } from "./upgrade-dialog"

const MAX_BYTES = 25 * 1024 * 1024
const MAX_FILES = 10

type UploadState = "queued" | "uploading" | "done" | "error"

type Item = {
  id: string
  file: File
  state: UploadState
  message?: string
}

export function UploadDropzone() {
  const router = useRouter()
  const [items, setItems] = useState<Item[]>([])
  const [isPending, startTransition] = useTransition()
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  const onDrop = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      if (rejected.length > 0) {
        for (const r of rejected) {
          const reason = r.errors[0]?.message ?? "Rejected"
          toast.error(`${r.file.name}: ${reason}`)
        }
      }
      if (accepted.length === 0) return

      const queued: Item[] = accepted.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        state: "queued",
      }))
      setItems((prev) => [...queued, ...prev])

      startTransition(async () => {
        for (const item of queued) {
          setItems((prev) =>
            prev.map((p) =>
              p.id === item.id ? { ...p, state: "uploading" } : p,
            ),
          )
          const fd = new FormData()
          fd.append("file", item.file)
          let result: Awaited<ReturnType<typeof uploadDocument>>
          try {
            result = await uploadDocument(fd)
          } catch (e) {
            result = { ok: false, error: friendlyError(e) }
          }
          setItems((prev) =>
            prev.map((p) =>
              p.id === item.id
                ? result.ok
                  ? { ...p, state: "done" }
                  : { ...p, state: "error", message: result.error }
                : p,
            ),
          )
          if (!result.ok) {
            toast.error(`${item.file.name}: ${result.error}`)
            if (
              "limitReached" in result &&
              result.limitReached === "document_limit"
            ) {
              setUpgradeOpen(true)
              break // stop trying further files
            }
          }
        }
        router.refresh()
      })
    },
    [router],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: true,
    maxSize: MAX_BYTES,
    maxFiles: MAX_FILES,
    disabled: isPending,
  })

  const visibleItems = items.slice(0, 5)
  const hiddenCount = items.length - visibleItems.length

  return (
    <div className="flex flex-col gap-4">
      <UpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        reason="document_limit"
      />
      <div
        {...getRootProps()}
        className={cn(
          "group/drop flex cursor-pointer flex-col items-center justify-center gap-3 border border-dashed border-border bg-card px-6 py-14 text-center transition-colors",
          "hover:border-foreground/50 hover:bg-muted/40",
          isDragActive && "border-foreground bg-muted",
          isPending && "pointer-events-none opacity-60",
        )}
      >
        <input {...getInputProps()} />
        <div className="flex size-12 items-center justify-center bg-foreground/5 text-foreground">
          <UploadCloud className="size-6" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold">
            {isDragActive ? "Drop your PDFs here" : "Drag & drop PDFs"}
          </p>
          <p className="text-xs text-muted-foreground">
            or click to browse · up to 25MB per file · {MAX_FILES} max
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" disabled={isPending}>
          <FileUp />
          Choose files
        </Button>
      </div>

      {items.length > 0 && (
        <ul className="flex flex-col gap-2">
          {visibleItems.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 border border-border bg-card px-4 py-3 text-sm"
            >
              <span className="truncate font-medium" title={item.file.name}>
                {item.file.name}
              </span>
              <span className="flex shrink-0 items-center gap-2 text-xs uppercase tracking-widest">
                <StatusIcon state={item.state} />
                <span
                  className={cn(
                    item.state === "error"
                      ? "text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  {labelFor(item)}
                </span>
              </span>
            </li>
          ))}
          {hiddenCount > 0 && (
            <li className="text-xs uppercase tracking-widest text-muted-foreground">
              + {hiddenCount} more
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

function StatusIcon({ state }: { state: UploadState }) {
  switch (state) {
    case "queued":
      return <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
    case "uploading":
      return <Loader2 className="size-3.5 animate-spin" />
    case "done":
      return <CheckCircle2 className="size-3.5 text-foreground" />
    case "error":
      return <XCircle className="size-3.5 text-destructive" />
  }
}

function friendlyError(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e)
  if (/server action/i.test(m)) {
    return "The page got out of sync — refresh and try again."
  }
  if (/fetch|network|timeout/i.test(m)) {
    return "Network error — check your connection and retry."
  }
  return m || "Upload failed."
}

function labelFor(item: Item): string {
  switch (item.state) {
    case "queued":
      return "Queued"
    case "uploading":
      return "Uploading"
    case "done":
      return "Processing…"
    case "error":
      return "Failed"
  }
}
