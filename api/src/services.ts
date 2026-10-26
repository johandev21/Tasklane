import { assertBoardAccess } from './access'
import type { BoardAccess } from './access'
import type { Auth } from './auth'
import { sessionPlugin } from './auth'
import type { Connection, Executor } from './db'
import { activity } from './db/schema'
import type { ActivityType } from './constants'
import { BoardRooms } from './realtime'
import type { QueryKey } from './realtime'

export function recordActivity(
  db: Executor,
  boardId: string,
  actorId: string,
  type: ActivityType,
  payload: Record<string, unknown>,
) {
  db.insert(activity).values({ boardId, actorId, type, payload }).run()
}

export function createServices(
  connection: Connection,
  auth: Auth,
  origins: string[],
) {
  const db = connection.db
  const rooms = new BoardRooms(db)
  function mutate<T>(
    boardId: string,
    userId: string,
    keys: QueryKey[],
    handler: (tx: Executor, access: BoardAccess) => T,
  ) {
    const value = db.transaction(
      (tx) => handler(tx, assertBoardAccess(tx, boardId, userId)),
      { behavior: 'immediate' },
    )
    rooms.changed(boardId, keys)
    return value
  }
  return {
    db,
    auth,
    rooms,
    sessions: sessionPlugin(auth, origins),
    origins,
    mutate,
  }
}

export type Services = ReturnType<typeof createServices>
