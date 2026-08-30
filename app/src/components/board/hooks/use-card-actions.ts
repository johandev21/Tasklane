import { useMutation } from 'convex/react'
import { toast } from 'sonner'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import {
  moveCardBetweenLists,
  moveCardToListEnd,
  removeArchivedCard,
  reorderCardsWithinList,
} from '../board-transforms.ts'
import type { CardDoc, ListDoc } from '../types.ts'

export interface CardActions {
  addCard: (listId: ListDoc['_id'], title: string) => Promise<void>
  renameCard: (cardId: CardDoc['_id'], newTitle: string) => Promise<void>
  updateCardDescription: (
    cardId: CardDoc['_id'],
    description: string,
  ) => Promise<void>
  updateCardDueDate: (
    cardId: CardDoc['_id'],
    dueDate: number | undefined,
  ) => Promise<void>
  moveCardToList: (
    cardId: CardDoc['_id'],
    targetListId: ListDoc['_id'],
  ) => Promise<void>
  reorderCard: (
    cardId: CardDoc['_id'],
    targetListId: ListDoc['_id'],
    newPosition: number,
  ) => Promise<void>
  archiveCard: (
    cardId: CardDoc['_id'],
    onArchived?: () => void,
  ) => Promise<void>
  restoreCard: (cardId: CardDoc['_id']) => Promise<void>
}

export function useCardActions(
  boardId: Id<'boards'>,
  listsCount = 0,
): CardActions {
  const createCardMutation = useMutation(api.cards.create)

  const renameCardMutation = useMutation(api.cards.rename).withOptimisticUpdate(
    (localStore, { cardId, title }) => {
      const currentCards = localStore.getQuery(api.cards.listByBoard, {
        boardId,
      })
      if (currentCards) {
        localStore.setQuery(
          api.cards.listByBoard,
          { boardId },
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
        boardId,
      })
      if (!currentCards) return

      const card = currentCards.find((c) => c._id === cardId)
      if (!card) return

      const sourceListId = card.listId
      const isSameList = sourceListId === targetListId

      if (isSameList) {
        const updated = reorderCardsWithinList(
          currentCards,
          cardId,
          sourceListId,
          newPosition,
        )
        localStore.setQuery(api.cards.listByBoard, { boardId }, updated)
      } else {
        const updated = moveCardBetweenLists(
          currentCards,
          cardId,
          targetListId,
          newPosition,
        )
        localStore.setQuery(api.cards.listByBoard, { boardId }, updated)
      }
    },
  )

  const updateCardDescriptionMutation = useMutation(api.cards.updateDescription)
  const updateCardDueDateMutation = useMutation(api.cards.updateDueDate)

  const archiveCardMutation = useMutation(
    api.cards.archive,
  ).withOptimisticUpdate((localStore, { cardId }) => {
    const currentCards = localStore.getQuery(api.cards.listByBoard, {
      boardId,
    })
    if (!currentCards) return
    const updated = removeArchivedCard(currentCards, cardId)
    localStore.setQuery(api.cards.listByBoard, { boardId }, updated)
  })

  const restoreCardMutation = useMutation(api.cards.restore)

  const moveCardToListMutation = useMutation(
    api.cards.moveToList,
  ).withOptimisticUpdate((localStore, { cardId, targetListId }) => {
    const currentCards = localStore.getQuery(api.cards.listByBoard, {
      boardId,
    })
    if (!currentCards) return
    const updated = moveCardToListEnd(currentCards, cardId, targetListId)
    localStore.setQuery(api.cards.listByBoard, { boardId }, updated)
  })

  const addCard = async (listId: ListDoc['_id'], title: string) => {
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

  const renameCard = async (cardId: CardDoc['_id'], newTitle: string) => {
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

  const updateCardDescription = async (
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

  const updateCardDueDate = async (
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

  const moveCardToList = async (
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

  const reorderCard = async (
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

  const restoreCard = async (cardId: CardDoc['_id']) => {
    try {
      if (listsCount === 0) {
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

  const archiveCard = async (
    cardId: CardDoc['_id'],
    onArchived?: () => void,
  ) => {
    try {
      await archiveCardMutation({
        cardId,
      })
      onArchived?.()
      toast('Card archived', {
        action: {
          label: 'Undo',
          onClick: () => restoreCard(cardId),
        },
      })
    } catch (err) {
      console.error('Failed to archive card:', err)
      toast.error(
        err instanceof Error ? err.message : 'Failed to archive card.',
      )
    }
  }

  return {
    addCard,
    renameCard,
    updateCardDescription,
    updateCardDueDate,
    moveCardToList,
    reorderCard,
    archiveCard,
    restoreCard,
  }
}
