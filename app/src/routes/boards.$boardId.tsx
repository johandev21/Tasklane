import { useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  useConvexAuth,
  useMutation,
  usePaginatedQuery,
  useQuery,
} from 'convex/react'
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

import { useBoardPresence } from '#/hooks/use-board-presence'
import { CardDetailModal } from '#/components/board/modal/card-detail-modal.tsx'
import { BoardHeader } from '#/components/board/board-header.tsx'
import { BoardCanvas } from '#/components/board/board-canvas.tsx'
import { DeleteListDialog } from '#/components/board/delete-list-dialog.tsx'
import { BoardMenuSheet } from '#/components/board/board-menu-sheet.tsx'
import { BoardSkeleton } from '#/components/board/board-skeleton.tsx'
import { AppError } from '#/components/ui/app-error.tsx'
import type {
  BoardMemberUser,
  CommentDoc,
  ListDoc,
  CardDoc,
  LabelDoc,
} from '#/components/board/types.ts'

export const Route = createFileRoute('/boards/$boardId')({
  errorComponent: AppError,
  component: BoardPage,
})

function BoardPage() {
  const { boardId } = Route.useParams()
  const typedBoardId = boardId as Id<'boards'>

  const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth()

  // Live subscriptions to board, lists, active cards, archived cards, labels, members, assignees, and comments
  const queryArgs = isAuthenticated ? { boardId: typedBoardId } : 'skip'

  const board = useQuery(api.boards.get, queryArgs)
  const lists = useQuery(api.lists.list, queryArgs)
  const cards = useQuery(api.cards.listByBoard, queryArgs)
  const archivedCards = useQuery(api.cards.listArchivedByBoard, queryArgs)
  const boardLabels = useQuery(api.labels.listByBoard, queryArgs)
  const cardLabelsList = useQuery(api.labels.listCardLabelsForBoard, queryArgs)
  const boardMembers = useQuery(api.members.listByBoard, queryArgs)
  const cardAssigneesList = useQuery(
    api.assignees.listCardAssigneesForBoard,
    queryArgs,
  )
  const cardCommentsCountList = useQuery(
    api.comments.listCommentsCountForBoard,
    queryArgs,
  )
  const currentUser = useQuery(
    api.users.currentUser,
    isAuthenticated ? {} : 'skip',
  )
  const presenceViewers = useBoardPresence(
    isAuthenticated && board ? typedBoardId : null,
  )

  // Local UI State
  const [isActivityMenuOpen, setIsActivityMenuOpen] = useState(false)
  const [listBeingDeleted, setListBeingDeleted] = useState<ListDoc | null>(null)
  const [activeCardId, setActiveCardId] = useState<Id<'cards'> | null>(null)

  // Subscribed paginated comments for active modal card
  const {
    results: activeCardComments,
    status: commentsStatus,
    loadMore: loadMoreComments,
    isLoading: isCommentsLoading,
  } = usePaginatedQuery(
    api.comments.listByCardPaginated,
    isAuthenticated && activeCardId ? { cardId: activeCardId } : 'skip',
    { initialNumItems: 15 },
  )

  // Subscribed activities for active modal card
  const activeCardActivities = useQuery(
    api.activity.listByCard,
    isAuthenticated && activeCardId ? { cardId: activeCardId } : 'skip',
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

  // Member Mutations
  const inviteMemberMutation = useMutation(api.members.inviteByEmail)
  const removeMemberMutation = useMutation(api.members.remove)

  // Board Mutations
  const navigate = useNavigate()
  const renameBoardMutation = useMutation(
    api.boards.rename,
  ).withOptimisticUpdate((localStore, { name }) => {
    const currentBoard = localStore.getQuery(api.boards.get, {
      boardId: typedBoardId,
    })
    if (currentBoard) {
      localStore.setQuery(
        api.boards.get,
        { boardId: typedBoardId },
        { ...currentBoard, name },
      )
    }
  })
  const deleteBoardMutation = useMutation(api.boards.remove)

  if (isAuthLoading) {
    return <BoardSkeleton />
  }

  if (!isAuthenticated) {
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

  if (board === undefined || lists === undefined || cards === undefined) {
    return <BoardSkeleton />
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
    try {
      await createListMutation({
        boardId: typedBoardId,
        title,
      })
    } catch (err) {
      console.error('Failed to create list:', err)
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to create list. Please try again.',
      )
      throw err
    }
  }

  const handleRenameList = async (listId: ListDoc['_id'], newTitle: string) => {
    try {
      await renameListMutation({
        listId,
        title: newTitle,
      })
    } catch (err) {
      console.error('Failed to rename list:', err)
      toast.error('Failed to rename list. Changes were reverted.')
    }
  }

  const handleDeleteListConfirm = async () => {
    if (listBeingDeleted) {
      try {
        await deleteListMutation({
          listId: listBeingDeleted._id,
        })
        setListBeingDeleted(null)
        toast.success('List deleted')
      } catch (err) {
        console.error('Failed to delete list:', err)
        toast.error(
          err instanceof Error ? err.message : 'Failed to delete list.',
        )
      }
    }
  }

  const handleArchiveAllCards = async (listId: ListDoc['_id']) => {
    try {
      await archiveAllCardsMutation({
        listId,
      })
      toast.success('All cards in list archived')
    } catch (err) {
      console.error('Failed to archive cards:', err)
      toast.error(
        err instanceof Error ? err.message : 'Failed to archive cards in list.',
      )
    }
  }

  const handleAddCard = async (listId: ListDoc['_id'], title: string) => {
    try {
      await createCardMutation({
        listId,
        title,
      })
    } catch (err) {
      console.error('Failed to create card:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to create card.')
      throw err
    }
  }

  const handleRenameCard = async (cardId: CardDoc['_id'], newTitle: string) => {
    try {
      await renameCardMutation({
        cardId,
        title: newTitle,
      })
    } catch (err) {
      console.error('Failed to rename card:', err)
      toast.error('Failed to rename card. Changes were reverted.')
    }
  }

  const handleUpdateDescription = async (
    cardId: CardDoc['_id'],
    description: string,
  ) => {
    try {
      await updateCardDescriptionMutation({
        cardId,
        description: description || undefined,
      })
    } catch (err) {
      console.error('Failed to update description:', err)
      toast.error(
        err instanceof Error ? err.message : 'Failed to update description.',
      )
      throw err
    }
  }

  const handleUpdateDueDate = async (
    cardId: CardDoc['_id'],
    dueDate: number | undefined,
  ) => {
    try {
      await updateCardDueDateMutation({
        cardId,
        dueDate,
      })
    } catch (err) {
      console.error('Failed to update due date:', err)
      toast.error(
        err instanceof Error ? err.message : 'Failed to update due date.',
      )
    }
  }

  const handleMoveCardToList = async (
    cardId: CardDoc['_id'],
    targetListId: ListDoc['_id'],
  ) => {
    try {
      await moveCardToListMutation({
        cardId,
        targetListId,
      })
    } catch (err) {
      console.error('Failed to move card:', err)
      toast.error(
        err instanceof Error ? err.message : 'Failed to move card to list.',
      )
    }
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
    try {
      await archiveCardMutation({
        cardId,
      })
      if (activeCardId === cardId) {
        setActiveCardId(null)
      }
      toast('Card archived', {
        action: {
          label: 'Undo',
          onClick: () => handleRestoreCard(cardId),
        },
      })
    } catch (err) {
      console.error('Failed to archive card:', err)
      toast.error(
        err instanceof Error ? err.message : 'Failed to archive card.',
      )
    }
  }

  const handleRestoreCard = async (cardId: CardDoc['_id']) => {
    try {
      if (lists.length === 0) {
        toast.error('Please create a list on the board before restoring cards.')
        return
      }
      await restoreCardMutation({
        cardId,
      })
      toast.success('Card restored to board')
    } catch (err) {
      console.error('Failed to restore card:', err)
      toast.error(
        err instanceof Error ? err.message : 'Failed to restore card.',
      )
    }
  }

  const handleCreateLabel = async (name: string, color: string) => {
    try {
      await createLabelMutation({
        boardId: typedBoardId,
        name,
        color,
      })
      toast.success(`Created label "${name}"`)
    } catch (err) {
      console.error('Failed to create label:', err)
      toast.error(
        err instanceof Error ? err.message : 'Failed to create label.',
      )
      throw err
    }
  }

  const handleUpdateLabel = async (
    labelId: LabelDoc['_id'],
    name?: string,
    color?: string,
  ) => {
    try {
      await updateLabelMutation({
        labelId,
        name,
        color,
      })
      toast.success('Label updated')
    } catch (err) {
      console.error('Failed to update label:', err)
      toast.error(
        err instanceof Error ? err.message : 'Failed to update label.',
      )
      throw err
    }
  }

  const handleRemoveLabel = async (labelId: LabelDoc['_id']) => {
    try {
      await removeLabelMutation({
        labelId,
      })
      toast.success('Label removed from board')
    } catch (err) {
      console.error('Failed to remove label:', err)
      toast.error(
        err instanceof Error ? err.message : 'Failed to remove label.',
      )
      throw err
    }
  }

  const handleToggleCardLabel = async (
    cardId: CardDoc['_id'],
    label: LabelDoc,
  ) => {
    try {
      await toggleCardLabelMutation({
        cardId,
        labelId: label._id,
      })
    } catch (err) {
      console.error('Failed to toggle label:', err)
      toast.error(
        err instanceof Error ? err.message : 'Failed to toggle label on card.',
      )
    }
  }

  const handleToggleCardAssignee = async (
    cardId: CardDoc['_id'],
    userId: string,
  ) => {
    try {
      await toggleCardAssigneeMutation({
        cardId,
        userId,
      })
    } catch (err) {
      console.error('Failed to toggle assignee:', err)
      toast.error(
        err instanceof Error ? err.message : 'Failed to update card assignee.',
      )
    }
  }

  const handleAddComment = async (cardId: CardDoc['_id'], body: string) => {
    try {
      await addCommentMutation({
        cardId,
        body,
      })
    } catch (err) {
      console.error('Failed to add comment:', err)
      toast.error(
        err instanceof Error ? err.message : 'Failed to post comment.',
      )
      throw err
    }
  }

  const handleUpdateComment = async (
    commentId: CommentDoc['_id'],
    body: string,
  ) => {
    try {
      await updateCommentMutation({
        commentId,
        body,
      })
      toast.success('Comment updated')
    } catch (err) {
      console.error('Failed to update comment:', err)
      toast.error(
        err instanceof Error ? err.message : 'Failed to update comment.',
      )
      throw err
    }
  }

  const handleDeleteComment = async (commentId: CommentDoc['_id']) => {
    try {
      await deleteCommentMutation({
        commentId,
      })
      toast.success('Comment deleted')
    } catch (err) {
      console.error('Failed to delete comment:', err)
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete comment.',
      )
      throw err
    }
  }

  const handleInviteMember = async (email: string) => {
    await inviteMemberMutation({
      boardId: typedBoardId,
      email,
    })
  }

  const handleRemoveMember = async (userId: string) => {
    await removeMemberMutation({
      boardId: typedBoardId,
      userId,
    })
  }

  const handleRenameBoard = async (name: string) => {
    try {
      await renameBoardMutation({
        boardId: typedBoardId,
        name,
      })
    } catch (err) {
      console.error('Failed to rename board:', err)
      toast.error('Failed to rename board. Changes were reverted.')
    }
  }

  const handleDeleteBoard = async () => {
    try {
      await deleteBoardMutation({ boardId: typedBoardId })
      await navigate({ to: '/home' })
    } catch (err) {
      console.error('Failed to delete board:', err)
      toast.error('Failed to delete board. Please try again.')
    }
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
          members={boardMembers ?? []}
          presence={presenceViewers ?? []}
          isOwner={board.isOwner}
          currentUserId={currentUser?.tokenIdentifier}
          onOpenBoardMenu={() => setIsActivityMenuOpen(true)}
          onInviteMember={handleInviteMember}
          onRemoveMember={handleRemoveMember}
          onRenameBoard={handleRenameBoard}
          onDeleteBoard={handleDeleteBoard}
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
        comments={activeCardComments}
        activities={activeCardActivities ?? []}
        commentsStatus={commentsStatus}
        isCommentsLoading={isCommentsLoading}
        onLoadMoreComments={loadMoreComments}
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
        boardId={typedBoardId}
        boardTitle={board.name}
        presence={presenceViewers ?? []}
        archivedCards={archivedCards ?? []}
        labels={boardLabels ?? []}
        isOwner={board.isOwner}
        isOpen={isActivityMenuOpen}
        onClose={() => setIsActivityMenuOpen(false)}
        onRestoreCard={handleRestoreCard}
        onCreateLabel={handleCreateLabel}
        onUpdateLabel={handleUpdateLabel}
        onRemoveLabel={handleRemoveLabel}
        onDeleteBoard={handleDeleteBoard}
      />
    </div>
  )
}
