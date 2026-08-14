import { query } from './_generated/server'
import { v } from 'convex/values'
import { assertBoardAccess } from './auth_helpers'

/**
 * Returns all active members of a board (including the board owner),
 * enriched with cached user profile details from the users table.
 */
export const listByBoard = query({
  args: {
    boardId: v.id('boards'),
  },
  handler: async (ctx, args) => {
    const { board } = await assertBoardAccess(ctx, args.boardId)

    const memberships = await ctx.db
      .query('boardMembers')
      .withIndex('by_boardId', (q) => q.eq('boardId', args.boardId))
      .collect()

    const memberUserIds = new Set<string>()
    // Owner is always a member
    memberUserIds.add(board.ownerId)
    for (const membership of memberships) {
      memberUserIds.add(membership.userId)
    }

    const members = await Promise.all(
      Array.from(memberUserIds).map(async (userId) => {
        const isOwner = userId === board.ownerId
        const user = await ctx.db
          .query('users')
          .withIndex('by_tokenIdentifier', (q) =>
            q.eq('tokenIdentifier', userId),
          )
          .first()

        return {
          userId,
          name: user?.name ?? (isOwner ? 'Board Owner' : 'Team Member'),
          email: user?.email ?? '',
          imageUrl: user?.imageUrl,
          isOwner,
        }
      }),
    )

    // Sort: owner first, then alphabetically by name
    return members.sort((a, b) => {
      if (a.isOwner) return -1
      if (b.isOwner) return 1
      return a.name.localeCompare(b.name)
    })
  },
})
