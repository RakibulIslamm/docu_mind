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

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[RootError]", error)
  }, [error])

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex size-10 items-center justify-center bg-destructive/10 text-destructive">
            <AlertTriangle className="size-5" />
          </div>
          <CardTitle className="mt-4">Something went wrong</CardTitle>
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
          <Button variant="outline" nativeButton={false} render={<Link href="/" />}>
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
    return "We couldn't reach our servers — likely a transient network blip. Try again in a moment."
  }
  if (m.includes("server action")) {
    return "Looks like the page got out of sync after a code change. Refresh to load the latest version."
  }
  return "An unexpected error happened. We've logged it — you can try again or head home."
}
