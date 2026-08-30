import { Skeleton } from '#/components/ui/skeleton.tsx'

export function BoardSkeleton() {
  return (
    <div className="flex h-screen flex-col bg-app-background overflow-hidden">
      {/* Top Header Skeleton */}
      <div className="flex h-14 items-center justify-between border-b border-border/60 bg-card/85 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Skeleton className="size-6 rounded-md" />
          <Skeleton className="h-5 w-32 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="size-8 rounded-full" />
        </div>
      </div>

      {/* Horizontal Canvas Skeleton */}
      <div className="flex flex-1 items-start gap-4 sm:gap-5 overflow-hidden p-5">
        <div className="w-[85vw] sm:w-80 md:w-84 shrink-0 flex flex-col gap-3 rounded-2xl border border-border/70 bg-muted/40 p-3 h-[450px]">
          <Skeleton className="h-6 w-3/4 rounded-md" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>

        <div className="w-[85vw] sm:w-80 md:w-84 shrink-0 flex flex-col gap-3 rounded-2xl border border-border/70 bg-muted/40 p-3 h-[360px]">
          <Skeleton className="h-6 w-1/2 rounded-md" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>

        <div className="w-[85vw] sm:w-80 md:w-84 shrink-0 flex flex-col gap-3 rounded-2xl border border-border/70 bg-muted/40 p-3 h-[280px]">
          <Skeleton className="h-6 w-2/3 rounded-md" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}
