import type { Metadata, Viewport } from "next"
import { Fraunces, Geist, Geist_Mono, Noto_Sans } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/site/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"
import "./globals.css"

// Fraunces — modern variable serif designed for editorial/document-oriented
// surfaces. Loads the regular axis (100–900) plus italics so the
// `font-heading` + `font-semibold` Tailwind combo renders with a real weight
// instead of a synthesized fake-bold.
const frauncesHeading = Fraunces({
  subsets: ["latin"],
  axes: ["opsz", "SOFT"],
  variable: "--font-heading",
})

const notoSans = Noto_Sans({ subsets: ["latin"], variable: "--font-sans" })

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
const TITLE = "DocuMind — Chat with any PDF, without vectors"
const DESCRIPTION =
  "Vectorless RAG document Q&A. The LLM reads, navigates, and cites your PDFs agentically — no embeddings, no vector database, no chunking heuristics."

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: TITLE,
    template: "%s · DocuMind",
  },
  description: DESCRIPTION,
  keywords: [
    "vectorless RAG",
    "document Q&A",
    "PDF chat",
    "agentic RAG",
    "LLM tool use",
    "DeepSeek",
    "OpenRouter",
    "Supabase",
    "Next.js",
  ],
  authors: [{ name: "DocuMind" }],
  openGraph: {
    type: "website",
    url: APP_URL,
    siteName: "DocuMind",
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1917" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        notoSans.variable,
        frauncesHeading.variable,
      )}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          {children}
          <Toaster richColors position="top-center" />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}
