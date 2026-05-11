import { Skeleton } from "@/components/ui/skeleton"

export default function DocumentsLoading() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-9 w-44 sm:h-10 sm:w-56" />
            <Skeleton className="h-4 w-full max-w-md" />
          </div>
          <Skeleton className="h-8 w-32" />
        </div>

        <div className="mt-8">
          <Skeleton className="h-44 w-full" />
        </div>

        <div className="mt-10 flex flex-col gap-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Skeleton className="h-10 w-full max-w-sm" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <DocumentCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function DocumentCardSkeleton() {
  return (
    <div className="flex flex-col gap-4 border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <Skeleton className="size-10" />
        <Skeleton className="size-7" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-5 w-1/2" />
      </div>
      <Skeleton className="h-3 w-32" />
      <Skeleton className="h-6 w-20" />
    </div>
  )
}
