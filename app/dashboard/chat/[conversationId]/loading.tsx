import { Skeleton } from "@/components/ui/skeleton"

export default function ChatLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur sm:px-6">
        <Skeleton className="h-4 w-48 sm:w-64" />
        <span className="hidden sm:inline">
          <Skeleton className="h-3 w-12" />
        </span>
        <div className="ml-auto">
          <Skeleton className="size-9" />
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)_340px]">
        {/* Outline column (xl+) */}
        <aside className="hidden h-full min-h-0 overflow-hidden border-r border-border/60 bg-muted/20 xl:block">
          <div className="flex flex-col gap-3 p-4">
            <Skeleton className="h-3 w-24" />
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="h-4 w-full" />
                {i % 2 === 0 && <Skeleton className="ml-3 h-3 w-2/3" />}
              </div>
            ))}
          </div>
        </aside>

        <section className="flex h-full min-h-0 min-w-0 flex-col">
          {/* Mobile/tablet outline trigger placeholder */}
          <div className="flex shrink-0 items-center gap-2 border-b border-border/60 bg-background px-4 py-2 xl:hidden">
            <Skeleton className="h-7 w-24" />
          </div>

          <div className="flex-1 overflow-hidden">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
              <MessageSkeleton align="end" lines={1} />
              <MessageSkeleton align="start" lines={4} />
              <MessageSkeleton align="end" lines={2} />
              <MessageSkeleton align="start" lines={3} />
            </div>
          </div>

          {/* Composer */}
          <div className="border-t border-border/60 bg-background">
            <div className="mx-auto w-full max-w-3xl px-4 py-4 sm:px-6">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="mt-2 h-3 w-48" />
            </div>
          </div>
        </section>

        {/* Reasoning column (xl+) */}
        <aside className="hidden h-full min-h-0 overflow-hidden border-l border-border/60 bg-muted/20 xl:block">
          <div className="flex flex-col gap-3 p-4">
            <Skeleton className="h-3 w-20" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}

function MessageSkeleton({
  align,
  lines,
}: {
  align: "start" | "end"
  lines: number
}) {
  const justify = align === "end" ? "items-end" : "items-start"
  return (
    <div className={`flex flex-col gap-2 ${justify}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4"
          style={{
            width: `${50 + Math.floor(Math.sin(i + lines) * 20 + 30)}%`,
          }}
        />
      ))}
    </div>
  )
}
