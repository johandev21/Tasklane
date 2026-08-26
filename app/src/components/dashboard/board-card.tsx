import { Link } from '@tanstack/react-router'
import { ArrowUpRight, Users } from 'lucide-react'
import { Badge } from '#/components/ui/badge.tsx'
import type { BoardSummary } from './types.ts'

interface BoardCardProps {
  board: BoardSummary
}

/**
 * Minimalist board card presenting essential board metadata and direct navigation.
 */
export function BoardCard({ board }: BoardCardProps) {
  const listsCount = board.listsCount
  const cardsCount = board.cardsCount ?? 0
  const memberCount = board.memberCount

  return (
    <Link
      to="/boards/$boardId"
      params={{ boardId: board._id }}
      className="group flex flex-col justify-between rounded-2xl border border-border/70 bg-card p-5 transition-all duration-150 hover:border-foreground/20 hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex flex-col gap-3">
        {/* Top Bar: Role badge & Arrow Affordance */}
        <div className="flex items-center justify-between gap-2">
          <Badge
            variant={board.isOwner ? 'default' : 'secondary'}
            className="text-xs font-medium"
          >
            {board.isOwner ? 'Owner' : 'Shared'}
          </Badge>
          <ArrowUpRight className="size-4 text-muted-foreground transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
        </div>

        {/* Board Title */}
        <h3 className="line-clamp-2 font-heading text-base font-semibold tracking-tight text-foreground transition-colors group-hover:text-foreground">
          {board.name}
        </h3>
      </div>

      {/* Essential Metadata */}
      <div className="mt-6 flex items-center justify-between pt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span>
            {listsCount} {listsCount === 1 ? 'list' : 'lists'}
          </span>
          <span className="text-border">•</span>
          <span>
            {cardsCount} {cardsCount === 1 ? 'card' : 'cards'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Users className="size-3.5 text-muted-foreground" />
          <span>
            {memberCount} {memberCount === 1 ? 'member' : 'members'}
          </span>
        </div>
      </div>
    </Link>
  )
}
