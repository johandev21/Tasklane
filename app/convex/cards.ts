import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { assertBoardAccess } from './auth_helpers'

/**
 * Returns all active (non-archived) cards for a specific board, ordered by position.
 */
export const listByBoard = query({
  args: {
    boardId: v.id('boards'),
  },
  handler: async (ctx, args) => {
    await assertBoardAccess(ctx, args.boardId)

    const cards = await ctx.db
      .query('cards')
      .withIndex('by_board_and_archived', (q) =>
        q.eq('boardId', args.boardId).eq('archived', false),
      )
      .collect()

    return cards.sort((a, b) => a.position - b.position)
  },
})

/**
 * Creates a new card in the specified list, positioned at the end of the list,
 * and writes a card_created activity row.
 */
export const create = mutation({
  args: {
    listId: v.id('lists'),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const listDoc = await ctx.db.get(args.listId)
    if (!listDoc) {
      throw new Error('List not found')
    }

    const { userId } = await assertBoardAccess(ctx, listDoc.boardId)

    const trimmedTitle = args.title.trim()
    if (!trimmedTitle) {
      throw new Error('Card title cannot be empty')
    }

    const activeListCards = (
      await ctx.db
        .query('cards')
        .withIndex('by_listId', (q) => q.eq('listId', args.listId))
        .collect()
    ).filter((c) => !c.archived)

    const maxPosition = activeListCards.reduce(
      (max, c) => Math.max(max, c.position),
      -1,
    )
    const nextPosition = maxPosition + 1

    const cardId = await ctx.db.insert('cards', {
      listId: args.listId,
      boardId: listDoc.boardId,
      title: trimmedTitle,
      position: nextPosition,
      archived: false,
    })

    // Write activity row
    await ctx.db.insert('activity', {
      boardId: listDoc.boardId,
      actorId: userId,
      type: 'card_created',
      payload: {
        cardId,
        title: trimmedTitle,
        listId: args.listId,
        listTitle: listDoc.title,
      },
    })

    return cardId
  },
})

/**
 * Renames an existing card.
 */
export const rename = mutation({
  args: {
    cardId: v.id('cards'),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const cardDoc = await ctx.db.get(args.cardId)
    if (!cardDoc) {
      throw new Error('Card not found')
    }

    await assertBoardAccess(ctx, cardDoc.boardId)

    const trimmedTitle = args.title.trim()
    if (!trimmedTitle) {
      throw new Error('Card title cannot be empty')
    }

    await ctx.db.patch(args.cardId, {
      title: trimmedTitle,
    })
  },
})

/**
 * Archives a card (soft delete - data remains intact in database).
 * Writes a card_archived activity row.
 */
export const archive = mutation({
  args: {
    cardId: v.id('cards'),
  },
  handler: async (ctx, args) => {
    const cardDoc = await ctx.db.get(args.cardId)
    if (!cardDoc) {
      throw new Error('Card not found')
    }

    const { userId } = await assertBoardAccess(ctx, cardDoc.boardId)

    await ctx.db.patch(args.cardId, {
      archived: true,
    })

    // Write activity row
    await ctx.db.insert('activity', {
      boardId: cardDoc.boardId,
      actorId: userId,
      type: 'card_archived',
      payload: {
        cardId: args.cardId,
        title: cardDoc.title,
      },
    })
  },
})
