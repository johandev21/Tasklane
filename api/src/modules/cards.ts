import { and, desc, eq } from 'drizzle-orm'
import { Elysia, t } from 'elysia'
import { assertBoardAccess, getCard, getList } from '../access'
import type { Executor } from '../db'
import { cards, lists } from '../db/schema'
import { ApiError, nonempty } from '../errors'
import { insertAtAnchor, orderingFields } from '../ordering'
import type { Move } from '../ordering'
import { recordActivity } from '../services'
import type { Services } from '../services'

function activeCards(db: Executor, listId: string) {
  return db
    .select()
    .from(cards)
    .where(and(eq(cards.listId, listId), eq(cards.archived, false)))
    .orderBy(cards.position, cards.id)
    .all()
}

function nextPosition(db: Executor, listId: string) {
  return (
    activeCards(db, listId).reduce(
      (max, card) => Math.max(max, card.position),
      -1,
    ) + 1
  )
}

function moveCard(
  s: Services,
  userId: string,
  cardId: string,
  targetListId: string,
  move?: Move,
) {
  const card = getCard(s.db, cardId)
  return s.mutate(
    card.boardId,
    userId,
    ['boards', 'cards', 'activity'],
    (tx) => {
      const target = getList(tx, targetListId)
      if (target.boardId !== card.boardId)
        throw new ApiError(400, 'Target list not found on this board')
      if (card.archived)
        throw new ApiError(409, 'Restore an archived card before moving it')
      if (!move && card.listId === target.id) return { success: true }
      const source = card.listId
        ? tx.select().from(lists).where(eq(lists.id, card.listId)).get()
        : undefined
      const targetCards = activeCards(tx, target.id).filter(
        (item) => item.id !== card.id,
      )
      const ordered = insertAtAnchor(targetCards, card, move ?? {})
      if (card.listId && card.listId !== target.id) {
        activeCards(tx, card.listId)
          .filter((item) => item.id !== card.id)
          .forEach((item, position) => {
            tx.update(cards)
              .set({ position })
              .where(eq(cards.id, item.id))
              .run()
          })
      }
      ordered.forEach((item, position) => {
        tx.update(cards)
          .set({ position, listId: target.id })
          .where(eq(cards.id, item.id))
          .run()
      })
      if (card.listId !== target.id) {
        recordActivity(tx, card.boardId, userId, 'card_moved', {
          cardId,
          title: card.title,
          sourceListId: card.listId,
          sourceListTitle: source?.title ?? 'List',
          targetListId: target.id,
          targetListTitle: target.title,
          newPosition: ordered.findIndex((item) => item.id === card.id),
        })
      }
      return { success: true }
    },
  )
}

