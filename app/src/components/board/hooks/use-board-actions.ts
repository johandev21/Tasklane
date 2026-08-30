import { useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { toast } from 'sonner'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'

export interface BoardActions {
  renameBoard: (name: string) => Promise<void>
  deleteBoard: () => Promise<void>
}

export function useBoardActions(boardId: Id<'boards'>): BoardActions {
  const navigate = useNavigate()

  const renameBoardMutation = useMutation(
    api.boards.rename,
  ).withOptimisticUpdate((localStore, { name }) => {
    const currentBoard = localStore.getQuery(api.boards.get, { boardId })
    if (currentBoard) {
      localStore.setQuery(
        api.boards.get,
        { boardId },
        { ...currentBoard, name },
      )
    }
  })

  const deleteBoardMutation = useMutation(api.boards.remove)

  const renameBoard = async (name: string) => {
    try {
      await renameBoardMutation({
        boardId,
        name,
      })
    } catch (err) {
      console.error('Failed to rename board:', err)
      toast.error('Failed to rename board. Changes were reverted.')
    }
  }

  const deleteBoard = async () => {
    try {
      await deleteBoardMutation({ boardId })
      await navigate({ to: '/home' })
    } catch (err) {
      console.error('Failed to delete board:', err)
      toast.error('Failed to delete board. Please try again.')
    }
  }

  return {
    renameBoard,
    deleteBoard,
  }
}
