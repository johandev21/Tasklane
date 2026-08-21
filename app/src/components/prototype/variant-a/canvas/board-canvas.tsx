import { useRef, useMemo, memo } from 'react'
import type { FormEvent } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  pointerWithin,
  rectIntersection,
  MeasuringStrategy,
} from '@dnd-kit/core'
import type {
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  useSensors,
  CollisionDetection,
} from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { SortableListColumn } from './list-column'
import { ListColumnView } from './list-column-view'
import { CardItemView } from '../card/card-item-view'
import type {
  BoardData,
  CardItem,
  ListItem,
} from '#/components/prototype/types'

export interface BoardCanvasProps {
  board: BoardData
  sensors: ReturnType<typeof useSensors>
  isLabelsExpanded: boolean
  activeCard: CardItem | null | undefined
  activeList?: ListItem | null
  isAddingList: boolean
  newListTitle: string
  onToggleLabelsExpanded: () => void
  onDragStart: (event: DragStartEvent) => void
  onDragOver: (event: DragOverEvent) => void
  onDragEnd: (event: DragEndEvent) => void
  onSelectCard: (id: string) => void
  onRenameList: (id: string, title: string) => void
  onDeleteList: (id: string) => void
  onArchiveAllCards: (id: string) => void
  onAddCard: (listId: string, title: string) => void
  onRenameCard: (id: string, title: string) => void
  onArchiveCard: (id: string) => void
  onNewListTitleChange: (title: string) => void
  onCreateListSubmit: (e: FormEvent) => void
  onCancelAddList: () => void
  onStartAddList: () => void
}

export const BoardCanvas = memo(function BoardCanvas({
  board,
  sensors,
  isLabelsExpanded,
  activeCard,
  activeList,
  isAddingList,
  newListTitle,
  onToggleLabelsExpanded,
  onDragStart,
  onDragOver,
  onDragEnd,
  onSelectCard,
  onRenameList,
  onDeleteList,
  onArchiveAllCards,
  onAddCard,
  onRenameCard,
  onArchiveCard,
  onNewListTitleChange,
  onCreateListSubmit,
  onCancelAddList,
  onStartAddList,
}: BoardCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)

  const listIds = useMemo(() => board.lists.map((l) => l.id), [board.lists])

  const collisionDetectionStrategy: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args)
    if (pointerCollisions.length > 0) {
      return pointerCollisions
    }
    const rectCollisions = rectIntersection(args)
    if (rectCollisions.length > 0) {
      return rectCollisions
    }
    return closestCorners(args)
  }

  return (
    <main
      ref={canvasRef}
      className="relative flex-1 overflow-x-auto overflow-y-hidden px-4 sm:px-6 py-5 touch-pan-x [overflow-scrolling:touch]"
    >
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetectionStrategy}
        measuring={{
          droppable: {
            strategy: MeasuringStrategy.Always,
          },
        }}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="flex h-full items-start gap-4 sm:gap-5 pb-4">
          <SortableContext
            items={listIds}
            strategy={horizontalListSortingStrategy}
          >
            {board.lists.map((list) => (
              <SortableListColumn
                key={list.id}
                list={list}
                cards={board.cards}
                members={board.members}
                isLabelsExpanded={isLabelsExpanded}
                onToggleLabelsExpanded={onToggleLabelsExpanded}
                onSelectCard={onSelectCard}
                onRenameList={onRenameList}
                onDeleteList={onDeleteList}
                onArchiveAllCards={onArchiveAllCards}
                onAddCard={onAddCard}
                onRenameCard={onRenameCard}
                onArchiveCard={onArchiveCard}
              />
            ))}
          </SortableContext>

          {/* Quick Add List Column Tile */}
          <div className="w-[85vw] sm:w-80 md:w-84 shrink-0 pr-6">
            {isAddingList ? (
              <form
                onSubmit={onCreateListSubmit}
                className="rounded-2xl border border-border/80 bg-card p-3.5 shadow-md"
              >
                <Input
                  aria-label="New list title"
                  autoFocus
                  placeholder="Enter list title..."
                  value={newListTitle}
                  onChange={(e) => onNewListTitleChange(e.target.value)}
                  className="mb-3 text-sm break-all"
                />
                <div className="flex items-center gap-2">
                  <Button size="sm" type="submit">
                    Add List
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    type="button"
                    onClick={onCancelAddList}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={onStartAddList}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border/80 bg-muted/30 p-4 text-sm font-medium text-muted-foreground transition-all hover:border-border hover:bg-muted/60 hover:text-foreground"
              >
                <Plus className="size-4" />
                <span>Add another list</span>
              </button>
            )}
          </div>
        </div>

        {/* Drag Overlay for smooth visual feedback */}
        <DragOverlay>
          {activeCard ? (
            <div className="rotate-2 scale-105 opacity-95 shadow-2xl pointer-events-none">
              <CardItemView
                card={activeCard}
                members={board.members}
                isLabelsExpanded={isLabelsExpanded}
                isDraggingOverlay
              />
            </div>
          ) : activeList ? (
            <div className="rotate-[1.5deg] scale-[1.02] opacity-95 shadow-2xl pointer-events-none cursor-grabbing">
              <ListColumnView
                list={activeList}
                cards={board.cards}
                members={board.members}
                isLabelsExpanded={isLabelsExpanded}
                onToggleLabelsExpanded={() => {}}
                onSelectCard={() => {}}
                onRenameList={() => {}}
                onDeleteList={() => {}}
                onArchiveAllCards={() => {}}
                onAddCard={() => {}}
                onRenameCard={() => {}}
                onArchiveCard={() => {}}
                isDraggingOverlay
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </main>
  )
})
