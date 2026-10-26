import { and, count, desc, eq } from 'drizzle-orm'
import { Elysia, t } from 'elysia'
import { assertBoardAccess, getCard, profile } from '../access'
import { cards, comments } from '../db/schema'
import { ApiError, nonempty, required } from '../errors'
import { cursorCondition, pageResult, paginationQuery } from '../pagination'
import { recordActivity } from '../services'
import type { Services } from '../services'

export function commentsModule(s: Services) {
  return new Elysia()
    .use(s.sessions)
    .get(
      '/api/cards/:cardId/comments',
      ({ user, params }) => {
        if (!user) return []
        const card = s.db
          .select()
          .from(cards)
          .where(eq(cards.id, params.cardId))
          .get()
        if (!card) return []
        const { board } = assertBoardAccess(s.db, card.boardId, user.id)
        return s.db
          .select()
          .from(comments)
          .where(eq(comments.cardId, card.id))
          .orderBy(comments.createdAt, comments.id)
          .all()
          .map((comment) => ({
            ...comment,
            author: profile(s.db, comment.authorId, board.ownerId),
          }))
      },
      { session: true },
    )
    .get(
      '/api/cards/:cardId/comments/page',
      ({ user, params, query }) => {
        const scope = `comments:${params.cardId}`
        if (!user) return pageResult([], query, scope)
        const card = s.db
          .select()
          .from(cards)
          .where(eq(cards.id, params.cardId))
          .get()
        if (!card) return pageResult([], query, scope)
        const { board } = assertBoardAccess(s.db, card.boardId, user.id)
        const rows = s.db
          .select()
          .from(comments)
          .where(
            and(
              eq(comments.cardId, card.id),
              cursorCondition(query, scope, comments),
            ),
          )
          .orderBy(desc(comments.createdAt), desc(comments.id))
          .limit((query.limit ?? 25) + 1)
          .all()
          .map((comment) => ({
            ...comment,
            author: profile(s.db, comment.authorId, board.ownerId),
          }))
        return pageResult(rows, query, scope)
      },
      { session: true, query: paginationQuery },
    )
    .get(
      '/api/boards/:boardId/comment-counts',
      ({ user, params }) => {
        if (!user) return []
        assertBoardAccess(s.db, params.boardId, user.id)
        return s.db
          .select({ cardId: comments.cardId, count: count() })
          .from(comments)
          .innerJoin(cards, eq(comments.cardId, cards.id))
          .where(eq(cards.boardId, params.boardId))
          .groupBy(comments.cardId)
          .all()
      },
      { session: true },
    )
    .post(
      '/api/cards/:cardId/comments',
      ({ user, params, body }) => {
        const card = getCard(s.db, params.cardId)
        return s.mutate(
          card.boardId,
          user.id,
          ['comments', 'commentCounts', 'activity'],
          (tx, { board }) => {
            const text = nonempty(body.body, 'Comment body')
            const comment = tx
              .insert(comments)
              .values({ cardId: card.id, authorId: user.id, body: text })
              .returning()
              .get()!
            const author = profile(tx, user.id, board.ownerId)
            recordActivity(tx, card.boardId, user.id, 'comment_added', {
              cardId: card.id,
              commentId: comment.id,
              title: card.title,
              snippet: text.length > 80 ? `${text.slice(0, 77)}...` : text,
              commentBody: text,
              authorName: author.name,
              authorEmail: author.email,
              authorImageUrl: author.imageUrl,
            })
            return comment.id
          },
        )
      },
      { auth: true, body: t.Object({ body: t.String() }) },
    )
    .patch(
      '/api/comments/:commentId',
      ({ user, params, body }) => {
        const comment = required(
          s.db
            .select()
            .from(comments)
            .where(eq(comments.id, params.commentId))
            .get(),
          'Comment',
        )
        const card = getCard(s.db, comment.cardId)
        return s.mutate(card.boardId, user.id, ['comments'], (tx) => {
          if (comment.authorId !== user.id)
            throw new ApiError(
              403,
              'Only the comment author can edit this comment',
            )
          tx.update(comments)
            .set({ body: nonempty(body.body, 'Comment body') })
            .where(eq(comments.id, comment.id))
            .run()
          return { success: true }
        })
      },
      { auth: true, body: t.Object({ body: t.String() }) },
    )
    .delete(
      '/api/comments/:commentId',
      ({ user, params }) => {
        const comment = required(
          s.db
            .select()
            .from(comments)
            .where(eq(comments.id, params.commentId))
            .get(),
          'Comment',
        )
        const card = getCard(s.db, comment.cardId)
        return s.mutate(
          card.boardId,
          user.id,
          ['comments', 'commentCounts'],
          (tx) => {
            if (comment.authorId !== user.id)
              throw new ApiError(
                403,
                'Only the comment author can delete this comment',
              )
            tx.delete(comments).where(eq(comments.id, comment.id)).run()
            return { success: true }
          },
        )
      },
      { auth: true },
    )
}
