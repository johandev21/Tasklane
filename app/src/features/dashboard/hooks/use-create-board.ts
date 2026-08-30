import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { toast } from 'sonner'
import { api } from '../../../../convex/_generated/api'

export function useCreateBoard() {
  const navigate = useNavigate()
  const createBoardMutation = useMutation(api.boards.create)
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
