import type { BoardFilterMode, BoardSummary } from '../types/dashboard.types.ts'

export function filterBoards(
  boards: BoardSummary[],
  filterMode: BoardFilterMode,
): BoardSummary[] {
  if (filterMode === 'owned') {
    return boards.filter((b) => b.isOwner)
  }
  if (filterMode === 'shared') {
    return boards.filter((b) => !b.isOwner)
  }
  return boards
}
