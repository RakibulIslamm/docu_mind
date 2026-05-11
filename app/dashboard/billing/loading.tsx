import { Skeleton } from "@/components/ui/skeleton"

export default function BillingLoading() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-10">
        <Skeleton className="h-9 w-32 sm:h-10 sm:w-40" />
        <Skeleton className="mt-2 h-4 w-72" />

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <PlanCardSkeleton key={i} />
          ))}
        </div>

        <Skeleton className="mt-10 h-3 w-80" />
      </div>
    </div>
  )
}

function PlanCardSkeleton() {
  return (
    <div className="flex flex-col gap-4 border border-border bg-card p-6">
      <Skeleton className="h-6 w-24" />
      <Skeleton className="h-10 w-32" />
      <Skeleton className="h-4 w-full max-w-xs" />
      <div className="mt-2 flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-4 shrink-0" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
      <Skeleton className="mt-4 h-11 w-full" />
    </div>
  )
}
