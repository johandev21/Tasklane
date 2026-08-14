import { query } from './_generated/server'
import { v } from 'convex/values'
import { assertBoardAccess } from './auth_helpers'

/**
 * Returns activity audit log entries for a board, ordered newest first.
 */
export const list = query({
  args: {
    boardId: v.id('boards'),
  },
  handler: async (ctx, args) => {
    await assertBoardAccess(ctx, args.boardId)

    const activities = await ctx.db
      .query('activity')
      .withIndex('by_boardId', (q) => q.eq('boardId', args.boardId))
      .collect()

    // Fetch user cached profiles to enrich actor information
    const enriched = await Promise.all(
      activities.map(async (act) => {
        const user = await ctx.db
          .query('users')
          .withIndex('by_tokenIdentifier', (q) =>
            q.eq('tokenIdentifier', act.actorId),
          )
          .first()

        return {
          ...act,
          actor: {
            tokenIdentifier: act.actorId,
            name: user?.name ?? 'Team Member',
            email: user?.email ?? '',
            imageUrl: user?.imageUrl,
          },
        }
      }),
    )

    return enriched.sort((a, b) => b._creationTime - a._creationTime)
  },
})
