import { and, eq } from 'drizzle-orm'
import { Elysia, t } from 'elysia'
import { assertBoardAccess, getList } from '../access'
import { cards, lists } from '../db/schema'
import { nonempty } from '../errors'
import { insertAtAnchor, orderingFields } from '../ordering'
import { recordActivity } from '../services'
import type { Services } from '../services'

export function listsModule(s: Services) {
  return new Elysia()
    .use(s.sessions)
    .get(
      '/api/boards/:boardId/lists',
      ({ user, params }) => {
        if (!user) return []
        assertBoardAccess(s.db, params.boardId, user.id)
        return s.db
          .select()
          .from(lists)
          .where(eq(lists.boardId, params.boardId))
          .orderBy(lists.position, lists.id)
          .all()
      },
      { session: true },
    )
    .post(
      '/api/boards/:boardId/lists',
      ({ user, params, body }) =>
        s.mutate(
          params.boardId,
          user.id,
          ['boards', 'lists', 'activity'],
          (tx) => {
            const title = nonempty(body.title, 'List title')
            const boardLists = tx
              .select()
              .from(lists)
              .where(eq(lists.boardId, params.boardId))
              .all()
            const position =
              boardLists.reduce(
                (max, list) => Math.max(max, list.position),
                -1,
              ) + 1
            const list = tx
              .insert(lists)
              .values({ boardId: params.boardId, title, position })
              .returning()
              .get()!
            recordActivity(tx, params.boardId, user.id, 'list_created', {
              listId: list.id,
              title,
            })
            return list.id
          },
        ),
      { auth: true, body: t.Object({ title: t.String() }) },
    )
    .patch(
      '/api/lists/:listId',
      ({ user, params, body }) => {
        const list = getList(s.db, params.listId)
        return s.mutate(
          list.boardId,
          user.id,
          ['boards', 'lists', 'activity'],
          (tx) => {
            const title = nonempty(body.title, 'List title')
            tx.update(lists).set({ title }).where(eq(lists.id, list.id)).run()
            recordActivity(tx, list.boardId, user.id, 'list_renamed', {
              listId: list.id,
              oldTitle: list.title,
              newTitle: title,
            })
            return { success: true }
          },
        )
      },
      { auth: true, body: t.Object({ title: t.String() }) },
    )
    .delete(
      '/api/lists/:listId',
      ({ user, params }) => {
        const list = getList(s.db, params.listId)
        return s.mutate(
          list.boardId,
          user.id,
          ['boards', 'lists', 'cards', 'activity'],
          (tx) => {
            const archived = tx
              .update(cards)
              .set({ archived: true })
              .where(and(eq(cards.listId, list.id), eq(cards.archived, false)))
              .returning({ id: cards.id })
              .all()
            tx.delete(lists).where(eq(lists.id, list.id)).run()
            tx.select()
              .from(lists)
              .where(eq(lists.boardId, list.boardId))
              .orderBy(lists.position, lists.id)
              .all()
              .forEach((remaining, position) =>
                tx
                  .update(lists)
                  .set({ position })
                  .where(eq(lists.id, remaining.id))
                  .run(),
              )
            recordActivity(tx, list.boardId, user.id, 'list_deleted', {
              listId: list.id,
              title: list.title,
              archivedCardsCount: archived.length,
            })
            return { success: true }
          },
        )
      },
      { auth: true },
    )
    .post(
      '/api/lists/:listId/archive-cards',
      ({ user, params }) => {
        const list = getList(s.db, params.listId)
        return s.mutate(
          list.boardId,
          user.id,
          ['boards', 'cards', 'activity'],
          (tx) => {
            const archived = tx
              .update(cards)
              .set({ archived: true })
              .where(and(eq(cards.listId, list.id), eq(cards.archived, false)))
              .returning({ id: cards.id })
              .all()
            if (archived.length)
              recordActivity(tx, list.boardId, user.id, 'card_archived', {
                listId: list.id,
                listTitle: list.title,
                count: archived.length,
              })
            return { success: true }
          },
        )
      },
      { auth: true },
    )
    .post(
      '/api/lists/:listId/reorder',
      ({ user, params, body }) => {
        const list = getList(s.db, params.listId)
        return s.mutate(list.boardId, user.id, ['lists'], (tx) => {
          const ordered = tx
            .select()
            .from(lists)
            .where(eq(lists.boardId, list.boardId))
            .orderBy(lists.position, lists.id)
            .all()
          insertAtAnchor(ordered, list, body).forEach((item, position) => {
            if (item.position !== position)
              tx.update(lists)
                .set({ position })
                .where(eq(lists.id, item.id))
                .run()
          })
          return { success: true }
        })
      },
      { auth: true, body: t.Object(orderingFields) },
    )
}
