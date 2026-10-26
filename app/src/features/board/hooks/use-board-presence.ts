import { useQuery } from '@tanstack/react-query'
import { api } from '#/shared/api/client.ts'
import { queryKeys } from '#/shared/api/query-keys.ts'
import type { PresenceViewer } from '#/features/board/types/board.types.ts'

export function useBoardPresence(
  boardId: string,
  enabled: boolean,
): PresenceViewer[] {
  const presence = useQuery({
    queryKey: queryKeys.resource(boardId, 'presence'),
    queryFn: ({ signal }) => api.presence.list(boardId, signal),
    enabled,
  })

  return presence.data ?? []
}
