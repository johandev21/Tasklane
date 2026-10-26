import { Elysia } from 'elysia'
import { assertBoardAccess } from '../access'
import { activeViewers, heartbeat, leavePresence } from '../presence-store'
import type { Services } from '../services'

export function presenceModule(s: Services) {
  return new Elysia()
    .use(s.sessions)
    .get(
      '/api/boards/:boardId/presence',
      ({ user, params }) => {
        if (!user) return []
        assertBoardAccess(s.db, params.boardId, user.id)
        return activeViewers(s.db, params.boardId)
      },
      { session: true },
    )
    .post(
      '/api/boards/:boardId/presence',
      ({ user, params }) => {
        s.mutate(params.boardId, user.id, [], (tx) =>
          heartbeat(tx, params.boardId, user.id),
        )
        s.rooms.presenceChanged(params.boardId)
        return { success: true }
      },
      { auth: true },
    )
    .delete(
      '/api/boards/:boardId/presence',
      ({ user, params }) => {
        s.mutate(params.boardId, user.id, [], (tx) =>
          leavePresence(tx, params.boardId, user.id),
        )
        s.rooms.presenceChanged(params.boardId)
        return { success: true }
      },
      { auth: true },
    )
}
