import { and, eq } from 'drizzle-orm'
import { Elysia, t } from 'elysia'
import { assertBoardAccess, assertOwner, getCard } from '../access'
import { cardLabels, cards, labels } from '../db/schema'
import { ApiError, nonempty, required } from '../errors'
import { recordActivity } from '../services'
import type { Services } from '../services'

const color = t.Union([
  t.Literal('red'),
  t.Literal('orange'),
  t.Literal('yellow'),
  t.Literal('green'),
  t.Literal('teal'),
  t.Literal('blue'),
  t.Literal('purple'),
  t.Literal('pink'),
])

function attach(
  s: Services,
  actorId: string,
  cardId: string,
  labelId: string,
  action: 'add' | 'remove' | 'toggle',
) {
  const card = getCard(s.db, cardId)
  return s.mutate(card.boardId, actorId, ['cardLabels', 'activity'], (tx) => {
    const label = required(
      tx.select().from(labels).where(eq(labels.id, labelId)).get(),
      'Label',
    )
    if (label.boardId !== card.boardId)
      throw new ApiError(400, 'Label does not belong to this board')
    const existing = tx
      .select()
      .from(cardLabels)
      .where(
        and(eq(cardLabels.cardId, cardId), eq(cardLabels.labelId, labelId)),
      )
      .get()
    const remove = action === 'remove' || (action === 'toggle' && !!existing)
    if (remove) {
      if (existing) {
        tx.delete(cardLabels).where(eq(cardLabels.id, existing.id)).run()
        recordActivity(tx, card.boardId, actorId, 'label_removed', {
          cardId,
          labelId,
          labelName: label.name,
          labelColor: label.color,
          title: card.title,
        })
      }
      return { attached: false, id: null }
    }
    if (existing) return { attached: true, id: existing.id }
    const link = tx
      .insert(cardLabels)
      .values({ cardId, labelId })
      .returning()
      .get()!
    recordActivity(tx, card.boardId, actorId, 'label_added', {
      cardId,
      labelId,
      labelName: label.name,
      labelColor: label.color,
      title: card.title,
    })
    return { attached: true, id: link.id }
  })
}

export function labelsModule(s: Services) {
  return new Elysia()
    .use(s.sessions)
    .get(
      '/api/boards/:boardId/labels',
      ({ user, params }) => {
        if (!user) return []
        assertBoardAccess(s.db, params.boardId, user.id)
        return s.db
          .select()
          .from(labels)
          .where(eq(labels.boardId, params.boardId))
          .orderBy(labels.createdAt, labels.id)
          .all()
      },
      { session: true },
    )
    .get(
      '/api/boards/:boardId/card-labels',
      ({ user, params }) => {
        if (!user) return []
        assertBoardAccess(s.db, params.boardId, user.id)
        return s.db
          .select({
            id: cardLabels.id,
            cardId: cardLabels.cardId,
            labelId: cardLabels.labelId,
            label: labels,
          })
          .from(cardLabels)
          .innerJoin(labels, eq(cardLabels.labelId, labels.id))
          .where(eq(labels.boardId, params.boardId))
          .all()
      },
      { session: true },
    )
    .get(
      '/api/cards/:cardId/labels',
      ({ user, params }) => {
        if (!user) return []
        const card = s.db
          .select()
          .from(cards)
          .where(eq(cards.id, params.cardId))
          .get()
        if (!card) return []
        assertBoardAccess(s.db, card.boardId, user.id)
        return s.db
          .select({ label: labels })
          .from(cardLabels)
          .innerJoin(labels, eq(cardLabels.labelId, labels.id))
          .where(eq(cardLabels.cardId, card.id))
          .orderBy(labels.createdAt, labels.id)
          .all()
          .map((row) => row.label)
      },
      { session: true },
    )
    .post(
      '/api/boards/:boardId/labels',
      ({ user, params, body }) =>
        s.mutate(params.boardId, user.id, ['labels'], (tx, access) => {
          assertOwner(access)
          const name = nonempty(body.name, 'Label name')
          if (
            tx
              .select()
              .from(labels)
              .where(eq(labels.boardId, params.boardId))
              .all().length >= 8
          ) {
            throw new ApiError(
              409,
              'Board label palette limit reached (maximum 8 labels)',
            )
          }
          return tx
            .insert(labels)
            .values({ boardId: params.boardId, name, color: body.color })
            .returning()
            .get()!.id
        }),
      { auth: true, body: t.Object({ name: t.String(), color }) },
    )
    .patch(
      '/api/labels/:labelId',
      ({ user, params, body }) => {
        const label = required(
          s.db.select().from(labels).where(eq(labels.id, params.labelId)).get(),
          'Label',
        )
        return s.mutate(
          label.boardId,
          user.id,
          ['labels', 'cardLabels'],
          (tx, access) => {
            assertOwner(access)
            const name =
              body.name === undefined
                ? label.name
                : nonempty(body.name, 'Label name')
            tx.update(labels)
              .set({ name, color: body.color ?? label.color })
              .where(eq(labels.id, label.id))
              .run()
            return { success: true }
          },
        )
      },
      {
        auth: true,
        body: t.Object({
          name: t.Optional(t.String()),
          color: t.Optional(color),
        }),
      },
    )
    .delete(
      '/api/labels/:labelId',
      ({ user, params }) => {
        const label = required(
          s.db.select().from(labels).where(eq(labels.id, params.labelId)).get(),
          'Label',
        )
        return s.mutate(
          label.boardId,
          user.id,
          ['labels', 'cardLabels'],
          (tx, access) => {
            assertOwner(access)
            tx.delete(labels).where(eq(labels.id, label.id)).run()
            return { success: true }
          },
        )
      },
      { auth: true },
    )
    .put(
      '/api/cards/:cardId/labels/:labelId',
      ({ user, params }) =>
        attach(s, user.id, params.cardId, params.labelId, 'add'),
      { auth: true },
    )
    .delete(
      '/api/cards/:cardId/labels/:labelId',
      ({ user, params }) =>
        attach(s, user.id, params.cardId, params.labelId, 'remove'),
      { auth: true },
    )
    .post(
      '/api/cards/:cardId/labels/:labelId/toggle',
      ({ user, params }) =>
        attach(s, user.id, params.cardId, params.labelId, 'toggle'),
      { auth: true },
    )
}
