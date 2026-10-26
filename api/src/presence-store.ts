import { and, eq, gte, lt } from 'drizzle-orm'
import { hasBoardAccess, profile } from './access'
import { PRESENCE_ACTIVE_THRESHOLD_MS } from './constants'
import type { Executor } from './db'
import { presence } from './db/schema'

export function heartbeat(
  db: Executor,
  boardId: string,
  userId: string,
  now = Date.now(),
) {
  db.insert(presence)
    .values({ boardId, userId, lastSeen: now })
    .onConflictDoUpdate({
      target: [presence.boardId, presence.userId],
      set: { lastSeen: now },
    })
    .run()
}

export function leavePresence(db: Executor, boardId: string, userId: string) {
  db.delete(presence)
    .where(and(eq(presence.boardId, boardId), eq(presence.userId, userId)))
    .run()
}

export function activeViewers(db: Executor, boardId: string, now = Date.now()) {
  return db
    .select()
    .from(presence)
    .where(
      and(
        eq(presence.boardId, boardId),
        gte(presence.lastSeen, now - PRESENCE_ACTIVE_THRESHOLD_MS),
      ),
    )
    .all()
    .filter((entry) => hasBoardAccess(db, boardId, entry.userId))
    .map((entry) => {
      const { userId, name, email, imageUrl } = profile(db, entry.userId)
      return { userId, name, email, imageUrl }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function sweepPresence(db: Executor, now = Date.now()) {
  return db
    .delete(presence)
    .where(lt(presence.lastSeen, now - PRESENCE_ACTIVE_THRESHOLD_MS))
    .returning({ boardId: presence.boardId })
    .all()
}
