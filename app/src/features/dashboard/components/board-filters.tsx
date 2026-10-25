import type { BoardFilterMode } from '../types/dashboard.types.ts'

export interface BoardFiltersProps {
  filterMode: BoardFilterMode
  onSelectFilter: (mode: BoardFilterMode) => void
}

export function BoardFilters({
  filterMode,
  onSelectFilter,
}: BoardFiltersProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onSelectFilter('all')}
        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
          filterMode === 'all'
            ? 'bg-foreground text-background'
            : 'bg-muted text-muted-foreground hover:text-foreground'
        }`}
      >
        All
      </button>
      <button
        type="button"
        onClick={() => onSelectFilter('owned')}
        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
          filterMode === 'owned'
            ? 'bg-foreground text-background'
            : 'bg-muted text-muted-foreground hover:text-foreground'
        }`}
      >
        Owned
      </button>
      <button
        type="button"
        onClick={() => onSelectFilter('shared')}
        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
          filterMode === 'shared'
            ? 'bg-foreground text-background'
            : 'bg-muted text-muted-foreground hover:text-foreground'
        }`}
      >
        Shared
      </button>
    </div>
  )
}
