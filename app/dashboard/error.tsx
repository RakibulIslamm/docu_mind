"use client"

import { useEffect } from "react"
import Link from "next/link"
import { AlertTriangle, Home, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[DashboardError]", error)
  }, [error])

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col px-6 py-16">
      <Card>
        <CardHeader>
          <div className="flex size-10 items-center justify-center bg-destructive/10 text-destructive">
            <AlertTriangle className="size-5" />
          </div>
          <CardTitle className="mt-4">Couldn’t load your dashboard</CardTitle>
          <CardDescription>
            {friendlyMessage(error)}
            {error.digest && (
              <span className="mt-2 block font-mono text-xs">
                ref: {error.digest}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button onClick={reset}>
            <RotateCcw />
            Try again
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/" />}
          >
            <Home />
            Home
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function friendlyMessage(error: Error): string {
  const m = error.message?.toLowerCase() ?? ""
  if (m.includes("fetch failed") || m.includes("connect timeout")) {
    return "We couldn't reach Supabase — your network or their service is briefly unreachable. Retrying usually works within a few seconds."
  }
  return "Something broke while loading your documents. Retry — if it keeps failing, refresh the page."
}
