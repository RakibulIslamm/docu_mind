"use client"

import { useEffect } from "react"

/**
 * Installs browser-level guards while one or more documents are still being
 * parsed:
 *   - `beforeunload`  → triggers the browser's "Reload site? / Leave site?"
 *     confirmation dialog. Best the platform allows; modern browsers ignore
 *     custom messages and show their own generic prompt.
 *   - `pagehide`      → fires when the tab is actually closing. Uses
 *     `navigator.sendBeacon` (queued + delivered even after the page is
 *     gone) to POST the doc IDs to /api/documents/cancel-processing, which
 *     flips them to "failed" so the user can re-trigger from the card menu.
 *
 * The server-rendered `processingIds` list is the source of truth. When all
 * docs finish, the cards' router.refresh() re-renders the parent page with
 * an empty list and the handlers come back down.
 */
export function ProcessingGuard({
  processingIds,
}: {
  processingIds: string[]
}) {
  useEffect(() => {
    if (processingIds.length === 0) return

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      // Setting returnValue + preventDefault is the modern API for triggering
      // the browser's native confirmation. The string is ignored in current
      // browsers but kept for older user agents.
      event.preventDefault()
      event.returnValue =
        "Documents are still being processed. Leaving now will cancel them — you can reprocess later."
      return event.returnValue
    }

    const onPageHide = () => {
      // pagehide is more reliable than `unload` (especially on mobile/Safari).
      // sendBeacon survives the page tearing down; fetch usually doesn't.
      if (typeof navigator === "undefined" || !navigator.sendBeacon) return
      const payload = new Blob(
        [JSON.stringify({ ids: processingIds })],
        { type: "application/json" },
      )
      navigator.sendBeacon("/api/documents/cancel-processing", payload)
    }

    window.addEventListener("beforeunload", onBeforeUnload)
    window.addEventListener("pagehide", onPageHide)

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload)
      window.removeEventListener("pagehide", onPageHide)
    }
  }, [processingIds])

  return null
}
