import { useEffect } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import type { PresenceViewer } from '#/components/board/types'

const HEARTBEAT_INTERVAL_MS = 20_000

/**
 * Subscribes to the board's active viewers and keeps the caller's
 * presence heartbeat fresh while the board page is open and visible.
 */
export function useBoardPresence(
  boardId: Id<'boards'> | null,
): PresenceViewer[] | undefined {
  const heartbeat = useMutation(api.presence.heartbeat)
  const presence = useQuery(api.presence.list, boardId ? { boardId } : 'skip')

  useEffect(() => {
    if (!boardId) return

    const sendHeartbeat = () => {
      if (document.visibilityState === 'visible') {
        void heartbeat({ boardId })
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat()
      }
    }

    sendHeartbeat()
    const interval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [boardId, heartbeat])

  return presence
}
