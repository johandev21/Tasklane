import { useNavigate } from '@tanstack/react-router'
import { useBoardMutation } from '#/shared/api/use-board-mutation.ts'
import { queryKeys } from '#/shared/api/query-keys.ts'
import type { BoardDoc } from '../types/board.types.ts'
import { toast } from 'sonner'
import { api } from '#/shared/api/client.ts'

export interface BoardActions {
  renameBoard: (name: string) => Promise<void>
  deleteBoard: () => Promise<void>
}

export function useBoardActions(boardId: string): BoardActions {
  const navigate = useNavigate()

  const renameBoardMutation = useBoardMutation({
    boardId,
    mutationFn: api.boards.rename,
    resources: ['board', 'activity'],
    optimistic: {
      queryKey: queryKeys.resource(boardId, 'board'),
      update: (board: BoardDoc | null, { name }) =>
        board ? { ...board, name } : board,
    },
  })
  const deleteBoardMutation = useBoardMutation({
    boardId,
    mutationFn: api.boards.remove,
    resources: ['board'],
  })

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
