"use client"

import { useEffect } from "react"

// Last-resort fallback: triggers when even the root layout crashes.
// Has its own <html>/<body> because the layout is broken at this point.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[GlobalError]", error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          margin: 0,
          background: "#fff",
          color: "#111",
        }}
      >
        <div style={{ maxWidth: 480 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
            Application crashed
          </h1>
          <p style={{ color: "#555", marginBottom: 16 }}>
            Something fundamental broke and we couldn’t recover automatically.
            Try reloading — if it persists, the dev server log will have details.
          </p>
          {error.digest && (
            <p style={{ fontFamily: "monospace", fontSize: 12, color: "#999" }}>
              ref: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: 16,
              padding: "0.5rem 1rem",
              fontSize: 14,
              fontWeight: 600,
              color: "#fff",
              background: "#111",
              border: 0,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  )
}
