import { and, desc, eq, sql } from 'drizzle-orm'
import { Elysia } from 'elysia'
import { assertBoardAccess, profile } from '../access'
import { activity, cards } from '../db/schema'
import { cursorCondition, pageResult, paginationQuery } from '../pagination'
import type { Services } from '../services'

export function activityModule(s: Services) {
  const enrich = (row: typeof activity.$inferSelect) => ({
    ...row,
    actor: profile(s.db, row.actorId),
  })
  return new Elysia()
    .use(s.sessions)
    .get(
      '/api/boards/:boardId/activity',
      ({ user, params }) => {
        if (!user) return []
        assertBoardAccess(s.db, params.boardId, user.id)
        return s.db
          .select()
          .from(activity)
          .where(eq(activity.boardId, params.boardId))
          .orderBy(desc(activity.createdAt), desc(activity.id))
          .all()
          .map(enrich)
      },
      { session: true },
    )
    .get(
      '/api/boards/:boardId/activity/page',
      ({ user, params, query }) => {
        const scope = `activity:${params.boardId}`
        if (!user) return pageResult([], query, scope)
        assertBoardAccess(s.db, params.boardId, user.id)
        const rows = s.db
          .select()
          .from(activity)
          .where(
            and(
              eq(activity.boardId, params.boardId),
              cursorCondition(query, scope, activity),
            ),
          )
          .orderBy(desc(activity.createdAt), desc(activity.id))
          .limit((query.limit ?? 25) + 1)
          .all()
          .map(enrich)
        return pageResult(rows, query, scope)
      },
      { session: true, query: paginationQuery },
    )
    .get(
      '/api/cards/:cardId/activity',
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
          .select()
          .from(activity)
          .where(
            and(
              eq(activity.boardId, card.boardId),
              sql`json_extract(${activity.payload}, '$.cardId') = ${card.id}`,
            ),
          )
          .orderBy(desc(activity.createdAt), desc(activity.id))
          .all()
          .map(enrich)
      },
      { session: true },
    )
}
