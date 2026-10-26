import { useQuery } from '@tanstack/react-query'
import { authClient } from '#/shared/api/auth.ts'
import { api } from '#/shared/api/client.ts'
import { queryKeys } from '#/shared/api/query-keys.ts'
import type { BoardSummary } from '../types/dashboard.types.ts'

export interface UseDashboardBoardsResult {
  boards: BoardSummary[] | undefined
  isLoading: boolean
  isAuthenticated: boolean
  error: Error | null
}

export function useDashboardBoards(): UseDashboardBoardsResult {
  const session = authClient.useSession()
  const isAuthenticated = Boolean(session.data)
  const boards = useQuery({
    queryKey: queryKeys.boards,
    queryFn: ({ signal }) => api.boards.list(signal),
    enabled: !session.isPending && isAuthenticated,
  })

  return {
    boards: boards.data,
    isLoading: session.isPending || (isAuthenticated && boards.isPending),
    isAuthenticated,
    error: session.error ?? boards.error ?? null,
  }
}
