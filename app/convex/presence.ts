import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { assertBoardAccess } from './auth_helpers'
import { PRESENCE_ACTIVE_THRESHOLD_MS } from './constants'

/**
 * Records the authenticated user's presence on a board by upserting
 * their heartbeat row. Only board members may send a heartbeat.
 */
export const heartbeat = mutation({
  args: {
    boardId: v.id('boards'),
  },
  handler: async (ctx, args) => {
    const { userId } = await assertBoardAccess(ctx, args.boardId)

    const existing = await ctx.db
      .query('presence')
      .withIndex('by_board_and_user', (q) =>
        q.eq('boardId', args.boardId).eq('userId', userId),
      )
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastSeen: Date.now(),
      })
    } else {
      await ctx.db.insert('presence', {
        boardId: args.boardId,
        userId,
        lastSeen: Date.now(),
      })
    }
  },
})

/**
 * Returns the board's active viewers: Members whose last heartbeat is
 * within the active threshold, enriched with cached user profile details.
 * Scoped strictly to board members.
 */
export const list = query({
  args: {
    boardId: v.id('boards'),
  },
  handler: async (ctx, args) => {
    await assertBoardAccess(ctx, args.boardId)

    const cutoff = Date.now() - PRESENCE_ACTIVE_THRESHOLD_MS

    const entries = await ctx.db
      .query('presence')
      .withIndex('by_boardId', (q) => q.eq('boardId', args.boardId))
      .collect()

    const activeEntries = entries.filter((entry) => entry.lastSeen >= cutoff)

    const viewers = await Promise.all(
      activeEntries.map(async (entry) => {
        const user = await ctx.db
          .query('users')
          .withIndex('by_tokenIdentifier', (q) =>
            q.eq('tokenIdentifier', entry.userId),
          )
          .first()

        return {
          userId: entry.userId,
          name: user?.name ?? 'Team Member',
          email: user?.email ?? '',
          imageUrl: user?.imageUrl,
        }
      }),
    )

    return viewers.sort((a, b) => a.name.localeCompare(b.name))
  },
})

/**
 * Background sweep: permanently removes presence heartbeats older than
 * the active threshold. Runs on a schedule via convex/cron.ts.
 */
export const sweepStale = mutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - PRESENCE_ACTIVE_THRESHOLD_MS

    const stale = await ctx.db
      .query('presence')
      .withIndex('by_lastSeen', (q) => q.lt('lastSeen', cutoff))
      .collect()

    for (const entry of stale) {
      await ctx.db.delete(entry._id)
    }

    return stale.length
  },
})
