import { Skeleton } from '#/shared/components/ui/skeleton.tsx'

/**
 * Loading skeleton matching the dashboard page layout.
 */
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      {/* Telemetry Strip Skeleton */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border/70 bg-card p-4 space-y-2"
          >
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-7 w-12" />
          </div>
        ))}
      </div>

      {/* Action Bar Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-12 rounded-lg" />
          <Skeleton className="h-8 w-16 rounded-lg" />
          <Skeleton className="h-8 w-16 rounded-lg" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* Board Grid Skeleton */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col justify-between rounded-2xl border border-border/70 bg-card p-5 h-44 space-y-4"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="size-4" />
            </div>
            <Skeleton className="h-6 w-3/4" />
            <div className="flex items-center justify-between pt-4 border-t border-border/40">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
