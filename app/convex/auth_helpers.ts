import type { MutationCtx, QueryCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'

/**
 * Asserts that the caller is authenticated and has access to the specified board
 * (either as the board owner or as an active board member).
 * Throws an error if unauthenticated, board not found, or unauthorized.
 */
export async function assertBoardAccess(
  ctx: QueryCtx | MutationCtx,
  boardId: Id<'boards'>,
) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new Error(
      'Unauthenticated: cannot access board without valid session',
    )
  }

  const board = await ctx.db.get(boardId)
  if (!board) {
    throw new Error('Board not found')
  }

  const userId = identity.tokenIdentifier
  const isOwner = board.ownerId === userId

  if (!isOwner) {
    const membership = await ctx.db
      .query('boardMembers')
      .withIndex('by_board_and_user', (q) =>
        q.eq('boardId', boardId).eq('userId', userId),
      )
      .first()

    if (!membership) {
      throw new Error('Unauthorized: user is not a member of this board')
    }
  }

  return {
    identity,
    userId,
    board,
    isOwner,
  }
}
