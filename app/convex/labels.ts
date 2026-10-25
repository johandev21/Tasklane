import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { assertBoardAccess } from './auth_helpers'
import { LABEL_COLORS } from './constants'
import type { LabelColor } from './constants'
import type { Doc, Id } from './_generated/dataModel'

/**
 * Returns all palette labels for a board, ordered by creation time.
 */
export const listByBoard = query({
  args: {
    boardId: v.id('boards'),
  },
  handler: async (ctx, args) => {
    await assertBoardAccess(ctx, args.boardId)

    const labels = await ctx.db
      .query('labels')
      .withIndex('by_boardId', (q) => q.eq('boardId', args.boardId))
      .collect()

    return labels.sort((a, b) => a._creationTime - b._creationTime)
  },
})

/**
 * Returns all card-label links for a board, enriched with reactive label doc details.
 */
export const listCardLabelsForBoard = query({
  args: {
    boardId: v.id('boards'),
  },
  handler: async (ctx, args) => {
    await assertBoardAccess(ctx, args.boardId)

    const labels = await ctx.db
      .query('labels')
      .withIndex('by_boardId', (q) => q.eq('boardId', args.boardId))
      .collect()

    const results: {
      _id: Id<'cardLabels'>
      cardId: Id<'cards'>
      labelId: Id<'labels'>
      label: Doc<'labels'>
    }[] = []

    for (const label of labels) {
      const links = await ctx.db
        .query('cardLabels')
        .withIndex('by_labelId', (q) => q.eq('labelId', label._id))
        .collect()

      for (const link of links) {
        results.push({
          _id: link._id,
          cardId: link.cardId,
          labelId: link.labelId,
          label,
        })
      }
    }

    return results
  },
})

/**
 * Returns all labels attached to a specific card.
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

    await assertBoardAccess(ctx, card.boardId)

    const links = await ctx.db
      .query('cardLabels')
      .withIndex('by_cardId', (q) => q.eq('cardId', args.cardId))
      .collect()

    const labels: Doc<'labels'>[] = []
    for (const link of links) {
      const label = await ctx.db.get(link.labelId)
      if (label) {
        labels.push(label)
      }
    }

    return labels.sort((a, b) => a._creationTime - b._creationTime)
  },
})

/**
 * Creates a new palette label on a board (Owner only).
 * Enforces the maximum palette size of 8 labels per board and valid colors.
 */
export const create = mutation({
  args: {
    boardId: v.id('boards'),
    name: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const { isOwner } = await assertBoardAccess(ctx, args.boardId)
    if (!isOwner) {
      throw new Error(
        'Unauthorized: only the board owner can manage the label palette',
      )
    }

    const trimmedName = args.name.trim()
    if (!trimmedName) {
      throw new Error('Label name cannot be empty')
    }

    if (!LABEL_COLORS.includes(args.color as LabelColor)) {
      throw new Error(`Invalid label color: ${args.color}`)
    }

    const existingLabels = await ctx.db
      .query('labels')
      .withIndex('by_boardId', (q) => q.eq('boardId', args.boardId))
      .collect()

    if (existingLabels.length >= 8) {
      throw new Error('Board label palette limit reached (maximum 8 labels)')
    }

    const labelId = await ctx.db.insert('labels', {
      boardId: args.boardId,
      name: trimmedName,
      color: args.color,
    })

    return labelId
  },
})

/**
 * Renames and/or recolors an existing label in the board palette (Owner only).
 */
export const update = mutation({
  args: {
    labelId: v.id('labels'),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const label = await ctx.db.get(args.labelId)
    if (!label) {
      throw new Error('Label not found')
    }

    const { isOwner } = await assertBoardAccess(ctx, label.boardId)
    if (!isOwner) {
      throw new Error(
        'Unauthorized: only the board owner can manage the label palette',
      )
    }

    const patch: { name?: string; color?: string } = {}

    if (args.name !== undefined) {
      const trimmed = args.name.trim()
      if (!trimmed) {
        throw new Error('Label name cannot be empty')
      }
      patch.name = trimmed
    }

    if (args.color !== undefined) {
      if (!LABEL_COLORS.includes(args.color as LabelColor)) {
        throw new Error(`Invalid label color: ${args.color}`)
      }
      patch.color = args.color
    }

    await ctx.db.patch(args.labelId, patch)
  },
})

/**
 * Removes a label from the board palette (Owner only).
 * Automatically cleans up any referencing cardLabels attachments.
 */
