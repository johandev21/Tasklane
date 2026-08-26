import { useState, useMemo, useRef, useEffect, memo } from 'react'
import type { FormEvent } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  pointerWithin,
  rectIntersection,
  MeasuringStrategy,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type {
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  CollisionDetection,
} from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { Button } from '#/components/ui/button.tsx'
import { Input } from '#/components/ui/input.tsx'
import { ListColumn } from './list-column.tsx'
import { CardItem } from './card-item.tsx'
import type { BoardMemberUser, ListDoc, CardDoc, LabelDoc } from './types.ts'

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

export const BoardCanvas = memo(function BoardCanvas({
  lists,
  cards,
  cardLabelsMap = {},
  cardAssigneesMap = {},
  cardCommentsCountMap = {},
  onAddList,
  onRenameList,
  onDeleteList,
  onArchiveAllCards,
  onAddCard,
  onRenameCard,
  onArchiveCard,
  onCardClick,
  onReorderList,
  onReorderCard,
}: BoardCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [isAddingList, setIsAddingList] = useState(false)
  const [newListTitle, setNewListTitle] = useState('')
  const [isSubmittingList, setIsSubmittingList] = useState(false)
  const [listError, setListError] = useState<string | null>(null)

  // Drag & drop active state
  const [activeCardId, setActiveCardId] = useState<CardDoc['_id'] | null>(null)
  const [activeListId, setActiveListId] = useState<ListDoc['_id'] | null>(null)

  // Local optimistic drag state
  const [optimisticLists, setOptimisticLists] = useState<ListDoc[]>(lists)
  const [optimisticCards, setOptimisticCards] = useState<CardDoc[]>(cards)

  // Keep optimistic state synchronized when server props change and not dragging
  useEffect(() => {
    if (!activeCardId && !activeListId) {
      setOptimisticLists(lists)
      setOptimisticCards(cards)
    }
  }, [lists, cards, activeCardId, activeListId])

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const listIds = useMemo(
    () => optimisticLists.map((l) => l._id),
    [optimisticLists],
  )

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

  const findContainer = (id: string): ListDoc['_id'] | undefined => {
    if (optimisticLists.some((l) => l._id === id)) {
      return id as ListDoc['_id']
    }
    const card = optimisticCards.find((c) => c._id === id)
    return card?.listId
  }

  const handleDragStart = (event: DragStartEvent) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(40)
      } catch {
        // ignore if blocked by browser policy
      }
    }
    const { active } = event
    const activeData = active.data.current
    if (activeData?.type === 'card') {
      setActiveCardId(active.id as CardDoc['_id'])
      setOptimisticLists(lists)
      setOptimisticCards(cards)
    } else if (activeData?.type === 'list') {
      setActiveListId(active.id as ListDoc['_id'])
      setOptimisticLists(lists)
      setOptimisticCards(cards)
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)
    const activeData = active.data.current
    const overData = over.data.current

    // Live list reordering during drag
    if (activeData?.type === 'list' && overData?.type === 'list') {
      if (activeId !== overId) {
        setOptimisticLists((prev) => {
          const oldIndex = prev.findIndex((l) => l._id === activeId)
          const newIndex = prev.findIndex((l) => l._id === overId)
          if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
            return prev
          }
          const next = [...prev]
          const [moved] = next.splice(oldIndex, 1)
          next.splice(newIndex, 0, moved)
          return next
        })
      }
      return
    }

    // Card reordering across or within containers
    if (activeData?.type === 'card') {
      const activeContainer = findContainer(activeId)
      const overContainer = findContainer(overId)

      if (!activeContainer || !overContainer) return

      if (activeContainer !== overContainer) {
        // Cross-container move
        setOptimisticCards((prev) => {
          const activeCardIndex = prev.findIndex((c) => c._id === activeId)
          if (activeCardIndex === -1) return prev

          const currentCard = prev[activeCardIndex]
          const otherCards = prev.filter((c) => c._id !== activeId)

          const targetListCards = otherCards.filter(
            (c) => c.listId === overContainer,
          )
          const overCardIndex = targetListCards.findIndex(
            (c) => c._id === overId,
          )

          const insertIndex =
            overCardIndex >= 0 ? overCardIndex : targetListCards.length

          const updatedTargetList = [...targetListCards]
          updatedTargetList.splice(insertIndex, 0, {
            ...currentCard,
            listId: overContainer,
          })

          const nonTargetCards = otherCards.filter(
            (c) => c.listId !== overContainer,
          )
          return [...nonTargetCards, ...updatedTargetList]
        })
      } else {
        // Intra-container reordering
        if (activeId !== overId && overData?.type === 'card') {
          setOptimisticCards((prev) => {
            const listCards = prev.filter((c) => c.listId === activeContainer)
            const oldIndex = listCards.findIndex((c) => c._id === activeId)
            const newIndex = listCards.findIndex((c) => c._id === overId)

            if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
              return prev
            }

            const reorderedListCards = [...listCards]
            const [moved] = reorderedListCards.splice(oldIndex, 1)
            reorderedListCards.splice(newIndex, 0, moved)

            const otherListCards = prev.filter(
              (c) => c.listId !== activeContainer,
            )
            return [...otherListCards, ...reorderedListCards]
          })
        }
      }
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    const activeId = active.id as string
    const activeData = active.data.current

    setActiveCardId(null)
    setActiveListId(null)

    if (!over) {
      setOptimisticLists(lists)
      setOptimisticCards(cards)
      return
    }

    const overId = over.id as string
    const overData = over.data.current

    // Finalize List Reordering
    if (activeData?.type === 'list') {
      const oldIndex = lists.findIndex((l) => l._id === activeId)
      const targetIndex = optimisticLists.findIndex((l) => l._id === activeId)
      if (
        oldIndex !== -1 &&
        targetIndex !== -1 &&
        (oldIndex !== targetIndex || activeId !== overId)
      ) {
        onReorderList?.(activeId as ListDoc['_id'], targetIndex)
      } else if (overData?.type === 'list' && activeId !== overId) {
        const newIndex = lists.findIndex((l) => l._id === overId)
        if (newIndex !== -1) {
          onReorderList?.(activeId as ListDoc['_id'], newIndex)
        }
      }
      return
    }

    // Finalize Card Reordering
    if (activeData?.type === 'card') {
      const activeCardDoc = optimisticCards.find((c) => c._id === activeId)
      if (!activeCardDoc) {
        setOptimisticLists(lists)
        setOptimisticCards(cards)
        return
      }

      const targetListId = activeCardDoc.listId
      const targetListCards = optimisticCards.filter(
        (c) => c.listId === targetListId,
      )
      const targetIndex = targetListCards.findIndex((c) => c._id === activeId)

      if (targetIndex !== -1) {
        onReorderCard?.(
          activeId as CardDoc['_id'],
          targetListId,
          Math.max(0, targetIndex),
        )
      }
    }
  }

  const handleCreateListSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = newListTitle.trim()
    if (!trimmed) {
      setListError('List title is required')
      return
    }
    try {
      setIsSubmittingList(true)
      setListError(null)
      await onAddList(trimmed)
      setNewListTitle('')
      setIsAddingList(false)
    } catch (error) {
      setListError(
        error instanceof Error ? error.message : 'Failed to add list',
      )
    } finally {
      setIsSubmittingList(false)
    }
  }

  const activeCard = activeCardId
    ? optimisticCards.find((c) => c._id === activeCardId)
    : null
  const activeList = activeListId
    ? optimisticLists.find((l) => l._id === activeListId)
    : null
  const activeListCards = activeList
    ? optimisticCards.filter((c) => c.listId === activeList._id)
    : []

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
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex h-full items-start gap-4 sm:gap-5 pb-4">
          <SortableContext
            items={listIds}
            strategy={horizontalListSortingStrategy}
          >
            {optimisticLists.map((list, index) => {
              const listCards = optimisticCards.filter(
                (c) => c.listId === list._id,
              )
              return (
                <ListColumn
                  key={list._id}
                  list={list}
                  cards={listCards}
                  cardLabelsMap={cardLabelsMap}
                  cardAssigneesMap={cardAssigneesMap}
                  cardCommentsCountMap={cardCommentsCountMap}
                  isFirst={index === 0}
                  isLast={index === optimisticLists.length - 1}
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
                    if (index < optimisticLists.length - 1) {
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

          {/* Quick Add List Column Tile */}
          <div className="w-[85vw] sm:w-80 md:w-84 shrink-0 pr-6">
            {isAddingList ? (
              <form
                onSubmit={handleCreateListSubmit}
                className="rounded-2xl border border-border/80 bg-card p-3.5 shadow-md flex flex-col gap-3"
              >
                <Input
                  id="new-list-title"
                  aria-label="New list title"
                  aria-describedby={listError ? 'new-list-error' : undefined}
                  aria-invalid={listError ? true : undefined}
                  autoFocus
                  placeholder={
                    optimisticLists.length === 0
                      ? 'e.g. To Do, In Progress, Done...'
                      : 'Enter list title...'
                  }
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                  required
                  minLength={1}
                  disabled={isSubmittingList}
                  className="text-sm break-all"
                />
                {listError && (
                  <p
                    id="new-list-error"
                    role="alert"
                    className="text-xs text-destructive"
                  >
                    {listError}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    type="submit"
                    disabled={!newListTitle.trim() || isSubmittingList}
                  >
                    {isSubmittingList
                      ? 'Adding...'
                      : optimisticLists.length === 0
                        ? 'Create List'
                        : 'Add List'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    type="button"
                    onClick={() => {
                      setListError(null)
                      setIsAddingList(false)
                      setNewListTitle('')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingList(true)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border/80 bg-muted/30 p-4 text-sm font-medium text-muted-foreground transition-all hover:border-border hover:bg-muted/60 hover:text-foreground cursor-pointer"
              >
                <Plus className="size-4" />
                <span>
                  {optimisticLists.length === 0
                    ? 'Add your first list'
                    : 'Add another list'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Drag Overlay for smooth visual feedback */}
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
      </DndContext>
    </main>
  )
})
