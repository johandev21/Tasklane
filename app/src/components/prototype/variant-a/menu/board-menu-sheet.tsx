import { Activity, AlertTriangle } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'
import { Button } from '#/components/ui/button'
import { ACTIVITY_VERB_FORMATTERS } from '../constants'
import type { BoardData, LabelColorId } from '#/components/prototype/types'

export interface BoardMenuSheetProps {
  board: BoardData
  isOpen: boolean
  isOwner: boolean
  currentUserId: string
  onClose: () => void
  onUpdateTitle: (title: string) => void
  onOpenDeleteBoard: () => void
  onAddPaletteLabel: (name: string, color: LabelColorId) => void
  onUpdatePaletteLabel: (
    labelId: string,
    name: string,
    color: LabelColorId,
  ) => void
  onDeletePaletteLabel: (labelId: string) => void
  onInviteMember: (email: string, name?: string) => void
  onRemoveMember: (memberId: string) => void
}

function formatRelativeTime(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'just now'
    if (diffMins === 1) return '1 minute ago'
    if (diffMins < 60) return `${diffMins} minutes ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours === 1) return '1 hour ago'
    if (diffHours < 24) return `${diffHours} hours ago`
    return new Date(isoString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return 'recently'
  }
}

export function BoardMenuSheet({
  board,
  isOpen,
  isOwner,
  onClose,
  onOpenDeleteBoard,
}: BoardMenuSheetProps) {
  // Sort activities newest first
  const sortedActivities = [...board.activity].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col bg-card"
      >
        <SheetHeader className="p-4 pb-3 border-b border-border/50 shrink-0">
          <SheetTitle className="flex items-center gap-2 text-base font-heading font-bold">
            <Activity className="size-4 text-primary" />
            <span>Activity</span>
          </SheetTitle>
        </SheetHeader>

        {/* Clean Activity Feed Stream */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4 min-h-0">
          {sortedActivities.map((act) => {
            const actor = board.members.find((m) => m.id === act.actorId)
            const actionText = ACTIVITY_VERB_FORMATTERS[act.type](
              act.targetTitle,
              act.details,
            )

            return (
              <div key={act.id} className="flex items-start gap-3 text-sm">
                <img
                  src={
                    actor?.avatarUrl ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
                  }
                  alt={actor?.name || 'Member'}
                  className="size-7 rounded-full object-cover shrink-0 mt-0.5 ring-1 ring-border"
                />
                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="leading-snug text-foreground">
                    <span className="font-semibold">
                      {actor?.name || 'A team member'}
                    </span>{' '}
                    <span className="text-muted-foreground">{actionText}</span>
                  </p>
                  <span className="text-xs text-muted-foreground block font-mono">
                    {formatRelativeTime(act.createdAt)}
                  </span>
                </div>
              </div>
            )
          })}

          {sortedActivities.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground italic">
              No activity recorded on this board yet.
            </div>
          )}
        </div>

        {/* Footer: Delete Board for Owner */}
        {isOwner && (
          <div className="p-4 border-t border-border/50 bg-muted/10 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose()
                onOpenDeleteBoard()
              }}
              className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive text-sm h-8 gap-1.5"
            >
              <AlertTriangle className="size-3.5" />
              <span>Delete board...</span>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
