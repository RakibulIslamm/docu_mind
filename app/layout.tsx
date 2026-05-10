import type { Metadata } from "next"
import { Geist, Geist_Mono, Noto_Sans, Playfair_Display } from "next/font/google"
import { ThemeProvider } from "@/components/site/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"
import "./globals.css"

const playfairDisplayHeading = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-heading",
})

const notoSans = Noto_Sans({ subsets: ["latin"], variable: "--font-sans" })

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "DocuMind — Chat with any PDF, without vectors",
  description:
    "Vectorless RAG document Q&A. The LLM reads, navigates, and cites your PDFs agentically — no embeddings, no vector database.",
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
        playfairDisplayHeading.variable,
      )}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          {children}
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  )
}
