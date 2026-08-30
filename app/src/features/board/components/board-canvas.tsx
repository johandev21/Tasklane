import { useState, memo } from 'react'
import type { FormEvent } from 'react'
import { DndContext, DragOverlay } from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { Button } from '#/shared/components/ui/button.tsx'
import { Input } from '#/shared/components/ui/input.tsx'
import { ListColumn } from './list-column.tsx'
import { CardItem } from './card-item.tsx'
import { useBoardDragAndDrop } from '#/features/board/hooks/use-board-drag-and-drop.ts'
import type {
  BoardMemberUser,
  ListDoc,
  CardDoc,
  LabelDoc,
} from '#/features/board/types/board.types.ts'

export interface BoardCanvasProps {
  lists: ListDoc[]
  cards: CardDoc[]
  cardLabelsMap?: Record<string, LabelDoc[] | undefined>
  cardAssigneesMap?: Record<string, BoardMemberUser[] | undefined>
  cardCommentsCountMap?: Record<string, number | undefined>
  onAddList: (title: string) => void | Promise<void>
  onRenameList: (listId: ListDoc['_id'], newTitle: string) => void
  onDeleteList: (list: ListDoc) => void
  onArchiveAllCards: (listId: ListDoc['_id']) => void
  onAddCard: (listId: ListDoc['_id'], title: string) => void
  onRenameCard: (cardId: CardDoc['_id'], title: string) => void
  onArchiveCard: (cardId: CardDoc['_id']) => void
  onCardClick?: (card: CardDoc) => void
  onReorderList?: (listId: ListDoc['_id'], newPosition: number) => void
  onReorderCard?: (
    cardId: CardDoc['_id'],
    targetListId: ListDoc['_id'],
    newPosition: number,
  ) => void
}

export const BoardCanvas = memo(function BoardCanvas(props: BoardCanvasProps) {
  const drag = useBoardDragAndDrop(props)
  const addListForm = useAddListForm(props.onAddList)

  return (
    <main
      ref={drag.canvasRef}
      className="relative flex-1 overflow-x-auto overflow-y-hidden px-4 sm:px-6 py-5 touch-pan-x [overflow-scrolling:touch]"
    >
      <DndContext
        sensors={drag.sensors}
        collisionDetection={drag.collisionDetectionStrategy}
        measuring={drag.measuring}
        onDragStart={drag.handleDragStart}
        onDragOver={drag.handleDragOver}
        onDragEnd={drag.handleDragEnd}
      >
        <div className="flex h-full items-start gap-4 sm:gap-5 pb-4">
          <BoardListLane
            lists={drag.optimisticLists}
            cards={drag.optimisticCards}
            listIds={drag.listIds}
            cardLabelsMap={props.cardLabelsMap}
            cardAssigneesMap={props.cardAssigneesMap}
            cardCommentsCountMap={props.cardCommentsCountMap}
            onRenameList={props.onRenameList}
            onDeleteList={props.onDeleteList}
            onArchiveAllCards={props.onArchiveAllCards}
            onAddCard={props.onAddCard}
            onRenameCard={props.onRenameCard}
            onArchiveCard={props.onArchiveCard}
            onCardClick={props.onCardClick}
            onReorderList={props.onReorderList}
            onReorderCard={props.onReorderCard}
          />

          <AddListColumn
            isAdding={addListForm.isAdding}
            title={addListForm.title}
            isSubmitting={addListForm.isSubmitting}
            error={addListForm.error}
            hasLists={drag.optimisticLists.length > 0}
            onOpen={() => addListForm.setIsAdding(true)}
            onClose={addListForm.reset}
            onChangeTitle={addListForm.setTitle}
            onSubmit={addListForm.handleSubmit}
          />
        </div>

        <BoardDragOverlay
          activeCard={drag.activeCard}
          activeList={drag.activeList}
          activeListCards={drag.activeListCards}
          cardLabelsMap={props.cardLabelsMap}
          cardAssigneesMap={props.cardAssigneesMap}
          cardCommentsCountMap={props.cardCommentsCountMap}
        />
      </DndContext>
    </main>
  )
})

