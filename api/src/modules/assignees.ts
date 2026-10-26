import { and, eq } from 'drizzle-orm'
import { Elysia } from 'elysia'
import { assertBoardAccess, getCard, hasBoardAccess, profile } from '../access'
import { cardAssignees, cards } from '../db/schema'
import { ApiError } from '../errors'
import { recordActivity } from '../services'
import type { Services } from '../services'

function assign(
  s: Services,
  actorId: string,
  cardId: string,
  userId: string,
  action: 'add' | 'remove' | 'toggle',
) {
  const card = getCard(s.db, cardId)
  return s.mutate(
    card.boardId,
    actorId,
    ['assignees', 'activity'],
    (tx, { board }) => {
      if (action !== 'remove' && !hasBoardAccess(tx, card.boardId, userId))
        throw new ApiError(
          400,
          'Target user is not a member of this board: cannot assign non-member',
        )
      const existing = tx
        .select()
        .from(cardAssignees)
        .where(
          and(
            eq(cardAssignees.cardId, cardId),
            eq(cardAssignees.userId, userId),
          ),
        )
        .get()
      const remove = action === 'remove' || (action === 'toggle' && !!existing)
      const target = profile(tx, userId, board.ownerId)
      const payload = {
        cardId,
        userId,
        memberName: target.name,
        memberEmail: target.email,
        memberImageUrl: target.imageUrl,
        title: card.title,
      }
      if (remove) {
        if (existing) {
          tx.delete(cardAssignees)
            .where(eq(cardAssignees.id, existing.id))
            .run()
          recordActivity(tx, card.boardId, actorId, 'assignee_removed', payload)
        }
        return { assigned: false, id: null }
      }
      if (existing) return { assigned: true, id: existing.id }
      const link = tx
        .insert(cardAssignees)
        .values({ cardId, userId })
        .returning()
        .get()!
      recordActivity(tx, card.boardId, actorId, 'assignee_added', payload)
      return { assigned: true, id: link.id }
    },
  )
}

export function assigneesModule(s: Services) {
  return new Elysia()
    .use(s.sessions)
    .get(
      '/api/boards/:boardId/assignees',
      ({ user, params }) => {
        if (!user) return []
        const { board } = assertBoardAccess(s.db, params.boardId, user.id)
        return s.db
          .select({ link: cardAssignees })
          .from(cardAssignees)
          .innerJoin(cards, eq(cardAssignees.cardId, cards.id))
          .where(eq(cards.boardId, params.boardId))
          .all()
          .map(({ link }) => ({
            ...link,
            user: profile(s.db, link.userId, board.ownerId),
          }))
      },
      { session: true },
    )
    .get(
      '/api/cards/:cardId/assignees',
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
          .from(cardAssignees)
          .where(eq(cardAssignees.cardId, card.id))
          .all()
          .map((link) => ({
            ...link,
            user: profile(s.db, link.userId, board.ownerId),
          }))
      },
      { session: true },
    )
    .put(
      '/api/cards/:cardId/assignees/:userId',
      ({ user, params }) =>
        assign(s, user.id, params.cardId, params.userId, 'add'),
      { auth: true },
    )
    .delete(
      '/api/cards/:cardId/assignees/:userId',
      ({ user, params }) =>
        assign(s, user.id, params.cardId, params.userId, 'remove'),
      { auth: true },
    )
    .post(
      '/api/cards/:cardId/assignees/:userId/toggle',
      ({ user, params }) =>
        assign(s, user.id, params.cardId, params.userId, 'toggle'),
      { auth: true },
    )
}
