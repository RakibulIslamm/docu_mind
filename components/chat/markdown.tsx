"use client"

import { memo } from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"

type Props = {
  text: string
  className?: string
}

// Custom renderers tuned to the project's typography. Compact line-height,
// modest spacing between blocks, base-sera-style code blocks. No raw HTML
// passes through (react-markdown blocks it by default).
const components: Components = {
  p: ({ children }) => (
    <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  h1: ({ children }) => (
    <h1 className="font-heading mt-4 mb-2 text-2xl font-semibold tracking-tight first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="font-heading mt-4 mb-2 text-xl font-semibold tracking-tight first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-3 mb-2 text-base font-semibold tracking-tight first:mt-0">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="mt-3 mb-1 text-sm font-semibold uppercase tracking-widest first:mt-0">
      {children}
    </h4>
  ),
  ul: ({ children }) => (
    <ul className="mb-3 ml-5 flex list-disc flex-col gap-1.5 last:mb-0 marker:text-muted-foreground">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 ml-5 flex list-decimal flex-col gap-1.5 last:mb-0 marker:text-muted-foreground">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed [&>p]:mb-1 [&>p:last-child]:mb-0">
      {children}
    </li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-3 border-l-2 border-border pl-4 italic text-muted-foreground last:mb-0">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-border/60" />,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium underline underline-offset-3 transition-colors hover:text-foreground"
    >
      {children}
    </a>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = /language-/.test(className ?? "")
    if (isBlock) {
      return (
        <code
          className={cn(
            "block overflow-x-auto bg-muted px-3 py-2 font-mono text-xs leading-relaxed",
            className,
          )}
          {...props}
        >
          {children}
        </code>
      )
    }
    return (
      <code
        className="bg-muted px-1 py-0.5 font-mono text-[0.85em]"
        {...props}
      >
        {children}
      </code>
    )
  },
  pre: ({ children }) => (
    <pre className="mb-3 overflow-x-auto bg-muted p-3 font-mono text-xs leading-relaxed last:mb-0">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="mb-3 overflow-x-auto last:mb-0">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-border">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-widest">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-border/40 px-3 py-2">{children}</td>
  ),
}

function MarkdownImpl({ text, className }: Props) {
  return (
    <div className={cn("text-sm text-foreground", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  )
}

// Memo on text — re-renders on every streamed chunk are still needed when
// `text` grows, but identical text won't re-parse.
export const Markdown = memo(MarkdownImpl, (prev, next) => prev.text === next.text)
