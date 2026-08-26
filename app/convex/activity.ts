import { paginationOptsValidator } from 'convex/server'
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

/**
 * Returns paginated activity audit log entries for a board, ordered newest first.
 */
export const listPaginated = query({
  args: {
    boardId: v.id('boards'),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await assertBoardAccess(ctx, args.boardId)

    const paginated = await ctx.db
      .query('activity')
      .withIndex('by_boardId', (q) => q.eq('boardId', args.boardId))
      .order('desc')
      .paginate(args.paginationOpts)

    // Fetch user cached profiles to enrich actor information
    const page = await Promise.all(
      paginated.page.map(async (act) => {
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

    return {
      ...paginated,
      page,
    }
  },
})

/**
 * Returns activity audit log entries for a specific card, ordered newest first.
 */
export const listByCard = query({
  args: {
    cardId: v.id('cards'),
  },
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.cardId)
    if (!card) return []

    await assertBoardAccess(ctx, card.boardId)

    const activities = await ctx.db
      .query('activity')
      .withIndex('by_boardId', (q) => q.eq('boardId', card.boardId))
      .collect()

    // Filter activities relevant to this card
    const cardActivities = activities.filter((act) => {
      const payloadCardId = act.payload.cardId
      const payloadTitle = act.payload.title
      return (
        payloadCardId === args.cardId ||
        (!payloadCardId && payloadTitle === card.title)
      )
    })

    const enriched = await Promise.all(
      cardActivities.map(async (act) => {
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
