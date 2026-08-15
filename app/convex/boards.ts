import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { assertBoardAccess } from './auth_helpers'

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

        const cards = await ctx.db
          .query('cards')
          .withIndex('by_boardId', (q) => q.eq('boardId', board._id))
          .collect()

        const activeCards = cards.filter((c) => !c.archived)

        const listBreakdown = lists.map((l) => ({
          name: l.title,
          cardsCount: activeCards.filter((c) => c.listId === l._id).length,
        }))

        return {
          ...board,
          isOwner,
          memberCount: members.length + 1, // members plus owner
          listsCount: lists.length,
          cardsCount: activeCards.length,
          lists: listBreakdown,
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

/**
 * Renames a board. Only the board owner can rename it.
 * Records a board_renamed activity entry.
 */
export const rename = mutation({
  args: {
    boardId: v.id('boards'),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, board, isOwner } = await assertBoardAccess(
      ctx,
      args.boardId,
    )

    if (!isOwner) {
      throw new Error('Unauthorized: only the board owner can rename the board')
    }

    const trimmedName = args.name.trim()
    if (!trimmedName) {
      throw new Error('Board name cannot be empty')
    }

    const oldName = board.name
    await ctx.db.patch(args.boardId, {
      name: trimmedName,
    })

    // Record rename activity
    await ctx.db.insert('activity', {
      boardId: args.boardId,
      actorId: userId,
      type: 'board_renamed',
      payload: {
        oldName,
        newName: trimmedName,
      },
    })
  },
})

/**
 * Permanently deletes a board and cascades the deletion of everything
 * associated with it: cards (and their labels, assignees, and comments),
 * lists, labels, memberships, activity log, and presence entries.
 * Only the board owner can delete it.
 */
export const remove = mutation({
  args: {
    boardId: v.id('boards'),
  },
  handler: async (ctx, args) => {
    const { isOwner } = await assertBoardAccess(ctx, args.boardId)

    if (!isOwner) {
      throw new Error('Unauthorized: only the board owner can delete the board')
    }

    // Cards and everything attached to them
    const cards = await ctx.db
      .query('cards')
      .withIndex('by_boardId', (q) => q.eq('boardId', args.boardId))
      .collect()

    for (const card of cards) {
      const cardLabels = await ctx.db
        .query('cardLabels')
        .withIndex('by_cardId', (q) => q.eq('cardId', card._id))
        .collect()
      for (const cardLabel of cardLabels) {
        await ctx.db.delete(cardLabel._id)
      }

      const cardAssignees = await ctx.db
        .query('cardAssignees')
        .withIndex('by_cardId', (q) => q.eq('cardId', card._id))
        .collect()
      for (const assignee of cardAssignees) {
        await ctx.db.delete(assignee._id)
      }

      const comments = await ctx.db
        .query('comments')
        .withIndex('by_cardId', (q) => q.eq('cardId', card._id))
        .collect()
      for (const comment of comments) {
        await ctx.db.delete(comment._id)
      }

      await ctx.db.delete(card._id)
    }

    // Lists
    const boardLists = await ctx.db
      .query('lists')
      .withIndex('by_boardId', (q) => q.eq('boardId', args.boardId))
      .collect()
    for (const listDoc of boardLists) {
      await ctx.db.delete(listDoc._id)
    }

    // Labels
    const labels = await ctx.db
      .query('labels')
      .withIndex('by_boardId', (q) => q.eq('boardId', args.boardId))
      .collect()
    for (const label of labels) {
      await ctx.db.delete(label._id)
    }

    // Memberships
    const memberships = await ctx.db
      .query('boardMembers')
      .withIndex('by_boardId', (q) => q.eq('boardId', args.boardId))
      .collect()
    for (const membership of memberships) {
      await ctx.db.delete(membership._id)
    }

    // Activity log
    const activities = await ctx.db
      .query('activity')
      .withIndex('by_boardId', (q) => q.eq('boardId', args.boardId))
      .collect()
    for (const act of activities) {
      await ctx.db.delete(act._id)
    }

    // Presence entries
    const presenceEntries = await ctx.db
      .query('presence')
      .withIndex('by_boardId', (q) => q.eq('boardId', args.boardId))
      .collect()
    for (const entry of presenceEntries) {
      await ctx.db.delete(entry._id)
    }

    // The board itself
    await ctx.db.delete(args.boardId)
  },
})
