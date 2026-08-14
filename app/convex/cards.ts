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

/**
 * Restores an archived card back to active status on the board.
 * Positions it at the end of its list and writes a card_restored activity row.
 */
export const restore = mutation({
  args: {
    cardId: v.id('cards'),
  },
  handler: async (ctx, args) => {
    const cardDoc = await ctx.db.get(args.cardId)
    if (!cardDoc) {
      throw new Error('Card not found')
    }

    const { userId } = await assertBoardAccess(ctx, cardDoc.boardId)

    // Check if list still exists, otherwise assign to first available list
    let targetListId = cardDoc.listId
    const listDoc = await ctx.db.get(targetListId)
    if (!listDoc) {
      const firstList = await ctx.db
        .query('lists')
        .withIndex('by_boardId', (q) => q.eq('boardId', cardDoc.boardId))
        .first()
      if (!firstList) {
        throw new Error('No lists available on this board to restore card')
      }
      targetListId = firstList._id
    }

    const activeListCards = (
      await ctx.db
        .query('cards')
        .withIndex('by_listId', (q) => q.eq('listId', targetListId))
        .collect()
    ).filter((c) => !c.archived)

    const maxPosition = activeListCards.reduce(
      (max, c) => Math.max(max, c.position),
      -1,
    )
    const nextPosition = maxPosition + 1

    await ctx.db.patch(args.cardId, {
      listId: targetListId,
      archived: false,
      position: nextPosition,
    })

    // Write activity row
    await ctx.db.insert('activity', {
      boardId: cardDoc.boardId,
      actorId: userId,
      type: 'card_restored',
      payload: {
        cardId: args.cardId,
        title: cardDoc.title,
      },
    })
  },
})

/**
 * Updates a card's description and writes a description_changed activity row.
 */
export const updateDescription = mutation({
  args: {
    cardId: v.id('cards'),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cardDoc = await ctx.db.get(args.cardId)
    if (!cardDoc) {
      throw new Error('Card not found')
    }

    const { userId } = await assertBoardAccess(ctx, cardDoc.boardId)

    await ctx.db.patch(args.cardId, {
      description: args.description,
    })

    // Write activity row
    await ctx.db.insert('activity', {
      boardId: cardDoc.boardId,
      actorId: userId,
      type: 'description_changed',
      payload: {
        cardId: args.cardId,
        title: cardDoc.title,
      },
    })
  },
})

/**
 * Sets, updates, or clears a card's due date and logs corresponding activity:
 * due_date_set, due_date_changed, or due_date_cleared.
 */
export const updateDueDate = mutation({
  args: {
    cardId: v.id('cards'),
    dueDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const cardDoc = await ctx.db.get(args.cardId)
    if (!cardDoc) {
      throw new Error('Card not found')
    }

    const { userId } = await assertBoardAccess(ctx, cardDoc.boardId)

    const oldDueDate = cardDoc.dueDate
    const newDueDate = args.dueDate

    let activityType: string | null = null
    if (oldDueDate === undefined && newDueDate !== undefined) {
      activityType = 'due_date_set'
    } else if (
      oldDueDate !== undefined &&
      newDueDate !== undefined &&
      oldDueDate !== newDueDate
    ) {
      activityType = 'due_date_changed'
    } else if (oldDueDate !== undefined && newDueDate === undefined) {
      activityType = 'due_date_cleared'
    }

    await ctx.db.patch(args.cardId, {
      dueDate: newDueDate,
    })

    if (activityType) {
      await ctx.db.insert('activity', {
        boardId: cardDoc.boardId,
        actorId: userId,
        type: activityType,
        payload: {
          cardId: args.cardId,
          title: cardDoc.title,
          dueDate: newDueDate,
          oldDueDate,
        },
      })
    }
  },
})

/**
 * Moves a card to a different list within the same board, placing it at the end of the target list.
 * Continuous 0..n-1 integer reindexing is applied and a card_moved activity row is recorded.
 */
export const moveToList = mutation({
  args: {
    cardId: v.id('cards'),
    targetListId: v.id('lists'),
  },
  handler: async (ctx, args) => {
    const cardDoc = await ctx.db.get(args.cardId)
    if (!cardDoc) {
      throw new Error('Card not found')
    }

    const targetList = await ctx.db.get(args.targetListId)
    if (!targetList || targetList.boardId !== cardDoc.boardId) {
      throw new Error('Target list not found on this board')
    }

    const { userId } = await assertBoardAccess(ctx, cardDoc.boardId)

    if (cardDoc.listId === args.targetListId) {
      return
    }

    const sourceListId = cardDoc.listId
    const sourceListDoc = await ctx.db.get(sourceListId)

    // Re-index source list cards
    const sourceCards = (
      await ctx.db
        .query('cards')
        .withIndex('by_listId', (q) => q.eq('listId', sourceListId))
        .collect()
    )
      .filter((c) => !c.archived && c._id !== args.cardId)
      .sort((a, b) => a.position - b.position)

    for (let i = 0; i < sourceCards.length; i++) {
      const card = sourceCards[i]
      if (card.position !== i) {
        await ctx.db.patch(card._id, { position: i })
      }
    }

    // Target cards
    const targetCards = (
      await ctx.db
        .query('cards')
        .withIndex('by_listId', (q) => q.eq('listId', args.targetListId))
        .collect()
    )
      .filter((c) => !c.archived && c._id !== args.cardId)
      .sort((a, b) => a.position - b.position)

    const nextPosition = targetCards.length

    await ctx.db.patch(args.cardId, {
      listId: args.targetListId,
      position: nextPosition,
    })

    // Write activity row
    await ctx.db.insert('activity', {
      boardId: cardDoc.boardId,
      actorId: userId,
      type: 'card_moved',
      payload: {
        cardId: args.cardId,
        title: cardDoc.title,
        sourceListId,
        sourceListTitle: sourceListDoc?.title ?? 'List',
        targetListId: args.targetListId,
        targetListTitle: targetList.title,
        newPosition: nextPosition,
      },
    })
  },
})

