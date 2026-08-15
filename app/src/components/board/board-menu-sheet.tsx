import { RotateCcw } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet.tsx'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '#/components/ui/tabs.tsx'
import { Button } from '#/components/ui/button.tsx'
import { LabelPaletteManager } from './labels/label-palette-manager.tsx'
import type { EnrichedActivityDoc, CardDoc, LabelDoc } from './types.ts'

export interface BoardMenuSheetProps {
  activities: EnrichedActivityDoc[]
  archivedCards?: CardDoc[]
  labels?: LabelDoc[]
  isOwner?: boolean
  isOpen: boolean
  onClose: () => void
  onRestoreCard?: (cardId: CardDoc['_id']) => void
  onCreateLabel?: (name: string, color: string) => Promise<void> | void
  onUpdateLabel?: (
    labelId: LabelDoc['_id'],
    name?: string,
    color?: string,
  ) => Promise<void> | void
  onRemoveLabel?: (labelId: LabelDoc['_id']) => Promise<void> | void
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
    case 'card_restored':
      return `restored card "${payload.title ?? ''}"`
    case 'description_changed':
      return `updated description for "${payload.title ?? 'card'}"`
    case 'due_date_set':
      return `set due date on "${payload.title ?? 'card'}"`
    case 'due_date_changed':
      return `changed due date on "${payload.title ?? 'card'}"`
    case 'due_date_cleared':
      return `removed due date from "${payload.title ?? 'card'}"`
    case 'label_added':
      return `added label "${payload.labelName ?? 'Label'}" to "${payload.title ?? 'card'}"`
    case 'label_removed':
      return `removed label "${payload.labelName ?? 'Label'}" from "${payload.title ?? 'card'}"`
    case 'assignee_added':
      return `assigned ${payload.memberName ?? 'a member'} to "${payload.title ?? 'card'}"`
    case 'assignee_removed':
      return `unassigned ${payload.memberName ?? 'a member'} from "${payload.title ?? 'card'}"`
    case 'member_added':
      return `added ${payload.memberName ?? payload.memberEmail ?? 'a member'} to the board`
    case 'member_removed':
      return `removed ${payload.memberName ?? payload.memberEmail ?? 'a member'} from the board`
    case 'comment_added':
      return `commented on "${payload.title ?? 'card'}": "${payload.snippet ?? payload.commentBody ?? ''}"`
    case 'card_moved':
      return `moved card "${payload.title ?? 'Card'}"${
        payload.sourceListTitle && payload.targetListTitle
          ? ` from ${payload.sourceListTitle} to ${payload.targetListTitle}`
          : ''
      }`
    default:
      return act.type.replace(/_/g, ' ')
  }
}

export function BoardMenuSheet({
  activities,
  archivedCards = [],
  labels = [],
  isOwner = false,
  isOpen,
  onClose,
  onRestoreCard,
  onCreateLabel,
  onUpdateLabel,
  onRemoveLabel,
}: BoardMenuSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md md:max-w-lg p-0 flex flex-col bg-card border-l border-border"
      >
        <SheetHeader className="p-4 pb-2 shrink-0">
          <SheetTitle className="text-base font-heading font-bold text-foreground">
            Board Menu
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="activity" className="flex-1 flex flex-col min-h-0">
          <div className="px-4 pt-1 pb-2 shrink-0">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger
                value="activity"
                className="text-xs sm:text-sm font-medium"
              >
                Activity
              </TabsTrigger>
              <TabsTrigger
                value="labels"
                className="text-xs sm:text-sm font-medium"
              >
                Labels
              </TabsTrigger>
              <TabsTrigger
                value="archived"
                className="text-xs sm:text-sm font-medium"
              >
                Archived
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Activity Feed Stream */}
          <TabsContent
            value="activity"
            className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 min-h-0"
          >
            {activities.map((act) => {
              const actorName = act.actor?.name || 'A team member'
              const message = formatActivityMessage(act)

              return (
                <div key={act._id} className="flex items-start gap-3">
                  <div className="flex size-7 items-center justify-center rounded-full bg-muted font-heading text-xs font-semibold text-foreground ring-1 ring-border shrink-0 mt-0.5">
                    {actorName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <p className="leading-snug text-foreground break-words text-xs sm:text-sm">
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
              <div className="py-12 text-center text-xs sm:text-sm text-muted-foreground italic">
                No activity recorded on this board yet.
              </div>
            )}
          </TabsContent>

          {/* Label Palette Manager */}
          <TabsContent
            value="labels"
            className="flex-1 overflow-y-auto p-4 flex flex-col min-h-0"
          >
            <LabelPaletteManager
              labels={labels}
              isOwner={isOwner}
              onCreateLabel={onCreateLabel}
              onUpdateLabel={onUpdateLabel}
              onRemoveLabel={onRemoveLabel}
            />
          </TabsContent>

          {/* Archived Cards List */}
          <TabsContent
            value="archived"
            className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0"
          >
            {archivedCards.map((card) => (
              <div
                key={card._id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-2xs"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground break-words text-xs sm:text-sm">
                    {card.title}
                  </p>
                  {card.dueDate && (
                    <span className="text-xs text-muted-foreground font-mono">
                      Due{' '}
                      {new Date(card.dueDate).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  )}
                </div>

                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => onRestoreCard?.(card._id)}
                  className="gap-1.5 shrink-0 text-xs cursor-pointer"
                >
                  <RotateCcw className="size-3" />
                  <span>Restore</span>
                </Button>
              </div>
            ))}

            {archivedCards.length === 0 && (
              <div className="py-12 text-center text-xs sm:text-sm text-muted-foreground italic">
                No archived cards on this board.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
