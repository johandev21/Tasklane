import { useBoardMutation } from '#/shared/api/use-board-mutation.ts'
import { toast } from 'sonner'
import { api } from '#/shared/api/client.ts'
import type { CardDoc, CommentDoc } from '#/features/board/types/board.types.ts'

export interface CommentActions {
  addComment: (cardId: CardDoc['id'], body: string) => Promise<void>
  updateComment: (commentId: CommentDoc['id'], body: string) => Promise<void>
  deleteComment: (commentId: CommentDoc['id']) => Promise<void>
}

export function useCommentActions(boardId: string): CommentActions {
  const addCommentMutation = useBoardMutation({
    boardId,
    mutationFn: api.comments.add,
    resources: ['comments', 'commentCounts', 'activity', 'cardActivity'],
  })
  const updateCommentMutation = useBoardMutation({
    boardId,
    mutationFn: api.comments.update,
    resources: ['comments', 'commentCounts', 'activity', 'cardActivity'],
  })
  const deleteCommentMutation = useBoardMutation({
    boardId,
    mutationFn: api.comments.remove,
    resources: ['comments', 'commentCounts', 'activity', 'cardActivity'],
  })

  const addComment = async (cardId: CardDoc['id'], body: string) => {
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

  const updateComment = async (commentId: CommentDoc['id'], body: string) => {
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

  const deleteComment = async (commentId: CommentDoc['id']) => {
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
