import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useAuth } from '@clerk/tanstack-react-start'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '#/components/ui/empty.tsx'
import { Button } from '#/components/ui/button.tsx'

import { CardDetailModal } from '#/components/board/modal/card-detail-modal.tsx'
import { BoardHeader } from '#/components/board/board-header.tsx'
import { BoardCanvas } from '#/components/board/board-canvas.tsx'
import { DeleteListDialog } from '#/components/board/delete-list-dialog.tsx'
import { BoardMenuSheet } from '#/components/board/board-menu-sheet.tsx'
import { BoardSkeleton } from '#/components/board/board-skeleton.tsx'
import type { ListDoc, CardDoc } from '#/components/board/types.ts'

export const Route = createFileRoute('/boards/$boardId')({
  component: BoardPage,
})

function BoardPage() {
  const { boardId } = Route.useParams()
  const typedBoardId = boardId as Id<'boards'>

  const { isLoaded, isSignedIn } = useAuth()

  // Live subscriptions to board, lists, active cards, archived cards, and activity log
  const board = useQuery(api.boards.get, { boardId: typedBoardId })
  const lists = useQuery(api.lists.list, { boardId: typedBoardId })
  const cards = useQuery(api.cards.listByBoard, { boardId: typedBoardId })
  const archivedCards = useQuery(api.cards.listArchivedByBoard, {
    boardId: typedBoardId,
  })
  const activities = useQuery(api.activity.list, { boardId: typedBoardId })

  // List Mutations
  const createListMutation = useMutation(api.lists.create)
  const renameListMutation = useMutation(api.lists.rename)
  const deleteListMutation = useMutation(api.lists.remove)
  const archiveAllCardsMutation = useMutation(api.lists.archiveAllCards)

  // Card Mutations
  const createCardMutation = useMutation(api.cards.create)
  const renameCardMutation = useMutation(api.cards.rename)
  const updateCardDescriptionMutation = useMutation(api.cards.updateDescription)
  const updateCardDueDateMutation = useMutation(api.cards.updateDueDate)
  const archiveCardMutation = useMutation(api.cards.archive)
  const restoreCardMutation = useMutation(api.cards.restore)
  const moveCardToListMutation = useMutation(api.cards.moveToList)

  // Local UI State
  const [isActivityMenuOpen, setIsActivityMenuOpen] = useState(false)
  const [listBeingDeleted, setListBeingDeleted] = useState<ListDoc | null>(null)
  const [activeCardId, setActiveCardId] = useState<Id<'cards'> | null>(null)

  if (
    !isLoaded ||
    board === undefined ||
    lists === undefined ||
    cards === undefined
  ) {
    return <BoardSkeleton />
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Empty className="max-w-md border border-border bg-card">
          <EmptyHeader>
            <EmptyTitle>Sign in required</EmptyTitle>
            <EmptyDescription>
              Please sign in to access this Tasklane board.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link to="/sign-in/$" params={{ _splat: '' }}>
                Sign In
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    )
  }

  if (board === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Empty className="max-w-md border border-border bg-card">
          <EmptyHeader>
            <EmptyTitle>Board not found</EmptyTitle>
            <EmptyDescription>
              This board does not exist or you do not have permission to view
              it.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link to="/home">Return to Dashboard</Link>
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    )
  }

  const handleAddList = async (title: string) => {
    await createListMutation({
      boardId: typedBoardId,
      title,
    })
  }

  const handleRenameList = async (listId: ListDoc['_id'], newTitle: string) => {
    await renameListMutation({
      listId,
      title: newTitle,
    })
  }

  const handleDeleteListConfirm = async () => {
    if (listBeingDeleted) {
      await deleteListMutation({
        listId: listBeingDeleted._id,
      })
      setListBeingDeleted(null)
    }
  }

  const handleArchiveAllCards = async (listId: ListDoc['_id']) => {
    await archiveAllCardsMutation({
      listId,
    })
  }

  const handleAddCard = async (listId: ListDoc['_id'], title: string) => {
    await createCardMutation({
      listId,
      title,
    })
  }

  const handleRenameCard = async (cardId: CardDoc['_id'], newTitle: string) => {
    await renameCardMutation({
      cardId,
      title: newTitle,
    })
  }

  const handleUpdateDescription = async (
    cardId: CardDoc['_id'],
    description: string,
  ) => {
    await updateCardDescriptionMutation({
      cardId,
      description: description || undefined,
    })
  }

  const handleUpdateDueDate = async (
    cardId: CardDoc['_id'],
    dueDate: number | undefined,
  ) => {
    await updateCardDueDateMutation({
      cardId,
      dueDate,
    })
  }

  const handleMoveCardToList = async (
    cardId: CardDoc['_id'],
    targetListId: ListDoc['_id'],
  ) => {
    await moveCardToListMutation({
      cardId,
      targetListId,
    })
  }

  const handleArchiveCard = async (cardId: CardDoc['_id']) => {
    await archiveCardMutation({
      cardId,
    })
    if (activeCardId === cardId) {
      setActiveCardId(null)
    }
  }

  const handleRestoreCard = async (cardId: CardDoc['_id']) => {
    await restoreCardMutation({
      cardId,
    })
  }

  const deletedListCardCount = listBeingDeleted
    ? cards.filter((c) => c.listId === listBeingDeleted._id).length
    : 0

  const activeCard = cards.find((c) => c._id === activeCardId) ?? null

  return (
    <div className="flex h-screen flex-col bg-app-background font-sans overflow-hidden">
      {/* Top Persistent Board Header */}
      <header className="shrink-0 border-b border-border/60 bg-card/85 shadow-2xs backdrop-blur-md sticky top-0 z-30">
        <BoardHeader
          board={board}
          onOpenActivityMenu={() => setIsActivityMenuOpen(true)}
        />
      </header>

      {/* Main Drag-and-Drop Horizontal Canvas */}
      <BoardCanvas
        lists={lists}
        cards={cards}
        onAddList={handleAddList}
        onRenameList={handleRenameList}
        onDeleteList={(list) => setListBeingDeleted(list)}
        onArchiveAllCards={handleArchiveAllCards}
        onAddCard={handleAddCard}
        onRenameCard={handleRenameCard}
        onArchiveCard={handleArchiveCard}
        onCardClick={(card) => setActiveCardId(card._id)}
      />

      {/* Card Detail Modal (Desktop Dialog / Mobile Drawer) */}
      <CardDetailModal
        card={activeCard}
        lists={lists}
        isOpen={Boolean(activeCard)}
        onClose={() => setActiveCardId(null)}
        onSaveTitle={handleRenameCard}
        onSaveDescription={handleUpdateDescription}
        onUpdateDueDate={handleUpdateDueDate}
        onMoveToList={handleMoveCardToList}
        onArchive={handleArchiveCard}
      />

      {/* Delete List Confirmation Dialog */}
      <DeleteListDialog
        list={listBeingDeleted}
        cardCount={deletedListCardCount}
        isOpen={!!listBeingDeleted}
        onClose={() => setListBeingDeleted(null)}
        onConfirm={handleDeleteListConfirm}
      />

      {/* Board Menu / Activity Feed & Archive Sheet */}
      <BoardMenuSheet
        activities={activities ?? []}
        archivedCards={archivedCards ?? []}
        isOpen={isActivityMenuOpen}
        onClose={() => setIsActivityMenuOpen(false)}
        onRestoreCard={handleRestoreCard}
      />
    </div>
  )
}
