import { Button } from '#/shared/components/ui/button.tsx'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '#/shared/components/ui/empty.tsx'
import type { BoardFilterMode } from '../types/dashboard.types.ts'

export interface NoFilteredBoardsStateProps {
  filterMode: BoardFilterMode
  onResetFilter: () => void
  onOpenCreate: () => void
}

export function NoFilteredBoardsState({
  filterMode,
  onResetFilter,
  onOpenCreate,
}: NoFilteredBoardsStateProps) {
  return (
    <div className="py-8">
      <Empty className="mx-auto max-w-md border border-border/80 bg-card/60 p-8 shadow-xs">
        <EmptyHeader>
          <EmptyTitle>
            {filterMode === 'owned' ? 'No owned boards' : 'No shared boards'}
          </EmptyTitle>
          <EmptyDescription>
            {filterMode === 'owned'
              ? 'You do not own any boards yet. Create a board or switch to view shared boards.'
              : 'No boards have been shared with you yet.'}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onResetFilter}>
            Show All Boards
          </Button>
          {filterMode === 'owned' && (
            <Button size="sm" onClick={onOpenCreate}>
              Create Board
            </Button>
          )}
        </EmptyContent>
      </Empty>
    </div>
  )
}
