import { useMutation } from 'convex/react'
import { toast } from 'sonner'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import { reorderLists } from '#/features/board/utils/board-transforms.ts'
import type { ListDoc } from '#/features/board/types/board.types.ts'

export interface ListActions {
  addList: (title: string) => Promise<void>
  renameList: (listId: ListDoc['_id'], newTitle: string) => Promise<void>
  reorderList: (listId: ListDoc['_id'], newPosition: number) => Promise<void>
  deleteList: (list: ListDoc) => Promise<void>
  archiveAllCards: (listId: ListDoc['_id']) => Promise<void>
}

export function useListActions(boardId: Id<'boards'>): ListActions {
  const createListMutation = useMutation(api.lists.create)

  const renameListMutation = useMutation(api.lists.rename).withOptimisticUpdate(
    (localStore, { listId, title }) => {
      const currentLists = localStore.getQuery(api.lists.list, { boardId })
      if (!currentLists) return
      localStore.setQuery(
        api.lists.list,
        { boardId },
        currentLists.map((l) => (l._id === listId ? { ...l, title } : l)),
      )
    },
  )

  const reorderListMutation = useMutation(
    api.lists.reorder,
  ).withOptimisticUpdate((localStore, { listId, newPosition }) => {
    const currentLists = localStore.getQuery(api.lists.list, { boardId })
    if (!currentLists) return
    const reindexed = reorderLists(currentLists, listId, newPosition)
    localStore.setQuery(api.lists.list, { boardId }, reindexed)
  })

  const deleteListMutation = useMutation(api.lists.remove)
  const archiveAllCardsMutation = useMutation(api.lists.archiveAllCards)

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

  const renameList = async (listId: ListDoc['_id'], newTitle: string) => {
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

  const reorderList = async (listId: ListDoc['_id'], newPosition: number) => {
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
        listId: list._id,
      })
      toast.success('List deleted')
    } catch (err) {
      console.error('Failed to delete list:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to delete list.')
    }
  }

  const archiveAllCards = async (listId: ListDoc['_id']) => {
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
