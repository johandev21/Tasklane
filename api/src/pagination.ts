import { and, eq, lt, or } from 'drizzle-orm'
import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core'
import { t } from 'elysia'
import { ApiError } from './errors'

export const paginationQuery = t.Object({
  cursor: t.Optional(t.String({ maxLength: 1024 })),
  limit: t.Optional(t.Integer({ minimum: 1, maximum: 100 })),
})

export interface PageQuery {
  cursor?: string
  limit?: number
}

export function cursorCondition(
  query: PageQuery,
  scope: string,
  columns: { id: AnySQLiteColumn; createdAt: AnySQLiteColumn },
) {
  if (!query.cursor) return undefined
  try {
    const cursor: unknown = JSON.parse(
      Buffer.from(query.cursor, 'base64url').toString(),
    )
    if (
      !Array.isArray(cursor) ||
      cursor.length !== 3 ||
      cursor[0] !== scope ||
      typeof cursor[1] !== 'number' ||
      !Number.isSafeInteger(cursor[1]) ||
      typeof cursor[2] !== 'string' ||
      !/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/.test(cursor[2])
    ) {
      throw new Error('Invalid cursor')
    }
    return or(
      lt(columns.createdAt, cursor[1]),
      and(eq(columns.createdAt, cursor[1]), lt(columns.id, cursor[2])),
    )
  } catch {
    throw new ApiError(400, 'Invalid pagination cursor')
  }
}

export function pageResult<T extends { id: string; createdAt: number }>(
  rows: T[],
  query: PageQuery,
  scope: string,
) {
  const limit = query.limit ?? 25
  const page = rows.slice(0, limit)
  const last = page.at(-1)
  const isDone = rows.length <= limit
  const continueCursor =
    !isDone && last
      ? Buffer.from(JSON.stringify([scope, last.createdAt, last.id])).toString(
          'base64url',
        )
      : ''
  return { page, isDone, continueCursor }
}
