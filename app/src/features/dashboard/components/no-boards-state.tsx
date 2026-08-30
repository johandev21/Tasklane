import { Button } from '#/shared/components/ui/button.tsx'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '#/shared/components/ui/empty.tsx'

export function NoBoardsState({ onOpenCreate }: { onOpenCreate: () => void }) {
  return (
    <div className="pt-12">
      <Empty className="mx-auto max-w-lg border border-border bg-card/60 p-8 shadow-xs">
        <EmptyHeader>
          <EmptyTitle>No boards yet</EmptyTitle>
          <EmptyDescription>
            Create your first board to start organizing work through lists and
            cards, with real-time collaboration.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={onOpenCreate}>Create Board</Button>
        </EmptyContent>
      </Empty>
    </div>
  )
}
