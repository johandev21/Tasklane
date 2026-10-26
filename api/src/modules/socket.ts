import { Elysia, t } from 'elysia'
import { assertBoardAccess } from '../access'
import { ApiError } from '../errors'
import { heartbeat } from '../presence-store'
import type { Services } from '../services'

export function socketModule(s: Services) {
  return new Elysia().use(s.sessions).ws('/ws/boards/:boardId', {
    auth: true,
    body: t.Object({ type: t.Literal('heartbeat') }),
    beforeHandle({ params, user }) {
      assertBoardAccess(s.db, params.boardId, user.id)
    },
    open(ws) {
      s.rooms.join(
        ws,
        ws.data.params.boardId,
        ws.data.user.id,
        ws.data.session.id,
      )
    },
    async message(ws) {
      try {
        const result = await s.auth.api.getSession({
          headers: ws.data.request.headers,
        })
        if (!result || result.session.id !== ws.data.session.id)
          throw new ApiError(401, 'Session revoked')
        const boardId = ws.data.params.boardId
        s.mutate(boardId, result.user.id, [], (tx) =>
          heartbeat(tx, boardId, result.user.id),
        )
        s.rooms.presenceChanged(boardId)
      } catch {
        ws.close(1008, 'Session or board access revoked')
      }
    },
    close(ws) {
      s.rooms.leave(ws.id)
    },
  })
}
