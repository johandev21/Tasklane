import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

/**
 * Creates a new board with the authenticated user as its owner,
 * and records an initial activity entry.
 */
export const create = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error(
        'Unauthenticated: cannot create board without valid session',
      )
    }

    const trimmedName = args.name.trim()
    if (!trimmedName) {
      throw new Error('Board name cannot be empty')
    }

    const boardId = await ctx.db.insert('boards', {
      name: trimmedName,
      ownerId: identity.tokenIdentifier,
    })

    // Record creation activity
    await ctx.db.insert('activity', {
      boardId,
      actorId: identity.tokenIdentifier,
      type: 'board_created',
      payload: {
        boardName: trimmedName,
      },
    })

    return boardId
  },
})

/**
 * Returns all boards that the authenticated user owns or is a member of.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return []
    }

    const userId = identity.tokenIdentifier

    // Query boards owned by the user
    const ownedBoards = await ctx.db
      .query('boards')
      .withIndex('by_ownerId', (q) => q.eq('ownerId', userId))
      .collect()

    // Query board memberships for the user
    const memberships = await ctx.db
      .query('boardMembers')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect()

    const memberBoardIds = new Set(memberships.map((m) => m.boardId))
    const ownedBoardIds = new Set(ownedBoards.map((b) => b._id))

    const memberBoards: (typeof ownedBoards)[number][] = []
    for (const boardId of memberBoardIds) {
      if (!ownedBoardIds.has(boardId)) {
        const board = await ctx.db.get(boardId)
        if (board) {
          memberBoards.push(board)
        }
      }
    }

    const allBoards = [...ownedBoards, ...memberBoards]

    // Enrich boards with member count and ownership flag
    const enriched = await Promise.all(
      allBoards.map(async (board) => {
        const isOwner = board.ownerId === userId
        const members = await ctx.db
          .query('boardMembers')
          .withIndex('by_boardId', (q) => q.eq('boardId', board._id))
          .collect()

        const lists = await ctx.db
          .query('lists')
          .withIndex('by_boardId', (q) => q.eq('boardId', board._id))
          .collect()

        return {
          ...board,
          isOwner,
          memberCount: members.length + 1, // members plus owner
          listsCount: lists.length,
        }
      }),
    )

    return enriched.sort((a, b) => b._creationTime - a._creationTime)
  },
})

/**
 * Returns a specific board by ID, ensuring the authenticated user has access.
 */
export const get = query({
  args: {
    boardId: v.id('boards'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error(
        'Unauthenticated: cannot view board without valid session',
      )
    }

    const board = await ctx.db.get(args.boardId)
    if (!board) {
      return null
    }

    const userId = identity.tokenIdentifier
    const isOwner = board.ownerId === userId

    if (!isOwner) {
      const membership = await ctx.db
        .query('boardMembers')
        .withIndex('by_board_and_user', (q) =>
          q.eq('boardId', args.boardId).eq('userId', userId),
        )
        .first()

      if (!membership) {
        throw new Error('Unauthorized: user is not a member of this board')
      }
    }

    return {
      ...board,
      isOwner,
    }
  },
})
