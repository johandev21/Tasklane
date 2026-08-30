import { BoardCard } from './board-card.tsx'
import type { BoardSummary } from '../types/dashboard.types.ts'

export function BoardGrid({ boards }: { boards: BoardSummary[] }) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
      {boards.map((board) => (
        <BoardCard key={board._id} board={board} />
      ))}
    </div>
  )
}
