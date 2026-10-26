import { useBoardMutation } from '#/shared/api/use-board-mutation.ts'
import { queryKeys } from '#/shared/api/query-keys.ts'
import { toast } from 'sonner'
import { api } from '#/shared/api/client.ts'
import { reorderLists } from '#/features/board/utils/board-transforms.ts'
import type { ListDoc } from '#/features/board/types/board.types.ts'

export interface ListActions {
  addList: (title: string) => Promise<void>
  renameList: (listId: ListDoc['id'], newTitle: string) => Promise<void>
  reorderList: (listId: ListDoc['id'], newPosition: number) => Promise<void>
  deleteList: (list: ListDoc) => Promise<void>
  archiveAllCards: (listId: ListDoc['id']) => Promise<void>
}

export function useListActions(boardId: string): ListActions {
  const resources = [
    'lists',
    'cards',
    'archivedCards',
    'activity',
    'cardActivity',
  ] as const
  const createListMutation = useBoardMutation({
    boardId,
    mutationFn: api.lists.create,
    resources,
  })
  const renameListMutation = useBoardMutation({
    boardId,
    mutationFn: api.lists.rename,
    resources,
    optimistic: {
      queryKey: queryKeys.resource(boardId, 'lists'),
      update: (lists: ListDoc[], { listId, title }) =>
        lists.map((list) => (list.id === listId ? { ...list, title } : list)),
    },
  })
  const reorderListMutation = useBoardMutation({
    boardId,
    mutationFn: api.lists.reorder,
    resources,
    optimistic: {
      queryKey: queryKeys.resource(boardId, 'lists'),
      update: (lists: ListDoc[], { listId, newPosition }) =>
        reorderLists(lists, listId, newPosition),
    },
  })
  const deleteListMutation = useBoardMutation({
    boardId,
    mutationFn: api.lists.remove,
    resources,
  })
  const archiveAllCardsMutation = useBoardMutation({
    boardId,
    mutationFn: api.lists.archiveAllCards,
    resources,
  })

  const addList = async (title: string) => {
    try {
      await createListMutation({
        boardId,
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

  const renameList = async (listId: ListDoc['id'], newTitle: string) => {
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

  const reorderList = async (listId: ListDoc['id'], newPosition: number) => {
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

  const deleteList = async (list: ListDoc) => {
    try {
      await deleteListMutation({
        listId: list.id,
      })
      toast.success('List deleted')
    } catch (err) {
      console.error('Failed to delete list:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to delete list.')
      throw err
    }
  }

  const archiveAllCards = async (listId: ListDoc['id']) => {
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

  return {
    addList,
    renameList,
    reorderList,
    deleteList,
    archiveAllCards,
  }
}
