import { useBoardMutation } from '#/shared/api/use-board-mutation.ts'
import { queryKeys } from '#/shared/api/query-keys.ts'
import { toast } from 'sonner'
import { api } from '#/shared/api/client.ts'
import {
  moveCardBetweenLists,
  moveCardToListEnd,
  removeArchivedCard,
  reorderCardsWithinList,
} from '#/features/board/utils/board-transforms.ts'
import type { CardDoc, ListDoc } from '#/features/board/types/board.types.ts'

export interface CardActions {
  addCard: (listId: ListDoc['id'], title: string) => Promise<void>
  renameCard: (cardId: CardDoc['id'], newTitle: string) => Promise<void>
  updateCardDescription: (
    cardId: CardDoc['id'],
    description: string,
  ) => Promise<void>
  updateCardDueDate: (
    cardId: CardDoc['id'],
    dueDate: number | undefined,
  ) => Promise<void>
  moveCardToList: (
    cardId: CardDoc['id'],
    targetListId: ListDoc['id'],
  ) => Promise<void>
  reorderCard: (
    cardId: CardDoc['id'],
    targetListId: ListDoc['id'],
    newPosition: number,
  ) => Promise<void>
  archiveCard: (cardId: CardDoc['id'], onArchived?: () => void) => Promise<void>
  restoreCard: (cardId: CardDoc['id']) => Promise<void>
}

export function useCardActions(boardId: string, listsCount = 0): CardActions {
  const resources = [
    'cards',
    'archivedCards',
    'activity',
    'cardActivity',
  ] as const
  const queryKey = queryKeys.resource(boardId, 'cards')
  const createCardMutation = useBoardMutation({
    boardId,
    mutationFn: api.cards.create,
    resources,
  })
  const renameCardMutation = useBoardMutation({
    boardId,
    mutationFn: api.cards.rename,
    resources,
    optimistic: {
      queryKey,
      update: (cards: CardDoc[], { cardId, title }) =>
        cards.map((card) => (card.id === cardId ? { ...card, title } : card)),
    },
  })
  const reorderCardMutation = useBoardMutation({
    boardId,
    mutationFn: api.cards.reorder,
    resources,
    optimistic: {
      queryKey,
      update: (cards: CardDoc[], { cardId, targetListId, newPosition }) => {
        const card = cards.find((item) => item.id === cardId)
        return card?.listId === targetListId
          ? reorderCardsWithinList(cards, cardId, targetListId, newPosition)
          : moveCardBetweenLists(cards, cardId, targetListId, newPosition)
      },
    },
  })
  const updateCardDescriptionMutation = useBoardMutation({
    boardId,
    mutationFn: api.cards.updateDescription,
    resources,
  })
  const updateCardDueDateMutation = useBoardMutation({
    boardId,
    mutationFn: api.cards.updateDueDate,
    resources,
  })
  const archiveCardMutation = useBoardMutation({
    boardId,
    mutationFn: api.cards.archive,
    resources,
    optimistic: {
      queryKey,
      update: (cards: CardDoc[], { cardId }) =>
        removeArchivedCard(cards, cardId),
    },
  })
  const restoreCardMutation = useBoardMutation({
    boardId,
    mutationFn: api.cards.restore,
    resources,
  })
  const moveCardToListMutation = useBoardMutation({
    boardId,
    mutationFn: api.cards.moveToList,
    resources,
    optimistic: {
      queryKey,
      update: (cards: CardDoc[], { cardId, targetListId }) =>
        moveCardToListEnd(cards, cardId, targetListId),
    },
  })

  const addCard = async (listId: ListDoc['id'], title: string) => {
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

  const renameCard = async (cardId: CardDoc['id'], newTitle: string) => {
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
    cardId: CardDoc['id'],
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
    cardId: CardDoc['id'],
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
    cardId: CardDoc['id'],
    targetListId: ListDoc['id'],
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
    cardId: CardDoc['id'],
    targetListId: ListDoc['id'],
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

  const restoreCard = async (cardId: CardDoc['id']) => {
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
    cardId: CardDoc['id'],
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
