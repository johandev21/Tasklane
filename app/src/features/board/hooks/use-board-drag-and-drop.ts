import { useState, useMemo, useRef, useEffect } from 'react'
import {
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
  SensorDescriptor,
  SensorOptions,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import type { CardDoc, ListDoc } from '#/features/board/types/board.types.ts'

export interface UseBoardDragAndDropProps {
  lists: ListDoc[]
  cards: CardDoc[]
  onReorderList?: (listId: ListDoc['_id'], newPosition: number) => void
  onReorderCard?: (
    cardId: CardDoc['_id'],
    targetListId: ListDoc['_id'],
    newPosition: number,
  ) => void
}

export interface BoardDragAndDropState {
  canvasRef: React.RefObject<HTMLDivElement | null>
  sensors: SensorDescriptor<SensorOptions>[]
  collisionDetectionStrategy: CollisionDetection
  measuring: { droppable: { strategy: MeasuringStrategy } }
  optimisticLists: ListDoc[]
  optimisticCards: CardDoc[]
  listIds: ListDoc['_id'][]
  activeCardId: CardDoc['_id'] | null
  activeListId: ListDoc['_id'] | null
  activeCard: CardDoc | null
  activeList: ListDoc | null
  activeListCards: CardDoc[]
  handleDragStart: (event: DragStartEvent) => void
  handleDragOver: (event: DragOverEvent) => void
  handleDragEnd: (event: DragEndEvent) => void
}

export function useBoardDragAndDrop({
  lists,
  cards,
  onReorderList,
  onReorderCard,
}: UseBoardDragAndDropProps): BoardDragAndDropState {
  const canvasRef = useRef<HTMLDivElement>(null)

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

  const activeCard = activeCardId
    ? (optimisticCards.find((c) => c._id === activeCardId) ?? null)
    : null
  const activeList = activeListId
    ? (optimisticLists.find((l) => l._id === activeListId) ?? null)
    : null
  const activeListCards = activeList
    ? optimisticCards.filter((c) => c.listId === activeList._id)
    : []

  const measuring = {
    droppable: {
      strategy: MeasuringStrategy.Always,
    },
  }

  return {
    canvasRef,
    sensors,
    collisionDetectionStrategy,
    measuring,
    optimisticLists,
    optimisticCards,
    listIds,
    activeCardId,
    activeListId,
    activeCard,
    activeList,
    activeListCards,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  }
}
