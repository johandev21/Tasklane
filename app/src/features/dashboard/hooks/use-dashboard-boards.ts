import { useConvexAuth, useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import type { BoardSummary } from '../types/dashboard.types.ts'

export interface UseDashboardBoardsResult {
  boards: BoardSummary[] | undefined
  isLoading: boolean
  isAuthenticated: boolean
}

export function useDashboardBoards(): UseDashboardBoardsResult {
  const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth()
  const queryArgs = isAuthenticated ? {} : 'skip'
  const rawBoards = useQuery(api.boards.list, queryArgs)

  return {
    boards: rawBoards,
    isLoading: isAuthLoading || (isAuthenticated && rawBoards === undefined),
    isAuthenticated,
  }
}
