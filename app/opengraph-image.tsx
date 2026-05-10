import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "DocuMind — Chat with any PDF, without vectors"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#fafaf9",
          padding: 80,
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              background: "#1c1917",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fafaf9",
              fontSize: 36,
              fontWeight: 700,
            }}
          >
            D
          </div>
          <span
            style={{
              fontSize: 32,
              fontWeight: 600,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "#1c1917",
            }}
          >
            DocuMind
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <span
            style={{
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: 8,
              textTransform: "uppercase",
              color: "#78716c",
            }}
          >
            Vectorless RAG
          </span>
          <h1
            style={{
              fontSize: 96,
              fontWeight: 600,
              lineHeight: 1.05,
              color: "#1c1917",
              margin: 0,
              letterSpacing: -2,
            }}
          >
            Chat with any PDF —
            <br />
            without vectors.
          </h1>
          <p
            style={{
              fontSize: 32,
              lineHeight: 1.4,
              color: "#57534e",
              margin: 0,
              maxWidth: 900,
            }}
          >
            The LLM reads, navigates, and cites your documents agentically. No
            embeddings, no vector database, no chunking heuristics.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 12,
            }}
          >
            {["get_outline", "read_section", "search", "read_pages"].map((t) => (
              <div
                key={t}
                style={{
                  border: "2px solid #1c1917",
                  padding: "8px 16px",
                  fontSize: 18,
                  fontWeight: 600,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: "#1c1917",
                  fontFamily: "ui-monospace, monospace",
                }}
              >
                {t}
              </div>
            ))}
          </div>
          <span
            style={{
              fontSize: 20,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "#a8a29e",
            }}
          >
            documind.app
          </span>
        </div>
      </div>
    ),
    size,
  )
}
