import { describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createDatabase } from '../src/db'
import {
  boardMembers,
  boards,
  cardLabels,
  cards,
  lists,
  user,
} from '../src/db/schema'

describe('SQLite schema and migrations', () => {
  test('applies checked-in migrations idempotently and enables WAL, foreign keys, and a busy timeout', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tasklane-migrations-'))
    const path = join(dir, 'nested', 'test.sqlite')
    let connection = createDatabase(path)
    try {
      expect(connection.sqlite.query('PRAGMA journal_mode').get()).toEqual({
        journal_mode: 'wal',
      })
      expect(connection.sqlite.query('PRAGMA foreign_keys').get()).toEqual({
        foreign_keys: 1,
      })
      expect(connection.sqlite.query('PRAGMA busy_timeout').get()).toEqual({
        timeout: 5000,
      })
      const owner = connection.db
        .insert(user)
        .values({ name: 'Owner', email: 'owner@example.com' })
        .returning()
        .get()!
      const board = connection.db
        .insert(boards)
        .values({ ownerId: owner.id, name: 'Persistent' })
        .returning()
        .get()!
      connection.close()
      connection = createDatabase(path)
      expect(connection.db.select().from(boards).get()).toMatchObject({
        id: board.id,
        name: 'Persistent',
      })
      expect(
        connection.sqlite
          .query('SELECT count(*) AS count FROM __drizzle_migrations')
          .get(),
      ).toEqual({ count: 1 })
      expect(connection.sqlite.query('PRAGMA foreign_key_check').all()).toEqual(
        [],
      )
    } finally {
      connection.close()
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test('database constraints reject orphaned rows, duplicate membership, and active cards without lists', () => {
    const connection = createDatabase(':memory:')
    try {
      const owner = connection.db
        .insert(user)
        .values({ name: 'Owner', email: 'owner@example.com' })
        .returning()
        .get()!
      const board = connection.db
        .insert(boards)
        .values({ ownerId: owner.id, name: 'Board' })
        .returning()
        .get()!
      connection.db
        .insert(boardMembers)
        .values({ boardId: board.id, userId: owner.id })
        .run()
      expect(() =>
        connection.db
          .insert(boardMembers)
          .values({ boardId: board.id, userId: owner.id })
          .run(),
      ).toThrow()
      expect(() =>
        connection.db
          .insert(lists)
          .values({ boardId: 'missing', title: 'Orphan', position: 0 })
          .run(),
      ).toThrow()
      expect(() =>
        connection.db
          .insert(cards)
          .values({ boardId: board.id, title: 'Orphan', position: 0 })
          .run(),
      ).toThrow()
      expect(() =>
        connection.db
          .insert(cardLabels)
          .values({ cardId: 'missing', labelId: 'missing' })
          .run(),
      ).toThrow()
      expect(connection.sqlite.query('PRAGMA foreign_key_check').all()).toEqual(
        [],
      )
    } finally {
      connection.close()
    }
  })
})
