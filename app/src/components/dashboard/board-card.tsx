import { Link } from '@tanstack/react-router'
import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import { Progress } from '#/components/ui/progress.tsx'
import type { BoardSummary } from './types.ts'

interface BoardCardProps {
  board: BoardSummary
}

/**
 * Production Board Card presenting workload progress, list breakdown, and membership.
 */
export function BoardCard({ board }: BoardCardProps) {
  const lists = board.lists ?? []
  const totalCards = board.cardsCount ?? 0

  const completedCards =
    lists.find(
      (l) =>
        l.name.toLowerCase().includes('done') ||
        l.name.toLowerCase().includes('shipped') ||
        l.name.toLowerCase().includes('resolved') ||
        l.name.toLowerCase().includes('approved'),
    )?.cardsCount ?? 0

  const completionPercentage =
    totalCards > 0 ? Math.round((completedCards / totalCards) * 100) : 0

  return (
    <Card className="flex flex-col justify-between border-border/80 transition-shadow hover:shadow-md">
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-2">
          <Badge
            variant={board.isOwner ? 'default' : 'secondary'}
            className="text-xs"
          >
            {board.isOwner ? 'Owner' : 'Member'}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {board.listsCount} {board.listsCount === 1 ? 'list' : 'lists'}
          </span>
        </div>

        <CardTitle className="line-clamp-2 text-base">
          <Link
            to="/boards/$boardId"
            params={{ boardId: board._id }}
            className="hover:underline"
          >
            {board.name}
          </Link>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-3 py-2">
        {/* Workload Progress */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {totalCards} {totalCards === 1 ? 'card' : 'cards'}
            </span>
            <span>{completionPercentage}% complete</span>
          </div>
          <Progress value={completionPercentage} className="h-1.5" />
        </div>

        {/* Micro List Tags */}
        {lists.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {lists.slice(0, 3).map((list, idx) => (
              <span
                key={idx}
                className="rounded-md border border-border/60 bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground"
              >
                {list.name}: {list.cardsCount}
              </span>
            ))}
            {lists.length > 3 && (
              <span className="rounded-md border border-border/60 bg-muted/50 px-1.5 py-0.5 text-xs text-muted-foreground">
                +{lists.length - 3} more
              </span>
            )}
          </div>
        ) : null}
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t border-border/40 pt-3">
        <span className="text-xs text-muted-foreground">
          {board.memberCount} {board.memberCount === 1 ? 'member' : 'members'}
        </span>
        <Button variant="ghost" size="xs" asChild>
          <Link to="/boards/$boardId" params={{ boardId: board._id }}>
            Open board
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
