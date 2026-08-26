import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { assertBoardAccess } from './auth_helpers'

/**
 * Returns all lists for a specific board, ordered by position ascending.
 */
export const list = query({
  args: {
    boardId: v.id('boards'),
  },
  handler: async (ctx, args) => {
    await assertBoardAccess(ctx, args.boardId)

    const lists = await ctx.db
      .query('lists')
      .withIndex('by_boardId', (q) => q.eq('boardId', args.boardId))
      .collect()

    return lists.sort((a, b) => a.position - b.position)
  },
})

/**
 * Creates a new list at the end of the board's list sequence,
 * and writes a list_created activity row.
 */
export const create = mutation({
  args: {
    boardId: v.id('boards'),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await assertBoardAccess(ctx, args.boardId)

    const trimmedTitle = args.title.trim()
    if (!trimmedTitle) {
      throw new Error('List title cannot be empty')
    }

    const existingLists = await ctx.db
      .query('lists')
      .withIndex('by_boardId', (q) => q.eq('boardId', args.boardId))
      .collect()

    const maxPosition = existingLists.reduce(
      (max, l) => Math.max(max, l.position),
      -1,
    )
    const nextPosition = maxPosition + 1

    const listId = await ctx.db.insert('lists', {
      boardId: args.boardId,
      title: trimmedTitle,
      position: nextPosition,
    })

    // Write activity row
    await ctx.db.insert('activity', {
      boardId: args.boardId,
      actorId: userId,
      type: 'list_created',
      payload: {
        listId,
        title: trimmedTitle,
      },
    })

    return listId
  },
})

/**
 * Renames an existing list and writes a list_renamed activity row.
 */
export const rename = mutation({
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
      throw new Error('List title cannot be empty')
    }

    const oldTitle = listDoc.title
    await ctx.db.patch(args.listId, {
      title: trimmedTitle,
    })

    // Write activity row
    await ctx.db.insert('activity', {
      boardId: listDoc.boardId,
      actorId: userId,
      type: 'list_renamed',
      payload: {
        listId: args.listId,
        oldTitle,
        newTitle: trimmedTitle,
      },
    })
  },
})

/**
 * Deletes a list and archives all of its cards.
 * IMPORTANT: Card rows are NEVER destroyed. Each card's `archived` flag is set to true.
 * Writes a list_deleted activity row.
 */
export const remove = mutation({
  args: {
    listId: v.id('lists'),
  },
  handler: async (ctx, args) => {
    const listDoc = await ctx.db.get(args.listId)
    if (!listDoc) {
      throw new Error('List not found')
    }

    const { userId } = await assertBoardAccess(ctx, listDoc.boardId)

    // Find all cards belonging to this list
    const cardsInList = await ctx.db
      .query('cards')
      .withIndex('by_listId', (q) => q.eq('listId', args.listId))
      .collect()

    // Archive all cards in this list (no cards are deleted from the database)
    const activeCards = cardsInList.filter((c) => !c.archived)
    for (const card of activeCards) {
      await ctx.db.patch(card._id, {
        archived: true,
      })
    }

    // Delete the list record itself
    await ctx.db.delete(args.listId)

    // Write activity row
    await ctx.db.insert('activity', {
      boardId: listDoc.boardId,
      actorId: userId,
      type: 'list_deleted',
      payload: {
        listId: args.listId,
        title: listDoc.title,
        archivedCardsCount: activeCards.length,
      },
    })
  },
})

/**
 * Archives all active cards in a list without deleting the list itself.
 */
export const archiveAllCards = mutation({
  args: {
    listId: v.id('lists'),
  },
  handler: async (ctx, args) => {
    const listDoc = await ctx.db.get(args.listId)
    if (!listDoc) {
      throw new Error('List not found')
    }

    const { userId } = await assertBoardAccess(ctx, listDoc.boardId)

    const cardsInList = await ctx.db
      .query('cards')
      .withIndex('by_listId', (q) => q.eq('listId', args.listId))
      .collect()

    const activeCards = cardsInList.filter((c) => !c.archived)
    for (const card of activeCards) {
      await ctx.db.patch(card._id, {
        archived: true,
      })
    }

    if (activeCards.length > 0) {
      await ctx.db.insert('activity', {
        boardId: listDoc.boardId,
        actorId: userId,
        type: 'card_archived',
        payload: {
          listId: args.listId,
          listTitle: listDoc.title,
          count: activeCards.length,
        },
      })
    }
  },
})

/**
 * Reorders a list on a board to a new position.
 * Applies continuous 0..n-1 integer reindexing to all lists on the board.
 */
export const reorder = mutation({
  args: {
    listId: v.id('lists'),
    newPosition: v.number(),
  },
  handler: async (ctx, args) => {
    const listDoc = await ctx.db.get(args.listId)
    if (!listDoc) {
      throw new Error('List not found')
    }

    await assertBoardAccess(ctx, listDoc.boardId)

    const boardLists = (
      await ctx.db
        .query('lists')
        .withIndex('by_boardId', (q) => q.eq('boardId', listDoc.boardId))
        .collect()
    ).sort((a, b) => a.position - b.position)

    const currentIndex = boardLists.findIndex((l) => l._id === args.listId)
    if (currentIndex === -1) {
      return
    }

    const [movedList] = boardLists.splice(currentIndex, 1)
    const targetIndex = Math.max(
      0,
      Math.min(args.newPosition, boardLists.length),
    )
    boardLists.splice(targetIndex, 0, movedList)

    // Re-index all lists on the board to consecutive 0..n-1 integers
    for (let i = 0; i < boardLists.length; i++) {
      const listDocItem = boardLists[i]
      if (listDocItem.position !== i) {
        await ctx.db.patch(listDocItem._id, { position: i })
      }
    }
  },
})