/**
 * Reorders a card within its current list or moves and reorders it in a target list.
 * Continuous 0..n-1 integer reindexing is applied to all affected lists to guarantee
 * consistent ordering under concurrent operations.
 * Writes a card_moved activity row when moving between different lists.
 */
export const reorder = mutation({
  args: {
    cardId: v.id('cards'),
    targetListId: v.id('lists'),
    newPosition: v.number(),
  },
  handler: async (ctx, args) => {
    const cardDoc = await ctx.db.get(args.cardId)
    if (!cardDoc) {
      throw new Error('Card not found')
    }

    const targetListDoc = await ctx.db.get(args.targetListId)
    if (!targetListDoc || targetListDoc.boardId !== cardDoc.boardId) {
      throw new Error('Target list not found on this board')
    }

    const { userId } = await assertBoardAccess(ctx, cardDoc.boardId)

    const sourceListId = cardDoc.listId
    const isSameList = sourceListId === args.targetListId

    if (isSameList) {
      // Intra-list reordering
      const activeCards = (
        await ctx.db
          .query('cards')
          .withIndex('by_listId', (q) => q.eq('listId', sourceListId))
          .collect()
      )
        .filter((c) => !c.archived)
        .sort((a, b) => a.position - b.position)

      const currentIndex = activeCards.findIndex((c) => c._id === args.cardId)
      if (currentIndex === -1) {
        return
      }

      const [movedCard] = activeCards.splice(currentIndex, 1)
      const targetIndex = Math.max(
        0,
        Math.min(args.newPosition, activeCards.length),
      )
      activeCards.splice(targetIndex, 0, movedCard)

      // Re-index all cards in the list to consecutive 0..n-1 integers
      for (let i = 0; i < activeCards.length; i++) {
        const card = activeCards[i]
        if (card.position !== i) {
          await ctx.db.patch(card._id, { position: i })
        }
      }
    } else {
      // Inter-list moving & reordering
      const sourceListDoc = await ctx.db.get(sourceListId)

      // 1. Fetch & re-index source list cards
      const sourceCards = (
        await ctx.db
          .query('cards')
          .withIndex('by_listId', (q) => q.eq('listId', sourceListId))
          .collect()
      )
        .filter((c) => !c.archived && c._id !== args.cardId)
        .sort((a, b) => a.position - b.position)

      for (let i = 0; i < sourceCards.length; i++) {
        const card = sourceCards[i]
        if (card.position !== i) {
          await ctx.db.patch(card._id, { position: i })
        }
      }

      // 2. Fetch & insert into target list cards
      const targetCards = (
        await ctx.db
          .query('cards')
          .withIndex('by_listId', (q) => q.eq('listId', args.targetListId))
          .collect()
      )
        .filter((c) => !c.archived && c._id !== args.cardId)
        .sort((a, b) => a.position - b.position)

      const targetIndex = Math.max(
        0,
        Math.min(args.newPosition, targetCards.length),
      )
      targetCards.splice(targetIndex, 0, cardDoc)

      // 3. Re-index all cards in the target list
      for (let i = 0; i < targetCards.length; i++) {
        const card = targetCards[i]
        if (card._id === args.cardId) {
          await ctx.db.patch(card._id, {
            listId: args.targetListId,
            position: i,
          })
        } else if (card.position !== i) {
          await ctx.db.patch(card._id, { position: i })
        }
      }

      // 4. Record card_moved activity row
      await ctx.db.insert('activity', {
        boardId: cardDoc.boardId,
        actorId: userId,
        type: 'card_moved',
        payload: {
          cardId: args.cardId,
          title: cardDoc.title,
          sourceListId,
          sourceListTitle: sourceListDoc?.title ?? 'List',
          targetListId: args.targetListId,
          targetListTitle: targetListDoc.title,
          newPosition: targetIndex,
        },
      })
    }
  },
})

/**
 * Returns a single card by its ID.
 */
export const get = query({
  args: {
    cardId: v.id('cards'),
  },
  handler: async (ctx, args) => {
    const cardDoc = await ctx.db.get(args.cardId)
    if (!cardDoc) {
      return null
    }

    await assertBoardAccess(ctx, cardDoc.boardId)
    return cardDoc
  },
})

/**
 * Returns all archived cards for a board.
 */
export const listArchivedByBoard = query({
  args: {
    boardId: v.id('boards'),
  },
  handler: async (ctx, args) => {
    await assertBoardAccess(ctx, args.boardId)

    const cards = await ctx.db
      .query('cards')
      .withIndex('by_board_and_archived', (q) =>
        q.eq('boardId', args.boardId).eq('archived', true),
      )
      .collect()

    return cards.sort((a, b) => b._creationTime - a._creationTime)
  },
})