export const remove = mutation({
  args: {
    labelId: v.id('labels'),
  },
  handler: async (ctx, args) => {
    const label = await ctx.db.get(args.labelId)
    if (!label) {
      throw new Error('Label not found')
    }

    const { isOwner } = await assertBoardAccess(ctx, label.boardId)
    if (!isOwner) {
      throw new Error(
        'Unauthorized: only the board owner can manage the label palette',
      )
    }

    // Cascade delete any cardLabels referencing this label
    const links = await ctx.db
      .query('cardLabels')
      .withIndex('by_labelId', (q) => q.eq('labelId', args.labelId))
      .collect()

    for (const link of links) {
      await ctx.db.delete(link._id)
    }

    await ctx.db.delete(args.labelId)
  },
})

/**
 * Attaches a palette label to a card and logs a label_added activity row.
 */
export const addToCard = mutation({
  args: {
    cardId: v.id('cards'),
    labelId: v.id('labels'),
  },
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.cardId)
    if (!card) {
      throw new Error('Card not found')
    }

    const { userId } = await assertBoardAccess(ctx, card.boardId)

    const label = await ctx.db.get(args.labelId)
    if (!label) {
      throw new Error('Label not found')
    }

    if (label.boardId !== card.boardId) {
      throw new Error('Label does not belong to this board')
    }

    const existing = await ctx.db
      .query('cardLabels')
      .withIndex('by_card_and_label', (q) =>
        q.eq('cardId', args.cardId).eq('labelId', args.labelId),
      )
      .first()

    if (existing) {
      return existing._id
    }

    const cardLabelId = await ctx.db.insert('cardLabels', {
      cardId: args.cardId,
      labelId: args.labelId,
    })

    // Write activity row
    await ctx.db.insert('activity', {
      boardId: card.boardId,
      actorId: userId,
      type: 'label_added',
      payload: {
        cardId: args.cardId,
        labelId: args.labelId,
        labelName: label.name,
        labelColor: label.color,
        title: card.title,
      },
    })

    return cardLabelId
  },
})

/**
 * Removes a label attachment from a card and logs a label_removed activity row.
 */
export const removeFromCard = mutation({
  args: {
    cardId: v.id('cards'),
    labelId: v.id('labels'),
  },
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.cardId)
    if (!card) {
      throw new Error('Card not found')
    }

    const { userId } = await assertBoardAccess(ctx, card.boardId)

    const label = await ctx.db.get(args.labelId)
    if (!label) {
      throw new Error('Label not found')
    }

    const existing = await ctx.db
      .query('cardLabels')
      .withIndex('by_card_and_label', (q) =>
        q.eq('cardId', args.cardId).eq('labelId', args.labelId),
      )
      .first()

    if (existing) {
      await ctx.db.delete(existing._id)

      // Write activity row
      await ctx.db.insert('activity', {
        boardId: card.boardId,
        actorId: userId,
        type: 'label_removed',
        payload: {
          cardId: args.cardId,
          labelId: args.labelId,
          labelName: label.name,
          labelColor: label.color,
          title: card.title,
        },
      })
    }
  },
})

/**
 * Toggles a label on a card: adds if not present, removes if present.
 */
export const toggleOnCard = mutation({
  args: {
    cardId: v.id('cards'),
    labelId: v.id('labels'),
  },
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.cardId)
    if (!card) {
      throw new Error('Card not found')
    }

    const { userId } = await assertBoardAccess(ctx, card.boardId)

    const label = await ctx.db.get(args.labelId)
    if (!label) {
      throw new Error('Label not found')
    }

    if (label.boardId !== card.boardId) {
      throw new Error('Label does not belong to this board')
    }

    const existing = await ctx.db
      .query('cardLabels')
      .withIndex('by_card_and_label', (q) =>
        q.eq('cardId', args.cardId).eq('labelId', args.labelId),
      )
      .first()

    if (existing) {
      await ctx.db.delete(existing._id)

      await ctx.db.insert('activity', {
        boardId: card.boardId,
        actorId: userId,
        type: 'label_removed',
        payload: {
          cardId: args.cardId,
          labelId: args.labelId,
          labelName: label.name,
          labelColor: label.color,
          title: card.title,
        },
      })

      return false
    } else {
      await ctx.db.insert('cardLabels', {
        cardId: args.cardId,
        labelId: args.labelId,
      })

      await ctx.db.insert('activity', {
        boardId: card.boardId,
        actorId: userId,
        type: 'label_added',
        payload: {
          cardId: args.cardId,
          labelId: args.labelId,
          labelName: label.name,
          labelColor: label.color,
          title: card.title,
        },
      })

      return true
    }
  },
})
