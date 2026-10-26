import { and, eq } from 'drizzle-orm'
import { hasBoardAccess } from './access'
import type { DatabaseClient } from './db'
import { session } from './db/schema'
import { activeViewers, heartbeat, leavePresence } from './presence-store'

export type QueryKey =
  | 'boards'
  | 'lists'
  | 'cards'
  | 'labels'
  | 'cardLabels'
  | 'members'
  | 'assignees'
  | 'comments'
  | 'commentCounts'
  | 'activity'
  | 'presence'

export type BoardEvent =
  | { type: 'board.changed'; boardId: string; keys: QueryKey[] }
  | {
      type: 'presence.changed'
      boardId: string
      viewers: ReturnType<typeof activeViewers>
    }

interface RoomSocket {
  id: string
  subscribe(topic: string): unknown
  unsubscribe(topic: string): unknown
  send(data: string): unknown
  close(code: number, reason: string): unknown
}

interface Client {
  socket: RoomSocket
  boardId: string
  userId: string
  sessionId: string
}
export const boardTopic = (boardId: string) => `board:${boardId}`

export class BoardRooms {
  private readonly clients = new Map<string, Client>()
  publish: (topic: string, payload: string) => unknown = () => undefined

  constructor(private readonly db: DatabaseClient) {}

  private authorized(client: Client) {
    const record = this.db
      .select()
      .from(session)
      .where(
        and(
          eq(session.id, client.sessionId),
          eq(session.userId, client.userId),
        ),
      )
      .get()
    return (
      !!record &&
      record.expiresAt.getTime() > Date.now() &&
      hasBoardAccess(this.db, client.boardId, client.userId)
    )
  }

  join(socket: RoomSocket, boardId: string, userId: string, sessionId: string) {
    const client = { socket, boardId, userId, sessionId }
    if (!this.authorized(client)) {
      socket.close(1008, 'Board access revoked')
      return
    }
    this.clients.set(socket.id, client)
    socket.subscribe(boardTopic(boardId))
    heartbeat(this.db, boardId, userId)
    this.presenceChanged(boardId)
  }

  leave(socketId: string) {
    const client = this.clients.get(socketId)
    if (!client) return
    this.clients.delete(socketId)
    client.socket.unsubscribe(boardTopic(client.boardId))
    if (
      !Array.from(this.clients.values()).some(
        (other) =>
          other.boardId === client.boardId && other.userId === client.userId,
      )
    ) {
      leavePresence(this.db, client.boardId, client.userId)
    }
    this.presenceChanged(client.boardId)
  }

  private drop(client: Client, reason: string) {
    this.clients.delete(client.socket.id)
    client.socket.unsubscribe(boardTopic(client.boardId))
    if (
      !Array.from(this.clients.values()).some(
        (other) =>
          other.boardId === client.boardId && other.userId === client.userId,
      )
    ) {
      leavePresence(this.db, client.boardId, client.userId)
    }
    client.socket.close(1008, reason)
  }

  prune(boardId?: string) {
    const changed = new Set<string>()
    for (const client of this.clients.values()) {
      if (
        (!boardId || client.boardId === boardId) &&
        !this.authorized(client)
      ) {
        this.drop(client, 'Session or board access revoked')
        changed.add(client.boardId)
      }
    }
    return changed
  }

  changed(boardId: string, keys: QueryKey[]) {
    if (this.prune(boardId).has(boardId)) this.presenceChanged(boardId)
    if (keys.length) this.send({ type: 'board.changed', boardId, keys })
  }

  presenceChanged(boardId: string) {
    this.prune(boardId)
    this.send({
      type: 'presence.changed',
      boardId,
      viewers: activeViewers(this.db, boardId),
    })
  }

  private send(event: BoardEvent) {
    this.publish(boardTopic(event.boardId), JSON.stringify(event))
  }

  deleted(boardId: string) {
    for (const client of this.clients.values()) {
      if (client.boardId !== boardId) continue
      client.socket.send(
        JSON.stringify({
          type: 'board.changed',
          boardId,
          keys: ['boards'],
        } satisfies BoardEvent),
      )
      this.drop(client, 'Board deleted')
    }
  }

  close() {
    for (const client of this.clients.values())
      this.drop(client, 'Server shutting down')
  }
}
