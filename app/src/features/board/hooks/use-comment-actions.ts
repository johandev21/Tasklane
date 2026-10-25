import { useMutation } from 'convex/react'
import { toast } from 'sonner'
import { api } from '../../../../convex/_generated/api'
import type { CardDoc, CommentDoc } from '#/features/board/types/board.types.ts'

export interface CommentActions {
  addComment: (cardId: CardDoc['_id'], body: string) => Promise<void>
  updateComment: (commentId: CommentDoc['_id'], body: string) => Promise<void>
  deleteComment: (commentId: CommentDoc['_id']) => Promise<void>
}

export function useCommentActions(): CommentActions {
  const addCommentMutation = useMutation(api.comments.add)
  const updateCommentMutation = useMutation(api.comments.update)
  const deleteCommentMutation = useMutation(api.comments.remove)

  const addComment = async (cardId: CardDoc['_id'], body: string) => {
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

  const updateComment = async (commentId: CommentDoc['_id'], body: string) => {
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

  const deleteComment = async (commentId: CommentDoc['_id']) => {
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

  return {
    addComment,
    updateComment,
    deleteComment,
  }
}
