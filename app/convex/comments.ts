import { paginationOptsValidator } from 'convex/server'
import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { assertBoardAccess } from './auth_helpers'
import type { Id } from './_generated/dataModel'

/**
 * Returns paginated comments for a card in reverse-chronological order (_creationTime descending),
 * enriched with author profile details from the cached users table.
 */
export const listByCardPaginated = query({
  args: {
    cardId: v.id('cards'),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.cardId)
    if (!card) {
      return {
        page: [],
        isDone: true,
        continueCursor: '',
      }
    }

    const { board } = await assertBoardAccess(ctx, card.boardId)

    const paginated = await ctx.db
      .query('comments')
      .withIndex('by_cardId', (q) => q.eq('cardId', args.cardId))
      .order('desc')
      .paginate(args.paginationOpts)

    const page = await Promise.all(
      paginated.page.map(async (c) => {
        const user = await ctx.db
          .query('users')
          .withIndex('by_tokenIdentifier', (q) =>
            q.eq('tokenIdentifier', c.authorId),
          )
          .first()

        const isOwner = c.authorId === board.ownerId

        return {
          _id: c._id,
          _creationTime: c._creationTime,
          cardId: c.cardId,
          authorId: c.authorId,
          body: c.body,
          author: {
            userId: c.authorId,
            name: user?.name ?? (isOwner ? 'Board Owner' : 'Team Member'),
            email: user?.email ?? '',
            imageUrl: user?.imageUrl,
            isOwner,
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
 * Returns all comments for a card in chronological order (_creationTime ascending),
 * enriched with author profile details from the cached users table.
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

    const comments = await ctx.db
      .query('comments')
      .withIndex('by_cardId', (q) => q.eq('cardId', args.cardId))
      .collect()

    const enriched = await Promise.all(
      comments.map(async (c) => {
        const user = await ctx.db
          .query('users')
          .withIndex('by_tokenIdentifier', (q) =>
            q.eq('tokenIdentifier', c.authorId),
          )
          .first()

        const isOwner = c.authorId === board.ownerId

        return {
          _id: c._id,
          _creationTime: c._creationTime,
          cardId: c.cardId,
          authorId: c.authorId,
          body: c.body,
          author: {
            userId: c.authorId,
            name: user?.name ?? (isOwner ? 'Board Owner' : 'Team Member'),
            email: user?.email ?? '',
            imageUrl: user?.imageUrl,
            isOwner,
          },
        }
      }),
    )

    return enriched.sort((a, b) => a._creationTime - b._creationTime)
  },
})

/**
 * Returns card comment counts for all cards on a board to power canvas badges.
 */
export const listCommentsCountForBoard = query({
  args: {
    boardId: v.id('boards'),
  },
  handler: async (ctx, args) => {
    await assertBoardAccess(ctx, args.boardId)

    const cards = await ctx.db
      .query('cards')
      .withIndex('by_boardId', (q) => q.eq('boardId', args.boardId))
      .collect()

    const results: { cardId: Id<'cards'>; count: number }[] = []

    for (const card of cards) {
      const cardComments = await ctx.db
        .query('comments')
        .withIndex('by_cardId', (q) => q.eq('cardId', card._id))
        .collect()

      if (cardComments.length > 0) {
        results.push({
          cardId: card._id,
          count: cardComments.length,
        })
      }
    }

    return results
  },
})

/**
 * Adds a new comment to a card. Any active board member can comment.
 * Logs a comment_added activity row.
 */
export const add = mutation({
  args: {
    cardId: v.id('cards'),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.cardId)
    if (!card) {
      throw new Error('Card not found')
    }

    const { userId, board } = await assertBoardAccess(ctx, card.boardId)

    const trimmedBody = args.body.trim()
    if (!trimmedBody) {
      throw new Error('Comment body cannot be empty')
    }

    const commentId = await ctx.db.insert('comments', {
      cardId: args.cardId,
      authorId: userId,
      body: trimmedBody,
    })

    const user = await ctx.db
      .query('users')
      .withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', userId))
      .first()

    const isOwner = board.ownerId === userId
    const authorName = user?.name ?? (isOwner ? 'Board Owner' : 'Team Member')

    const snippet =
      trimmedBody.length > 80
        ? `${trimmedBody.substring(0, 77)}...`
        : trimmedBody

    await ctx.db.insert('activity', {
      boardId: card.boardId,
      actorId: userId,
      type: 'comment_added',
      payload: {
        cardId: args.cardId,
        commentId,
        title: card.title,
        snippet,
        commentBody: trimmedBody,
        authorName,
        authorEmail: user?.email ?? '',
        authorImageUrl: user?.imageUrl,
      },
    })

    return commentId
  },
})

export const create = add

/**
 * Updates an existing comment's body.
 * Author-only permission: only the author of the comment may edit it.
 */
export const update = mutation({
  args: {
    commentId: v.id('comments'),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId)
    if (!comment) {
      throw new Error('Comment not found')
    }

    const card = await ctx.db.get(comment.cardId)
    if (!card) {
      throw new Error('Card not found')
    }

    const { userId } = await assertBoardAccess(ctx, card.boardId)

    if (comment.authorId !== userId) {
      throw new Error(
        'Unauthorized: only the comment author can edit this comment',
      )
    }

    const trimmedBody = args.body.trim()
    if (!trimmedBody) {
      throw new Error('Comment body cannot be empty')
    }

    await ctx.db.patch(args.commentId, {
      body: trimmedBody,
    })
  },
})

export const edit = update

/**
 * Deletes an existing comment.
 * Author-only permission: only the author of the comment may delete it.
 */
export const remove = mutation({
  args: {
    commentId: v.id('comments'),
  },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId)
    if (!comment) {
      throw new Error('Comment not found')
    }

    const card = await ctx.db.get(comment.cardId)
    if (!card) {
      throw new Error('Card not found')
    }

    const { userId } = await assertBoardAccess(ctx, card.boardId)

    if (comment.authorId !== userId) {
      throw new Error(
        'Unauthorized: only the comment author can delete this comment',
      )
    }

    await ctx.db.delete(args.commentId)
  },
})

export const deleteComment = remove