export function cardsModule(s: Services) {
  return new Elysia()
    .use(s.sessions)
    .get(
      '/api/boards/:boardId/cards',
      ({ user, params }) => {
        if (!user) return []
        assertBoardAccess(s.db, params.boardId, user.id)
        return s.db
          .select()
          .from(cards)
          .where(
            and(eq(cards.boardId, params.boardId), eq(cards.archived, false)),
          )
          .orderBy(cards.position, cards.id)
          .all()
      },
      { session: true },
    )
    .get(
      '/api/boards/:boardId/archive',
      ({ user, params }) => {
        if (!user) return []
        assertBoardAccess(s.db, params.boardId, user.id)
        return s.db
          .select()
          .from(cards)
          .where(
            and(eq(cards.boardId, params.boardId), eq(cards.archived, true)),
          )
          .orderBy(desc(cards.createdAt), desc(cards.id))
          .all()
      },
      { session: true },
    )
    .get(
      '/api/cards/:cardId',
      ({ user, params }) => {
        if (!user) return null
        const card = s.db
          .select()
          .from(cards)
          .where(eq(cards.id, params.cardId))
          .get()
        if (!card) return null
        assertBoardAccess(s.db, card.boardId, user.id)
        return card
      },
      { session: true },
    )
    .post(
      '/api/lists/:listId/cards',
      ({ user, params, body }) => {
        const list = getList(s.db, params.listId)
        return s.mutate(
          list.boardId,
          user.id,
          ['boards', 'cards', 'activity'],
          (tx) => {
            const title = nonempty(body.title, 'Card title')
            const card = tx
              .insert(cards)
              .values({
                listId: list.id,
                boardId: list.boardId,
                title,
                archived: false,
                position: nextPosition(tx, list.id),
              })
              .returning()
              .get()!
            recordActivity(tx, list.boardId, user.id, 'card_created', {
              cardId: card.id,
              title,
              listId: list.id,
              listTitle: list.title,
            })
            return card.id
          },
        )
      },
      { auth: true, body: t.Object({ title: t.String() }) },
    )
    .patch(
      '/api/cards/:cardId',
      ({ user, params, body }) => {
        const card = getCard(s.db, params.cardId)
        return s.mutate(card.boardId, user.id, ['cards'], (tx) => {
          tx.update(cards)
            .set({ title: nonempty(body.title, 'Card title') })
            .where(eq(cards.id, card.id))
            .run()
          return { success: true }
        })
      },
      { auth: true, body: t.Object({ title: t.String() }) },
    )
    .put(
      '/api/cards/:cardId/description',
      ({ user, params, body }) => {
        const card = getCard(s.db, params.cardId)
        return s.mutate(card.boardId, user.id, ['cards', 'activity'], (tx) => {
          tx.update(cards)
            .set({ description: body.description ?? null })
            .where(eq(cards.id, card.id))
            .run()
          recordActivity(tx, card.boardId, user.id, 'description_changed', {
            cardId: card.id,
            title: card.title,
          })
          return { success: true }
        })
      },
      {
        auth: true,
        body: t.Object({ description: t.Optional(t.Nullable(t.String())) }),
      },
    )
    .put(
      '/api/cards/:cardId/due-date',
      ({ user, params, body }) => {
        const card = getCard(s.db, params.cardId)
        return s.mutate(card.boardId, user.id, ['cards', 'activity'], (tx) => {
          const dueDate = body.dueDate ?? null
          tx.update(cards).set({ dueDate }).where(eq(cards.id, card.id)).run()
          const type =
            card.dueDate === dueDate
              ? null
              : dueDate === null
                ? 'due_date_cleared'
                : card.dueDate === null
                  ? 'due_date_set'
                  : 'due_date_changed'
          if (type)
            recordActivity(tx, card.boardId, user.id, type, {
              cardId: card.id,
              title: card.title,
              dueDate,
              oldDueDate: card.dueDate,
            })
          return { success: true }
        })
      },
      {
        auth: true,
        body: t.Object({
          dueDate: t.Optional(
            t.Nullable(
              t.Integer({
                minimum: -8640000000000000,
                maximum: 8640000000000000,
              }),
            ),
          ),
        }),
      },
    )
    .post(
      '/api/cards/:cardId/archive',
      ({ user, params }) => {
        const card = getCard(s.db, params.cardId)
        return s.mutate(
          card.boardId,
          user.id,
          ['boards', 'cards', 'activity'],
          (tx) => {
            tx.update(cards)
              .set({ archived: true })
              .where(eq(cards.id, card.id))
              .run()
            recordActivity(tx, card.boardId, user.id, 'card_archived', {
              cardId: card.id,
              title: card.title,
            })
            return { success: true }
          },
        )
      },
      { auth: true },
    )
    .post(
      '/api/cards/:cardId/restore',
      ({ user, params }) => {
        const card = getCard(s.db, params.cardId)
        return s.mutate(
          card.boardId,
          user.id,
          ['boards', 'cards', 'activity'],
          (tx) => {
            if (!card.archived) return { success: true }
            const list = card.listId
              ? tx.select().from(lists).where(eq(lists.id, card.listId)).get()
              : tx
                  .select()
                  .from(lists)
                  .where(eq(lists.boardId, card.boardId))
                  .orderBy(lists.position, lists.id)
                  .get()
            if (!list)
              throw new ApiError(
                409,
                'No lists available on this board to restore card',
              )
            tx.update(cards)
              .set({
                archived: false,
                listId: list.id,
                position: nextPosition(tx, list.id),
              })
              .where(eq(cards.id, card.id))
              .run()
            recordActivity(tx, card.boardId, user.id, 'card_restored', {
              cardId: card.id,
              title: card.title,
            })
            return { success: true }
          },
        )
      },
      { auth: true },
    )
    .post(
      '/api/cards/:cardId/move',
      ({ user, params, body }) =>
        moveCard(s, user.id, params.cardId, body.targetListId),
      {
        auth: true,
        body: t.Object({ targetListId: t.String({ minLength: 1 }) }),
      },
    )
    .post(
      '/api/cards/:cardId/reorder',
      ({ user, params, body }) =>
        moveCard(s, user.id, params.cardId, body.targetListId, body),
      {
        auth: true,
        body: t.Object({
          targetListId: t.String({ minLength: 1 }),
          ...orderingFields,
        }),
      },
    )
}
