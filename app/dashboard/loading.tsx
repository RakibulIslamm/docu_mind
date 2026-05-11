import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardOverviewLoading() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-10 w-72 sm:h-12 sm:w-96" />
          <Skeleton className="h-4 w-full max-w-xl" />
          <Skeleton className="h-4 w-3/4 max-w-md" />
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>

        <div className="mt-10">
          <Skeleton className="mb-4 h-3 w-28" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <RecentListSkeleton />
          <RecentListSkeleton />
        </div>
      </div>
    </div>
  )
}

function StatCardSkeleton() {
  return (
    <div className="border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Skeleton className="size-4" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="mt-4 h-8 w-28" />
      <Skeleton className="mt-3 h-1 w-full" />
      <Skeleton className="mt-3 h-3 w-24" />
    </div>
  )
}

function RecentListSkeleton() {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-7 w-16" />
      </div>
      <div className="flex flex-col divide-y divide-border border border-border bg-card">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="size-9 shrink-0" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
