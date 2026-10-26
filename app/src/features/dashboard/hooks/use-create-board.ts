import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '#/shared/api/query-keys.ts'
import { toast } from 'sonner'
import { api } from '#/shared/api/client.ts'

export function useCreateBoard() {
  const navigate = useNavigate()
  const client = useQueryClient()
  const createBoardMutation = useMutation({
    mutationFn: api.boards.create,
    networkMode: 'always',
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.boards }),
  }).mutateAsync
  const [isSubmitting, setIsSubmitting] = useState(false)

  const createBoard = async (name: string) => {
    try {
      setIsSubmitting(true)
      const boardId = await createBoardMutation({ name })
      await navigate({ to: '/boards/$boardId', params: { boardId } })
    } catch (err) {
      console.error('Failed to create board:', err)
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to create board. Please try again.',
      )
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }

  return { createBoard, isSubmitting }
}