interface BoardListLaneProps {
  lists: ListDoc[]
  cards: CardDoc[]
  listIds: ListDoc['_id'][]
  cardLabelsMap?: Record<string, LabelDoc[] | undefined>
  cardAssigneesMap?: Record<string, BoardMemberUser[] | undefined>
  cardCommentsCountMap?: Record<string, number | undefined>
  onRenameList: (listId: ListDoc['_id'], newTitle: string) => void
  onDeleteList: (list: ListDoc) => void
  onArchiveAllCards: (listId: ListDoc['_id']) => void
  onAddCard: (listId: ListDoc['_id'], title: string) => void
  onRenameCard: (cardId: CardDoc['_id'], title: string) => void
  onArchiveCard: (cardId: CardDoc['_id']) => void
  onCardClick?: (card: CardDoc) => void
  onReorderList?: (listId: ListDoc['_id'], newPosition: number) => void
  onReorderCard?: (
    cardId: CardDoc['_id'],
    targetListId: ListDoc['_id'],
    newPosition: number,
  ) => void
}

function BoardListLane({
  lists,
  cards,
  listIds,
  cardLabelsMap,
  cardAssigneesMap,
  cardCommentsCountMap,
  onRenameList,
  onDeleteList,
  onArchiveAllCards,
  onAddCard,
  onRenameCard,
  onArchiveCard,
  onCardClick,
  onReorderList,
  onReorderCard,
}: BoardListLaneProps) {
  return (
    <SortableContext items={listIds} strategy={horizontalListSortingStrategy}>
      {lists.map((list, index) => {
        const listCards = cards.filter((c) => c.listId === list._id)
        return (
          <ListColumn
            key={list._id}
            list={list}
            cards={listCards}
            cardLabelsMap={cardLabelsMap}
            cardAssigneesMap={cardAssigneesMap}
            cardCommentsCountMap={cardCommentsCountMap}
            isFirst={index === 0}
            isLast={index === lists.length - 1}
            onRenameList={onRenameList}
            onDeleteList={onDeleteList}
            onArchiveAllCards={onArchiveAllCards}
            onAddCard={onAddCard}
            onRenameCard={onRenameCard}
            onArchiveCard={onArchiveCard}
            onCardClick={onCardClick}
            onMoveListLeft={(listId) => {
              if (index > 0) {
                onReorderList?.(listId, index - 1)
              }
            }}
            onMoveListRight={(listId) => {
              if (index < lists.length - 1) {
                onReorderList?.(listId, index + 1)
              }
            }}
            onMoveCardToTop={(cardId) => {
              onReorderCard?.(cardId, list._id, 0)
            }}
            onMoveCardToBottom={(cardId) => {
              onReorderCard?.(cardId, list._id, listCards.length - 1)
            }}
          />
        )
      })}
    </SortableContext>
  )
}

interface AddListColumnProps {
  isAdding: boolean
  title: string
  isSubmitting: boolean
  error: string | null
  hasLists: boolean
  onOpen: () => void
  onClose: () => void
  onChangeTitle: (title: string) => void
  onSubmit: (e: FormEvent) => void
}

function AddListColumn({
  isAdding,
  title,
  isSubmitting,
  error,
  hasLists,
  onOpen,
  onClose,
  onChangeTitle,
  onSubmit,
}: AddListColumnProps) {
  return (
    <div className="w-[85vw] sm:w-80 md:w-84 shrink-0 pr-6">
      {isAdding ? (
        <AddListForm
          title={title}
          isSubmitting={isSubmitting}
          error={error}
          hasLists={hasLists}
          onChangeTitle={onChangeTitle}
          onCancel={onClose}
          onSubmit={onSubmit}
        />
      ) : (
        <AddListButton hasLists={hasLists} onClick={onOpen} />
      )}
    </div>
  )
}

