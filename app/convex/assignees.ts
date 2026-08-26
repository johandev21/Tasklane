import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { assertBoardAccess } from './auth_helpers'
import type { Id } from './_generated/dataModel'

/**
 * Returns all card assignees across a board, enriched with cached member profile details.
 */
export const listCardAssigneesForBoard = query({
  args: {
    boardId: v.id('boards'),
  },
  handler: async (ctx, args) => {
    const { board } = await assertBoardAccess(ctx, args.boardId)

    const cards = await ctx.db
      .query('cards')
      .withIndex('by_boardId', (q) => q.eq('boardId', args.boardId))
      .collect()

    const results: {
      _id: Id<'cardAssignees'>
      cardId: Id<'cards'>
      userId: string
      user: {
        userId: string
        name: string
        email: string
        imageUrl?: string
        isOwner: boolean
      }
    }[] = []

    for (const card of cards) {
      const links = await ctx.db
        .query('cardAssignees')
        .withIndex('by_cardId', (q) => q.eq('cardId', card._id))
        .collect()

      for (const link of links) {
        const user = await ctx.db
          .query('users')
          .withIndex('by_tokenIdentifier', (q) =>
            q.eq('tokenIdentifier', link.userId),
          )
          .first()

        const isOwner = link.userId === board.ownerId

        results.push({
          _id: link._id,
          cardId: link.cardId,
          userId: link.userId,
          user: {
            userId: link.userId,
            name: user?.name ?? (isOwner ? 'Board Owner' : 'Team Member'),
            email: user?.email ?? '',
            imageUrl: user?.imageUrl,
            isOwner,
          },
        })
      }
    }

    return results
  },
})

/**
 * Returns all assignees for a specific card, enriched with cached member profile details.
 */
export const listByCard = query({
  args: {
    cardId: v.id('cards'),
  },
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.cardId)
    if (!card) {
      return []
    }

    const { board } = await assertBoardAccess(ctx, card.boardId)

    const links = await ctx.db
      .query('cardAssignees')
      .withIndex('by_cardId', (q) => q.eq('cardId', args.cardId))
      .collect()

    const assignees = await Promise.all(
      links.map(async (link) => {
        const user = await ctx.db
          .query('users')
          .withIndex('by_tokenIdentifier', (q) =>
            q.eq('tokenIdentifier', link.userId),
          )
          .first()

        const isOwner = link.userId === board.ownerId

        return {
          _id: link._id,
          cardId: link.cardId,
          userId: link.userId,
          user: {
            userId: link.userId,
            name: user?.name ?? (isOwner ? 'Board Owner' : 'Team Member'),
            email: user?.email ?? '',
            imageUrl: user?.imageUrl,
            isOwner,
          },
        }
      }),
    )

    return assignees
  },
})

/**
 * Assigns a board member to a card and logs an assignee_added activity row.
 * Validates that the target user is an active member or owner of the board.
 */
export const addToCard = mutation({
  args: {
    cardId: v.id('cards'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.cardId)
    if (!card) {
      throw new Error('Card not found')
    }

    const { userId: actorId, board } = await assertBoardAccess(
      ctx,
      card.boardId,
    )

    // Validate that the target user is an active member or owner of the board
    const isTargetOwner = board.ownerId === args.userId
    if (!isTargetOwner) {
      const membership = await ctx.db
        .query('boardMembers')
        .withIndex('by_board_and_user', (q) =>
          q.eq('boardId', card.boardId).eq('userId', args.userId),
        )
        .first()

      if (!membership) {
        throw new Error(
          'Target user is not a member of this board: cannot assign non-member',
        )
      }
    }

    const existing = await ctx.db
      .query('cardAssignees')
      .withIndex('by_card_and_user', (q) =>
        q.eq('cardId', args.cardId).eq('userId', args.userId),
      )
      .first()

    if (existing) {
      return existing._id
    }

    const assigneeId = await ctx.db.insert('cardAssignees', {
      cardId: args.cardId,
      userId: args.userId,
    })

    const targetUser = await ctx.db
      .query('users')
      .withIndex('by_tokenIdentifier', (q) =>
        q.eq('tokenIdentifier', args.userId),
      )
      .first()

    const memberName =
      targetUser?.name ?? (isTargetOwner ? 'Board Owner' : 'Team Member')

    await ctx.db.insert('activity', {
      boardId: card.boardId,
      actorId,
      type: 'assignee_added',
      payload: {
        cardId: args.cardId,
        userId: args.userId,
        memberName,
        memberEmail: targetUser?.email ?? '',
        memberImageUrl: targetUser?.imageUrl,
        title: card.title,
      },
    })

    return assigneeId
  },
})

