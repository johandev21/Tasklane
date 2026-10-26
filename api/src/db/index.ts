import { Database } from 'bun:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { migrate } from 'drizzle-orm/bun-sqlite/migrator'
import * as schema from './schema'

export function createDatabase(
  filename = process.env.DATABASE_URL ?? './data/tasklane.sqlite',
) {
  const path = filename.startsWith('file:') ? fileURLToPath(filename) : filename
  if (path !== ':memory:')
    mkdirSync(dirname(resolve(path)), { recursive: true })
  const sqlite = new Database(path, { create: true, strict: true })
  try {
    sqlite.exec(
      'PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;',
    )
    const db = drizzle(sqlite, { schema })
    migrate(db, {
      migrationsFolder: fileURLToPath(
        new URL('../../drizzle', import.meta.url),
      ),
    })
    return { db, sqlite, close: () => sqlite.close() }
  } catch (error) {
    sqlite.close()
    throw error
  }
}

export type Connection = ReturnType<typeof createDatabase>
export type DatabaseClient = Connection['db']
export type Executor = Pick<
  DatabaseClient,
  'select' | 'insert' | 'update' | 'delete'
>
