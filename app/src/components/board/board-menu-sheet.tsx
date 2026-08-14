import { Activity } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet.tsx'
import type { EnrichedActivityDoc } from './types.ts'

export interface BoardMenuSheetProps {
  activities: EnrichedActivityDoc[]
  isOpen: boolean
  onClose: () => void
}

function formatRelativeTime(timestamp: number): string {
  try {
    const diffMs = Date.now() - timestamp
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'just now'
    if (diffMins === 1) return '1 minute ago'
    if (diffMins < 60) return `${diffMins} minutes ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours === 1) return '1 hour ago'
    if (diffHours < 24) return `${diffHours} hours ago`
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return 'recently'
  }
}

function formatActivityMessage(act: EnrichedActivityDoc): string {
  const payload = act.payload
  switch (act.type) {
    case 'board_created':
      return `created board "${payload.boardName ?? 'this board'}"`
    case 'list_created':
      return `added list "${payload.title ?? 'New List'}"`
    case 'list_renamed':
      return `renamed list "${payload.oldTitle ?? ''}" to "${payload.newTitle ?? ''}"`
    case 'list_deleted':
      return `deleted list "${payload.title ?? ''}" and archived ${payload.archivedCardsCount ?? 0} cards`
    case 'card_created':
      return `added card "${payload.title ?? 'New Card'}" to ${payload.listTitle ?? 'list'}`
    case 'card_archived':
      return `archived card "${payload.title ?? ''}"`
    case 'card_moved':
      return `moved card "${payload.title ?? ''}"`
    default:
      return act.type.replace(/_/g, ' ')
  }
}

export function BoardMenuSheet({
  activities,
  isOpen,
  onClose,
}: BoardMenuSheetProps) {
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

        {/* Activity Feed Stream */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 min-h-0">
          {activities.map((act) => {
            const actorName = act.actor?.name || 'A team member'
            const message = formatActivityMessage(act)

            return (
              <div key={act._id} className="flex items-start gap-3 text-sm">
                <div className="flex size-7 items-center justify-center rounded-full bg-muted font-heading text-xs font-semibold text-foreground ring-1 ring-border shrink-0 mt-0.5">
                  {actorName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <p className="leading-snug text-foreground break-all">
                    <span className="font-semibold">{actorName}</span>{' '}
                    <span className="text-muted-foreground">{message}</span>
                  </p>
                  <span className="text-xs text-muted-foreground block font-mono">
                    {formatRelativeTime(act._creationTime)}
                  </span>
                </div>
              </div>
            )
          })}

          {activities.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground italic">
              No activity recorded on this board yet.
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
