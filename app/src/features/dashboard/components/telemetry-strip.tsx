import type { BoardSummary } from '../types/dashboard.types.ts'

interface TelemetryStripProps {
  boards: BoardSummary[]
}

/**
 * Operational telemetry overview displaying aggregate board workload statistics.
 */
export function TelemetryStrip({ boards }: TelemetryStripProps) {
  const totalCards = boards.reduce((sum, b) => sum + b.cardsCount, 0)

  const totalLists = boards.reduce((sum, b) => sum + b.listsCount, 0)
  const peakMembers = Math.max(...boards.map((b) => b.memberCount), 0)

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="rounded-2xl border border-border/70 bg-card p-4">
        <span className="text-xs font-medium text-muted-foreground">
          Total Boards
        </span>
        <p className="mt-1 font-heading text-2xl font-semibold text-foreground">
          {boards.length}
        </p>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card p-4">
        <span className="text-xs font-medium text-muted-foreground">
          In-Flight Cards
        </span>
        <p className="mt-1 font-heading text-2xl font-semibold text-foreground">
          {totalCards}
        </p>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card p-4">
        <span className="text-xs font-medium text-muted-foreground">
          Total Lists
        </span>
        <p className="mt-1 font-heading text-2xl font-semibold text-foreground">
          {totalLists}
        </p>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card p-4">
        <span className="text-xs font-medium text-muted-foreground">
          Peak Members / Board
        </span>
        <p className="mt-1 font-heading text-2xl font-semibold text-foreground">
          {peakMembers}
        </p>
      </div>
    </div>
  )
}