interface AddListFormProps {
  title: string
  isSubmitting: boolean
  error: string | null
  hasLists: boolean
  onChangeTitle: (title: string) => void
  onCancel: () => void
  onSubmit: (e: FormEvent) => void
}

function AddListForm({
  title,
  isSubmitting,
  error,
  hasLists,
  onChangeTitle,
  onCancel,
  onSubmit,
}: AddListFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-border/80 bg-card p-3.5 shadow-md flex flex-col gap-3"
    >
      <Input
        id="new-list-title"
        aria-label="New list title"
        aria-describedby={error ? 'new-list-error' : undefined}
        aria-invalid={error ? true : undefined}
        autoFocus
        placeholder={
          hasLists ? 'Enter list title...' : 'e.g. To Do, In Progress, Done...'
        }
        value={title}
        onChange={(e) => onChangeTitle(e.target.value)}
        required
        minLength={1}
        disabled={isSubmitting}
        className="text-sm break-all"
      />
      {error && (
        <p
          id="new-list-error"
          role="alert"
          className="text-xs text-destructive"
        >
          {error}
        </p>
      )}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          type="submit"
          disabled={!title.trim() || isSubmitting}
        >
          {isSubmitting ? 'Adding...' : hasLists ? 'Add List' : 'Create List'}
        </Button>
        <Button size="sm" variant="ghost" type="button" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

function AddListButton({
  hasLists,
  onClick,
}: {
  hasLists: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border/80 bg-muted/30 p-4 text-sm font-medium text-muted-foreground transition-all hover:border-border hover:bg-muted/60 hover:text-foreground cursor-pointer"
    >
      <Plus className="size-4" />
      <span>{hasLists ? 'Add another list' : 'Add your first list'}</span>
    </button>
  )
}

interface BoardDragOverlayProps {
  activeCard: CardDoc | null
  activeList: ListDoc | null
  activeListCards: CardDoc[]
  cardLabelsMap?: Record<string, LabelDoc[] | undefined>
  cardAssigneesMap?: Record<string, BoardMemberUser[] | undefined>
  cardCommentsCountMap?: Record<string, number | undefined>
}

function BoardDragOverlay({
  activeCard,
  activeList,
  activeListCards,
  cardLabelsMap = {},
  cardAssigneesMap = {},
  cardCommentsCountMap = {},
}: BoardDragOverlayProps) {
  return (
    <DragOverlay>
      {activeCard ? (
        <div className="rotate-2 scale-105 opacity-95 shadow-2xl pointer-events-none">
          <CardItem
            card={activeCard}
            labels={cardLabelsMap[activeCard._id]}
            assignees={cardAssigneesMap[activeCard._id]}
            commentsCount={cardCommentsCountMap[activeCard._id]}
            isDraggingOverlay
          />
        </div>
      ) : activeList ? (
        <div className="rotate-[1.5deg] scale-[1.02] opacity-95 shadow-2xl pointer-events-none cursor-grabbing">
          <ListColumn
            list={activeList}
            cards={activeListCards}
            cardLabelsMap={cardLabelsMap}
            cardAssigneesMap={cardAssigneesMap}
            cardCommentsCountMap={cardCommentsCountMap}
            isDraggingOverlay
          />
        </div>
      ) : null}
    </DragOverlay>
  )
}

function useAddListForm(onAddList: (title: string) => void | Promise<void>) {
  const [isAdding, setIsAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setError(null)
    setIsAdding(false)
    setTitle('')
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) {
      setError('List title is required')
      return
    }
    try {
      setIsSubmitting(true)
      setError(null)
      await onAddList(trimmed)
      setTitle('')
      setIsAdding(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add list')
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    isAdding,
    title,
    isSubmitting,
    error,
    setIsAdding,
    setTitle,
    reset,
    handleSubmit,
  }
}
