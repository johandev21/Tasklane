import { useState } from 'react'
import {
  RotateCcw,
  Archive,
  Code2,
  Layers,
  UserCheck,
  Sparkles,
} from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import type { BoardPrototypeActions } from './use-board-prototype-state'
import type { CardItem } from './types'

interface PrototypeSwitcherProps {
  actions: BoardPrototypeActions
}

export function PrototypeSwitcher({ actions }: PrototypeSwitcherProps) {
  const [inspectOpen, setInspectOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)

  const { board, currentUserId, setCurrentUserId, isOwner } = actions
  const currentUser = board.members.find((m) => m.id === currentUserId)

  const archivedCards = board.archivedCardIds
    .map((id) => board.cards[id])
    .filter((c): c is CardItem => Boolean(c))

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex items-center justify-center px-4">
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-border/80 bg-background/95 p-1.5 shadow-2xl backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10">
          {/* Active User Persona Selector (For testing Owner vs Member permissions) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-full bg-primary/10 hover:bg-primary/20 px-3 py-1 text-sm font-semibold text-primary transition-colors"
                title="Switch persona to test Owner vs Member permission rules"
              >
                <UserCheck className="size-4" />
                <span>
                  Viewing as: {currentUser?.name || 'User'} (
                  {isOwner ? 'Owner' : 'Member'})
                </span>
                <span className="text-xs opacity-70">▾</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                Simulate User Permissions
              </div>
              {board.members.map((m) => (
                <DropdownMenuItem
                  key={m.id}
                  onClick={() => setCurrentUserId(m.id)}
                  className="flex items-center justify-between text-sm cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <img
                      src={m.avatarUrl}
                      alt={m.name}
                      className="size-5 rounded-full object-cover"
                    />
                    <span>{m.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {board.ownerId === m.id ? 'Owner' : 'Member'}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-4 w-px bg-border/60" />

          {/* Prototype Controls: Reset, Archive, State */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="xs"
              onClick={actions.resetBoard}
              title="Reset mock board state to initial"
              className="gap-1 rounded-full px-2.5 text-sm text-muted-foreground hover:text-foreground h-7"
            >
              <RotateCcw data-icon="inline-start" className="size-3.5" />
              <span>Reset</span>
            </Button>

            <Button
              variant="ghost"
              size="xs"
              onClick={() => setArchiveOpen(true)}
              title="View archived cards (soft-deleted)"
              className="gap-1 rounded-full px-2.5 text-sm text-muted-foreground hover:text-foreground h-7"
            >
              <Archive className="size-3.5" />
              <span>Archive</span>
              {archivedCards.length > 0 && (
                <span className="flex size-4 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {archivedCards.length}
                </span>
              )}
            </Button>

            <Button
              variant="ghost"
              size="xs"
              onClick={() => setInspectOpen(true)}
              title="Inspect live state JSON"
              className="gap-1 rounded-full px-2.5 text-sm text-muted-foreground hover:text-foreground h-7"
            >
              <Code2 data-icon="inline-start" className="size-3.5" />
              <span>State</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Inspect State Dialog */}
      <Dialog open={inspectOpen} onOpenChange={setInspectOpen}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Layers className="size-4 text-primary" />
              In-Memory Board State Snapshot
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>
                Lists: <strong>{board.lists.length}</strong>
              </span>
              <span>•</span>
              <span>
                Total Cards: <strong>{Object.keys(board.cards).length}</strong>
              </span>
              <span>•</span>
              <span>
                Archived: <strong>{board.archivedCardIds.length}</strong>
              </span>
              <span>•</span>
              <span>
                Activity Rows: <strong>{board.activity.length}</strong>
              </span>
            </div>
            <pre className="max-h-96 overflow-x-auto rounded-xl bg-muted/60 p-4 font-mono text-xs text-foreground">
              {JSON.stringify(board, null, 2)}
            </pre>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Archived Cards Dialog */}
      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="max-h-[80vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Archive className="size-4 text-primary" />
              Archived Cards
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            {archivedCards.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No archived cards yet. Deleting a list or card archives items
                here without data loss.
              </div>
            ) : (
              <div className="space-y-2">
                {archivedCards.map((card) => (
                  <div
                    key={card.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-card p-3 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{card.title}</div>
                      <div className="text-xs text-muted-foreground">
                        List ID: {card.listId}
                      </div>
                    </div>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => actions.restoreCard(card.id)}
                    >
                      <Sparkles
                        data-icon="inline-start"
                        className="mr-1 size-3"
                      />
                      Restore
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
