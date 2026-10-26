import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '#/shared/api/query-keys.ts'
import type { BoardResource as QueryResource } from '#/shared/api/query-keys.ts'
import { subscribeToBoard } from '#/shared/api/client.ts'
import type { PresenceViewer } from '../types/board.types.ts'

type EventResource =
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

type BoardEvent =
  | { type: 'board.changed'; boardId: string; keys: EventResource[] }
  | { type: 'presence.changed'; boardId: string; viewers: PresenceViewer[] }

const queryResources: Partial<Record<EventResource, QueryResource[]>> = {
  lists: ['lists'],
  cards: ['cards', 'archivedCards', 'commentCounts', 'cardActivity'],
  labels: ['labels'],
  cardLabels: ['cardLabels'],
  members: ['members'],
  assignees: ['assignees'],
  comments: ['comments', 'commentCounts'],
  commentCounts: ['commentCounts'],
  activity: ['activity', 'cardActivity'],
  presence: ['presence'],
}

function parseBoardEvent(value: unknown): BoardEvent | null {
  try {
    const data = typeof value === 'string' ? JSON.parse(value) : value
    if (
      data &&
      typeof data === 'object' &&
      'type' in data &&
      (data.type === 'board.changed' || data.type === 'presence.changed') &&
      'boardId' in data
    ) {
      return data as BoardEvent
    }
  } catch {
    return null
  }
  return null
}

export function useBoardSocket(boardId: string, enabled: boolean) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!enabled) return

    let stopped = false
    let socket: ReturnType<typeof subscribeToBoard> | undefined
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined
    let heartbeatTimer: ReturnType<typeof setInterval> | undefined

    const sendHeartbeat = () => {
      if (socket?.ws.readyState === WebSocket.OPEN) {
        socket.send({ type: 'heartbeat' })
      }
    }

    const connect = () => {
      if (stopped) return
      socket = subscribeToBoard(boardId)
      socket.on('open', () => {
        sendHeartbeat()
        heartbeatTimer = setInterval(sendHeartbeat, 20_000)
      })
      socket.on('message', (message) => {
        const event = parseBoardEvent(message.data)
        if (!event || event.boardId !== boardId) return
        if (event.type === 'presence.changed') {
          queryClient.setQueryData(
            queryKeys.resource(boardId, 'presence'),
            event.viewers,
          )
          return
        }
        const resources = new Set<QueryResource>()
        for (const key of event.keys) {
          if (key === 'boards') {
            resources.add('board')
            void queryClient.invalidateQueries({ queryKey: queryKeys.boards })
          }
          for (const resource of queryResources[key] ?? []) {
            resources.add(resource)
          }
        }
        for (const resource of resources) {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.resource(boardId, resource),
          })
        }
      })
      socket.on('close', () => {
        if (heartbeatTimer) clearInterval(heartbeatTimer)
        if (!stopped) reconnectTimer = setTimeout(connect, 1_000)
      })
      socket.on('error', () => socket?.close())
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') sendHeartbeat()
    }

    connect()
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      stopped = true
      if (heartbeatTimer) clearInterval(heartbeatTimer)
      if (reconnectTimer) clearTimeout(reconnectTimer)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      socket?.close()
    }
  }, [boardId, enabled, queryClient])
}
