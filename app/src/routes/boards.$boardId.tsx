import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useAuth } from '@clerk/tanstack-react-start'
import { useMutation, useQuery } from 'convex/react'
import { toast } from 'sonner'
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
import type {
  BoardMemberUser,
  CommentDoc,
  ListDoc,
  CardDoc,
  LabelDoc,
} from '#/components/board/types.ts'

export const Route = createFileRoute('/boards/$boardId')({
  component: BoardPage,
})

function BoardPage() {
  const { boardId } = Route.useParams()
  const typedBoardId = boardId as Id<'boards'>

  const { isLoaded, isSignedIn } = useAuth()

  // Live subscriptions to board, lists, active cards, archived cards, activity log, labels, members, assignees, and comments
  const board = useQuery(api.boards.get, { boardId: typedBoardId })
  const lists = useQuery(api.lists.list, { boardId: typedBoardId })
  const cards = useQuery(api.cards.listByBoard, { boardId: typedBoardId })
  const archivedCards = useQuery(api.cards.listArchivedByBoard, {
    boardId: typedBoardId,
  })
  const activities = useQuery(api.activity.list, { boardId: typedBoardId })
  const boardLabels = useQuery(api.labels.listByBoard, {
    boardId: typedBoardId,
  })
  const cardLabelsList = useQuery(api.labels.listCardLabelsForBoard, {
    boardId: typedBoardId,
  })
  const boardMembers = useQuery(api.members.listByBoard, {
    boardId: typedBoardId,
  })
  const cardAssigneesList = useQuery(api.assignees.listCardAssigneesForBoard, {
    boardId: typedBoardId,
  })
  const cardCommentsCountList = useQuery(
    api.comments.listCommentsCountForBoard,
    { boardId: typedBoardId },
  )
  const currentUser = useQuery(api.users.currentUser)

  // Local UI State
  const [isActivityMenuOpen, setIsActivityMenuOpen] = useState(false)
  const [listBeingDeleted, setListBeingDeleted] = useState<ListDoc | null>(null)
  const [activeCardId, setActiveCardId] = useState<Id<'cards'> | null>(null)

  // Subscribed comments for active modal card
  const activeCardComments = useQuery(
    api.comments.listByCard,
    activeCardId ? { cardId: activeCardId } : 'skip',
  )

  // List Mutations
  const createListMutation = useMutation(api.lists.create)
  const renameListMutation = useMutation(api.lists.rename).withOptimisticUpdate(
    (localStore, { listId, title }) => {
      const currentLists = localStore.getQuery(api.lists.list, {
        boardId: typedBoardId,
      })
      if (!currentLists) return
      localStore.setQuery(
        api.lists.list,
        { boardId: typedBoardId },
        currentLists.map((l) => (l._id === listId ? { ...l, title } : l)),
      )
    },
  )
  const reorderListMutation = useMutation(
    api.lists.reorder,
  ).withOptimisticUpdate((localStore, { listId, newPosition }) => {
    const currentLists = localStore.getQuery(api.lists.list, {
      boardId: typedBoardId,
    })
    if (!currentLists) return

    const currentIndex = currentLists.findIndex((l) => l._id === listId)
    if (currentIndex === -1) return

    const updated = [...currentLists].sort((a, b) => a.position - b.position)
    const [moved] = updated.splice(currentIndex, 1)
    const targetIndex = Math.max(0, Math.min(newPosition, updated.length))
    updated.splice(targetIndex, 0, moved)

    const reindexed = updated.map((item, idx) => ({
      ...item,
      position: idx,
    }))

    localStore.setQuery(api.lists.list, { boardId: typedBoardId }, reindexed)
  })
  const deleteListMutation = useMutation(api.lists.remove)
  const archiveAllCardsMutation = useMutation(api.lists.archiveAllCards)

  // Card Mutations
  const createCardMutation = useMutation(api.cards.create)
  const renameCardMutation = useMutation(api.cards.rename).withOptimisticUpdate(
    (localStore, { cardId, title }) => {
      const currentCards = localStore.getQuery(api.cards.listByBoard, {
        boardId: typedBoardId,
      })
      if (currentCards) {
        localStore.setQuery(
          api.cards.listByBoard,
          { boardId: typedBoardId },
          currentCards.map((c) => (c._id === cardId ? { ...c, title } : c)),
        )
      }
    },
  )
  const reorderCardMutation = useMutation(
    api.cards.reorder,
  ).withOptimisticUpdate(
    (localStore, { cardId, targetListId, newPosition }) => {
      const currentCards = localStore.getQuery(api.cards.listByBoard, {
        boardId: typedBoardId,
      })
      if (!currentCards) return

      const card = currentCards.find((c) => c._id === cardId)
      if (!card) return

      const sourceListId = card.listId
      const isSameList = sourceListId === targetListId

      if (isSameList) {
        const listCards = currentCards
          .filter((c) => c.listId === sourceListId && !c.archived)
          .sort((a, b) => a.position - b.position)

        const currentIndex = listCards.findIndex((c) => c._id === cardId)
        if (currentIndex === -1) return

        const [moved] = listCards.splice(currentIndex, 1)
        const targetIndex = Math.max(0, Math.min(newPosition, listCards.length))
        listCards.splice(targetIndex, 0, moved)

        const updatedListCards = listCards.map((c, idx) => ({
          ...c,
          position: idx,
        }))

        const otherCards = currentCards.filter(
          (c) => c.listId !== sourceListId || c.archived,
        )

        localStore.setQuery(
          api.cards.listByBoard,
          { boardId: typedBoardId },
          [...otherCards, ...updatedListCards].sort(
            (a, b) => a.position - b.position,
          ),
        )
      } else {
        // Source list
        const sourceCards = currentCards
          .filter(
            (c) => c.listId === sourceListId && c._id !== cardId && !c.archived,
          )
          .sort((a, b) => a.position - b.position)
          .map((c, idx) => ({ ...c, position: idx }))

        // Target list
        const targetCards = currentCards
          .filter(
            (c) => c.listId === targetListId && c._id !== cardId && !c.archived,
          )
          .sort((a, b) => a.position - b.position)

        const targetIndex = Math.max(
          0,
          Math.min(newPosition, targetCards.length),
        )
        targetCards.splice(targetIndex, 0, {
          ...card,
          listId: targetListId,
        })

        const updatedTargetCards = targetCards.map((c, idx) => ({
          ...c,
          listId: targetListId,
          position: idx,
        }))

        const otherCards = currentCards.filter(
          (c) =>
            (c.listId !== sourceListId && c.listId !== targetListId) ||
            c.archived,
        )

        localStore.setQuery(
          api.cards.listByBoard,
          { boardId: typedBoardId },
          [...otherCards, ...sourceCards, ...updatedTargetCards].sort(
            (a, b) => a.position - b.position,
          ),
        )
      }
    },
  )
  const updateCardDescriptionMutation = useMutation(api.cards.updateDescription)
  const updateCardDueDateMutation = useMutation(api.cards.updateDueDate)
  const archiveCardMutation = useMutation(
    api.cards.archive,
  ).withOptimisticUpdate((localStore, { cardId }) => {
    const currentCards = localStore.getQuery(api.cards.listByBoard, {
      boardId: typedBoardId,
    })
    if (!currentCards) return
    localStore.setQuery(
      api.cards.listByBoard,
      { boardId: typedBoardId },
      currentCards.filter((c) => c._id !== cardId),
    )
  })
  const restoreCardMutation = useMutation(api.cards.restore)
  const moveCardToListMutation = useMutation(
    api.cards.moveToList,
  ).withOptimisticUpdate((localStore, { cardId, targetListId }) => {
    const currentCards = localStore.getQuery(api.cards.listByBoard, {
      boardId: typedBoardId,
    })
    if (!currentCards) return

    const card = currentCards.find((c) => c._id === cardId)
    if (!card || card.listId === targetListId) return

    const sourceListId = card.listId
    const sourceCards = currentCards
      .filter(
        (c) => c.listId === sourceListId && c._id !== cardId && !c.archived,
      )
      .sort((a, b) => a.position - b.position)
      .map((c, idx) => ({ ...c, position: idx }))

    const targetCards = currentCards
      .filter(
        (c) => c.listId === targetListId && c._id !== cardId && !c.archived,
      )
      .sort((a, b) => a.position - b.position)

    const updatedTargetCards = [
      ...targetCards,
      { ...card, listId: targetListId, position: targetCards.length },
    ]

    const otherCards = currentCards.filter(
      (c) =>
        (c.listId !== sourceListId && c.listId !== targetListId) || c.archived,
    )

    localStore.setQuery(
      api.cards.listByBoard,
      { boardId: typedBoardId },
      [...otherCards, ...sourceCards, ...updatedTargetCards].sort(
        (a, b) => a.position - b.position,
      ),
    )
  })

  // Label Mutations
  const createLabelMutation = useMutation(api.labels.create)
  const updateLabelMutation = useMutation(api.labels.update)
  const removeLabelMutation = useMutation(api.labels.remove)
  const toggleCardLabelMutation = useMutation(api.labels.toggleOnCard)

  // Assignee Mutation
  const toggleCardAssigneeMutation = useMutation(api.assignees.toggleOnCard)

  // Comment Mutations
  const addCommentMutation = useMutation(api.comments.add)
  const updateCommentMutation = useMutation(api.comments.update)
  const deleteCommentMutation = useMutation(api.comments.remove)

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

  // Group card labels by cardId
  const cardLabelsMap: Record<string, LabelDoc[] | undefined> = {}
  for (const item of cardLabelsList ?? []) {
    const existing = cardLabelsMap[item.cardId]
    if (existing) {
      existing.push(item.label)
    } else {
      cardLabelsMap[item.cardId] = [item.label]
    }
  }

  // Group card assignees by cardId
  const cardAssigneesMap: Record<string, BoardMemberUser[] | undefined> = {}
  for (const item of cardAssigneesList ?? []) {
    const existing = cardAssigneesMap[item.cardId]
    if (existing) {
      existing.push(item.user)
    } else {
      cardAssigneesMap[item.cardId] = [item.user]
    }
  }

  // Group card comment counts by cardId
  const cardCommentsCountMap: Record<string, number | undefined> = {}
  for (const item of cardCommentsCountList ?? []) {
    cardCommentsCountMap[item.cardId] = item.count
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

  const handleReorderList = async (
    listId: ListDoc['_id'],
    newPosition: number,
  ) => {
    try {
      await reorderListMutation({
        listId,
        newPosition,
      })
    } catch (err) {
      console.error('Failed to reorder list:', err)
      toast.error('Failed to reorder list. Changes were reverted.')
    }
  }

  const handleReorderCard = async (
    cardId: CardDoc['_id'],
    targetListId: ListDoc['_id'],
    newPosition: number,
  ) => {
    try {
      await reorderCardMutation({
        cardId,
        targetListId,
        newPosition,
      })
    } catch (err) {
      console.error('Failed to reorder card:', err)
      toast.error('Failed to move card. Changes were reverted.')
    }
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

  const handleCreateLabel = async (name: string, color: string) => {
    await createLabelMutation({
      boardId: typedBoardId,
      name,
      color,
    })
  }

  const handleUpdateLabel = async (
    labelId: LabelDoc['_id'],
    name?: string,
    color?: string,
  ) => {
    await updateLabelMutation({
      labelId,
      name,
      color,
    })
  }

  const handleRemoveLabel = async (labelId: LabelDoc['_id']) => {
    await removeLabelMutation({
      labelId,
    })
  }

  const handleToggleCardLabel = async (
    cardId: CardDoc['_id'],
    label: LabelDoc,
  ) => {
    await toggleCardLabelMutation({
      cardId,
      labelId: label._id,
    })
  }

  const handleToggleCardAssignee = async (
    cardId: CardDoc['_id'],
    userId: string,
  ) => {
    await toggleCardAssigneeMutation({
      cardId,
      userId,
    })
  }

  const handleAddComment = async (cardId: CardDoc['_id'], body: string) => {
    await addCommentMutation({
      cardId,
      body,
    })
  }

  const handleUpdateComment = async (
    commentId: CommentDoc['_id'],
    body: string,
  ) => {
    await updateCommentMutation({
      commentId,
      body,
    })
  }

  const handleDeleteComment = async (commentId: CommentDoc['_id']) => {
    await deleteCommentMutation({
      commentId,
    })
  }

  const deletedListCardCount = listBeingDeleted
    ? cards.filter((c) => c.listId === listBeingDeleted._id).length
    : 0

  const activeCard = cards.find((c) => c._id === activeCardId) ?? null
  const activeCardLabels = activeCardId
    ? (cardLabelsMap[activeCardId] ?? [])
    : []
  const activeCardAssignees = activeCardId
    ? (cardAssigneesMap[activeCardId] ?? [])
    : []

  const currentUserProfile: BoardMemberUser | null = currentUser
    ? {
        userId: currentUser.tokenIdentifier,
        name: currentUser.name ?? 'You',
        email: currentUser.email,
        imageUrl: currentUser.imageUrl,
        isOwner: currentUser.tokenIdentifier === board.ownerId,
      }
    : null

  return (
    <div className="flex h-screen flex-col bg-app-background font-sans overflow-hidden">
      {/* Top Persistent Board Header */}
      <header className="shrink-0 border-b border-border/60 bg-card/85 shadow-2xs backdrop-blur-md sticky top-0 z-30">
        <BoardHeader
          board={board}
          onOpenBoardMenu={() => setIsActivityMenuOpen(true)}
        />
      </header>

      {/* Main Drag-and-Drop Horizontal Canvas */}
      <BoardCanvas
        lists={lists}
        cards={cards}
        cardLabelsMap={cardLabelsMap}
        cardAssigneesMap={cardAssigneesMap}
        cardCommentsCountMap={cardCommentsCountMap}
        onAddList={handleAddList}
        onRenameList={handleRenameList}
        onDeleteList={(list) => setListBeingDeleted(list)}
        onArchiveAllCards={handleArchiveAllCards}
        onAddCard={handleAddCard}
        onRenameCard={handleRenameCard}
        onArchiveCard={handleArchiveCard}
        onCardClick={(card) => setActiveCardId(card._id)}
        onReorderList={handleReorderList}
        onReorderCard={handleReorderCard}
      />

      {/* Card Detail Modal (Desktop Dialog / Mobile Drawer) */}
      <CardDetailModal
        card={activeCard}
        lists={lists}
        boardLabels={boardLabels ?? []}
        cardLabels={activeCardLabels}
        boardMembers={boardMembers ?? []}
        cardAssignees={activeCardAssignees}
        comments={activeCardComments ?? []}
        activities={activities ?? []}
        currentUserId={currentUser?.tokenIdentifier}
        currentUserProfile={currentUserProfile}
        isOpen={Boolean(activeCard)}
        onClose={() => setActiveCardId(null)}
        onSaveTitle={handleRenameCard}
        onSaveDescription={handleUpdateDescription}
        onUpdateDueDate={handleUpdateDueDate}
        onMoveToList={handleMoveCardToList}
        onArchive={handleArchiveCard}
        onToggleLabel={handleToggleCardLabel}
        onToggleAssignee={handleToggleCardAssignee}
        onAddComment={handleAddComment}
        onUpdateComment={handleUpdateComment}
        onDeleteComment={handleDeleteComment}
      />

      {/* Delete List Confirmation Dialog */}
      <DeleteListDialog
        list={listBeingDeleted}
        cardCount={deletedListCardCount}
        isOpen={!!listBeingDeleted}
        onClose={() => setListBeingDeleted(null)}
        onConfirm={handleDeleteListConfirm}
      />

      {/* Board Menu / Activity Feed, Labels Palette & Archive Sheet */}
      <BoardMenuSheet
        activities={activities ?? []}
        archivedCards={archivedCards ?? []}
        labels={boardLabels ?? []}
        isOwner={board.isOwner}
        isOpen={isActivityMenuOpen}
        onClose={() => setIsActivityMenuOpen(false)}
        onRestoreCard={handleRestoreCard}
        onCreateLabel={handleCreateLabel}
        onUpdateLabel={handleUpdateLabel}
        onRemoveLabel={handleRemoveLabel}
      />
    </div>
  )
}
