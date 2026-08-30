import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useIsMobile } from '#/hooks/use-mobile'
import { BoardHeader } from './header/board-header'
import { BoardCanvas } from './canvas/board-canvas'
import { CardDetailModal } from './modal/card-detail-modal'
import { DeleteListDialog } from './dialogs/delete-list-dialog'
import { DeleteBoardDialog } from './dialogs/delete-board-dialog'
import type { BoardPrototypeActions } from '#/components/prototype/use-board-prototype-state'

export interface VariantAProps {
  actions: BoardPrototypeActions
}

export function VariantA({ actions }: VariantAProps) {
  const {
    board,
    currentUserId,
    isOwner,
    updateBoardTitle,
    deleteBoard,
    addList,
    renameList,
    deleteList,
    archiveAllCardsInList,
    addCard,
    renameCard,
    updateCard,
    archiveCard,
    reorderLists,
    moveCard,
    moveCardToList,
    addComment,
    editComment,
    deleteComment,
    toggleCardLabel,
    toggleCardAssignee,
  } = actions

  const isMobile = useIsMobile()

  // Modal and Sheet State
  const [activeCardId, setActiveCardId] = useState<string | null>(null)
  const [activeListId, setActiveListId] = useState<string | null>(null)
  const [selectedCardIdForModal, setSelectedCardIdForModal] = useState<
    string | null
  >(null)
  const [isDeleteBoardOpen, setIsDeleteBoardOpen] = useState(false)

  // Label Expansion State (Global board toggle)
  const [isLabelsExpanded, setIsLabelsExpanded] = useState(true)

  // List Management State
  const [isAddingList, setIsAddingList] = useState(false)
  const [newListTitle, setNewListTitle] = useState('')
  const [deletingListId, setDeletingListId] = useState<string | null>(null)

  // Configure sensors for drag & drop with activation constraint (Mouse & Touch)
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

  const findContainer = (id: string) => {
    if (board.lists.some((l) => l.id === id)) {
      return id
    }
    return board.lists.find((l) => l.cardIds.includes(id))?.id
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const activeData = active.data.current
    if (activeData?.type === 'card') {
      setActiveCardId(String(active.id))
    } else if (activeData?.type === 'list') {
      setActiveListId(String(active.id))
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
        const oldIndex = board.lists.findIndex((l) => l.id === activeId)
        const newIndex = board.lists.findIndex((l) => l.id === overId)
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          reorderLists(oldIndex, newIndex)
        }
      }
      return
    }

    // Card reordering across containers
    if (activeData?.type === 'card') {
      const activeContainer = findContainer(activeId)
      const overContainer = findContainer(overId)

      if (
        !activeContainer ||
        !overContainer ||
        activeContainer === overContainer
      ) {
        return
      }

      const overList = board.lists.find((l) => l.id === overContainer)
      if (!overList) return

      const overIndex = overList.cardIds.indexOf(overId)
      const targetIndex = overIndex >= 0 ? overIndex : overList.cardIds.length

      moveCard(activeId, activeContainer, overContainer, targetIndex)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveCardId(null)
    setActiveListId(null)
    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)
    const activeData = active.data.current
    const overData = over.data.current

    // List reordering
    if (activeData?.type === 'list' && overData?.type === 'list') {
      if (activeId !== overId) {
        const oldIndex = board.lists.findIndex((l) => l.id === activeId)
        const newIndex = board.lists.findIndex((l) => l.id === overId)
        if (oldIndex !== -1 && newIndex !== -1) {
          reorderLists(oldIndex, newIndex)
        }
      }
      return
    }

    // Card reordering in same container
    const activeContainer = findContainer(activeId)
    const overContainer = findContainer(overId)

    if (activeContainer && overContainer && activeContainer === overContainer) {
      const list = board.lists.find((l) => l.id === activeContainer)
      if (list) {
        const oldIndex = list.cardIds.indexOf(activeId)
        const newIndex = list.cardIds.indexOf(overId)
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          moveCard(activeId, activeContainer, activeContainer, newIndex)
        }
      }
    }
  }

  const handleCreateListSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (newListTitle.trim()) {
      addList(newListTitle.trim())
      setNewListTitle('')
      setIsAddingList(false)
    }
  }

  const activeCard = activeCardId ? board.cards[activeCardId] : null
  const activeList = activeListId
    ? board.lists.find((l) => l.id === activeListId)
    : null
  const selectedCard = selectedCardIdForModal
    ? board.cards[selectedCardIdForModal]
    : null
  const listBeingDeleted = deletingListId
    ? board.lists.find((l) => l.id === deletingListId)
    : null

  return (
    <div className="flex h-screen flex-col bg-app-background font-sans overflow-hidden">
      {/* Top Persistent Board Header */}
      <header className="shrink-0 border-b border-border/60 bg-card/85 shadow-2xs backdrop-blur-md sticky top-0 z-30">
        <BoardHeader
          board={board}
          isOwner={isOwner}
          onUpdateTitle={updateBoardTitle}
          onOpenDeleteBoard={() => setIsDeleteBoardOpen(true)}
        />
      </header>

      {/* Main Drag-and-Drop Horizontal Canvas */}
      <BoardCanvas
        board={board}
        sensors={sensors}
        isLabelsExpanded={isLabelsExpanded}
        activeCard={activeCard}
        activeList={activeList}
        isAddingList={isAddingList}
        newListTitle={newListTitle}
        onToggleLabelsExpanded={() => setIsLabelsExpanded((prev) => !prev)}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onSelectCard={(id) => setSelectedCardIdForModal(id)}
        onRenameList={renameList}
        onDeleteList={(id) => setDeletingListId(id)}
        onArchiveAllCards={archiveAllCardsInList}
        onAddCard={addCard}
        onRenameCard={renameCard}
        onArchiveCard={archiveCard}
        onNewListTitleChange={setNewListTitle}
        onCreateListSubmit={handleCreateListSubmit}
        onCancelAddList={() => {
          setIsAddingList(false)
          setNewListTitle('')
        }}
        onStartAddList={() => setIsAddingList(true)}
      />

      {/* Responsive Card Detail Modal: Dialog (Desktop/Tablet) vs Drawer (Mobile) */}
      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          board={board}
          currentUserId={currentUserId}
          isMobile={isMobile}
          isOpen={!!selectedCard}
          onClose={() => setSelectedCardIdForModal(null)}
          onUpdateCard={(patch) => updateCard(selectedCard.id, patch)}
          onToggleLabel={(label) => toggleCardLabel(selectedCard.id, label)}
          onToggleAssignee={(memberId) =>
            toggleCardAssignee(selectedCard.id, memberId)
          }
          onAddComment={(text) => addComment(selectedCard.id, text)}
          onEditComment={(commentId, newText) =>
            editComment(selectedCard.id, commentId, newText)
          }
          onDeleteComment={(commentId) =>
            deleteComment(selectedCard.id, commentId)
          }
          onMoveCardToList={(targetListId) =>
            moveCardToList(selectedCard.id, targetListId)
          }
          onArchiveCard={() => {
            archiveCard(selectedCard.id)
            setSelectedCardIdForModal(null)
          }}
        />
      )}

      {/* Delete List Confirmation Alert Dialog */}
      <DeleteListDialog
        list={listBeingDeleted}
        isOpen={!!deletingListId}
        onClose={() => setDeletingListId(null)}
        onConfirm={() => {
          if (deletingListId) {
            deleteList(deletingListId)
            setDeletingListId(null)
          }
        }}
      />

      {/* Delete Board Permanent Confirmation Dialog */}
      <DeleteBoardDialog
        boardTitle={board.title}
        isOpen={isDeleteBoardOpen}
        onClose={() => setIsDeleteBoardOpen(false)}
        onConfirm={() => {
          deleteBoard()
          setIsDeleteBoardOpen(false)
        }}
      />
    </div>
  )
}