export const assign = addToCard

/**
 * Removes an assignee from a card and logs an assignee_removed activity row.
 */
export const removeFromCard = mutation({
  args: {
    cardId: v.id('cards'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.cardId)
    if (!card) {
      throw new Error('Card not found')
    }

    const { userId: actorId, board } = await assertBoardAccess(
      ctx,
      card.boardId,
    )

    const existing = await ctx.db
      .query('cardAssignees')
      .withIndex('by_card_and_user', (q) =>
        q.eq('cardId', args.cardId).eq('userId', args.userId),
      )
      .first()

    if (existing) {
      await ctx.db.delete(existing._id)

      const targetUser = await ctx.db
        .query('users')
        .withIndex('by_tokenIdentifier', (q) =>
          q.eq('tokenIdentifier', args.userId),
        )
        .first()

      const isTargetOwner = board.ownerId === args.userId
      const memberName =
        targetUser?.name ?? (isTargetOwner ? 'Board Owner' : 'Team Member')

      await ctx.db.insert('activity', {
        boardId: card.boardId,
        actorId,
        type: 'assignee_removed',
        payload: {
          cardId: args.cardId,
          userId: args.userId,
          memberName,
          memberEmail: targetUser?.email ?? '',
          memberImageUrl: targetUser?.imageUrl,
          title: card.title,
        },
      })
    }
  },
})

export const unassign = removeFromCard

/**
 * Toggles an assignee on a card: assigns if not present, unassigns if present.
 */
export const toggleOnCard = mutation({
  args: {
    cardId: v.id('cards'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.cardId)
    if (!card) {
      throw new Error('Card not found')
    }

    const { userId: actorId, board } = await assertBoardAccess(
      ctx,
      card.boardId,
    )

    // Validate that the target user is an active member or owner of the board
    const isTargetOwner = board.ownerId === args.userId
    if (!isTargetOwner) {
      const membership = await ctx.db
        .query('boardMembers')
        .withIndex('by_board_and_user', (q) =>
          q.eq('boardId', card.boardId).eq('userId', args.userId),
        )
        .first()

      if (!membership) {
        throw new Error(
          'Target user is not a member of this board: cannot assign non-member',
        )
      }
    }

    const existing = await ctx.db
      .query('cardAssignees')
      .withIndex('by_card_and_user', (q) =>
        q.eq('cardId', args.cardId).eq('userId', args.userId),
      )
      .first()

    const targetUser = await ctx.db
      .query('users')
      .withIndex('by_tokenIdentifier', (q) =>
        q.eq('tokenIdentifier', args.userId),
      )
      .first()

    const memberName =
      targetUser?.name ?? (isTargetOwner ? 'Board Owner' : 'Team Member')

    if (existing) {
      await ctx.db.delete(existing._id)

      await ctx.db.insert('activity', {
        boardId: card.boardId,
        actorId,
        type: 'assignee_removed',
        payload: {
          cardId: args.cardId,
          userId: args.userId,
          memberName,
          memberEmail: targetUser?.email ?? '',
          memberImageUrl: targetUser?.imageUrl,
          title: card.title,
        },
      })

      return false
    } else {
      await ctx.db.insert('cardAssignees', {
        cardId: args.cardId,
        userId: args.userId,
      })

      await ctx.db.insert('activity', {
        boardId: card.boardId,
        actorId,
        type: 'assignee_added',
        payload: {
          cardId: args.cardId,
          userId: args.userId,
          memberName,
          memberEmail: targetUser?.email ?? '',
          memberImageUrl: targetUser?.imageUrl,
          title: card.title,
        },
      })

      return true
    }
  },
})

export const toggle = toggleOnCard
