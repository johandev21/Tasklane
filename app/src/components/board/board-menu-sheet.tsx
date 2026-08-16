import { useState } from 'react'
import { RotateCcw, Loader2, Trash2 } from 'lucide-react'
import { usePaginatedQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
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
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar.tsx'
import { ModeToggle } from '#/components/mode-toggle.tsx'
import { useInfiniteScroll } from '#/hooks/use-infinite-scroll.ts'
import { LabelPaletteManager } from './labels/label-palette-manager.tsx'
import { DeleteBoardDialog } from './delete-board-dialog.tsx'
import type {
  EnrichedActivityDoc,
  CardDoc,
  LabelDoc,
  PresenceViewer,
} from './types.ts'

export interface BoardMenuSheetProps {
  boardId?: Id<'boards'>
  boardTitle?: string
  presence?: PresenceViewer[]
  activities?: EnrichedActivityDoc[]
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
  onDeleteBoard?: () => Promise<void>
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
    case 'board_renamed':
      return `renamed board "${payload.oldName ?? ''}" to "${payload.newName ?? ''}"`
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

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0 || !parts[0]) return '?'
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function BoardMenuSheet({
  boardId,
  boardTitle = 'this board',
  presence = [],
  activities: directActivities,
  archivedCards = [],
  labels = [],
  isOwner = false,
  isOpen,
  onClose,
  onRestoreCard,
  onCreateLabel,
  onUpdateLabel,
  onRemoveLabel,
  onDeleteBoard,
}: BoardMenuSheetProps) {
  const [isDeleteBoardOpen, setIsDeleteBoardOpen] = useState(false)
  const {
    results: paginatedActivities,
    status: activityStatus,
    loadMore: loadMoreActivity,
    isLoading: isActivityLoading,
  } = usePaginatedQuery(
    api.activity.listPaginated,
    isOpen && boardId ? { boardId } : 'skip',
    { initialNumItems: 20 },
  )

  const activities = directActivities ?? paginatedActivities

  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: () => loadMoreActivity(20),
    canLoadMore: activityStatus === 'CanLoadMore',
    isLoading: isActivityLoading,
    disabled: !isOpen || !boardId || Boolean(directActivities),
  })

  return (
    <>
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

          {/* Active Viewers (Useful on mobile where header presence is collapsed) */}
          {presence.length > 0 && (
            <div className="mx-4 mb-2 flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-muted/40 p-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
                <span className="font-medium text-foreground">
                  {presence.length}{' '}
                  {presence.length === 1 ? 'person viewing' : 'people viewing'}
                </span>
              </div>
              <div className="flex -space-x-1.5 overflow-hidden">
                {presence.map((v) => (
                  <Avatar key={v.userId} className="size-6 ring-2 ring-card">
                    <AvatarImage src={v.imageUrl} alt={v.name} />
                    <AvatarFallback className="text-[10px] font-semibold bg-muted text-foreground">
                      {getInitials(v.name)}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
            </div>
          )}

          <Tabs
            defaultValue="activity"
            className="flex-1 flex flex-col min-h-0"
          >
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
              {activityStatus === 'LoadingFirstPage' &&
                activities.length === 0 && (
                  <div className="flex flex-col gap-4 animate-pulse">
                    {[1, 2, 3].map((n) => (
                      <div key={n} className="flex items-start gap-3">
                        <div className="size-7 rounded-full bg-muted shrink-0" />
                        <div className="flex-1 flex flex-col gap-1.5">
                          <div className="h-3.5 w-3/4 rounded bg-muted" />
                          <div className="h-2.5 w-20 rounded bg-muted/60" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              {activities.map((act) => {
                const actorName = act.actor?.name || 'A team member'
                const message = formatActivityMessage(act)

                return (
                  <div key={act._id} className="flex items-start gap-3">
                    <Avatar className="size-7 shrink-0 ring-1 ring-border mt-0.5">
                      <AvatarImage
                        src={act.actor?.imageUrl}
                        alt={actorName}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-muted font-heading text-xs font-semibold text-foreground">
                        {actorName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
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

              {/* Loading More Spinner */}
              {activityStatus === 'LoadingMore' && (
                <div className="flex items-center justify-center py-2 text-xs text-muted-foreground gap-2">
                  <Loader2 className="size-3.5 animate-spin text-primary" />
                  <span>Loading older activity...</span>
                </div>
              )}

              {/* Infinite Scroll Sentinel */}
              {activityStatus === 'CanLoadMore' && (
                <div ref={sentinelRef} className="h-2 w-full" />
              )}

              {/* Fallback Load More Button */}
              {activityStatus === 'CanLoadMore' && (
                <div className="flex justify-center pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => loadMoreActivity(20)}
                    className="text-xs text-muted-foreground hover:text-foreground h-7 px-3 cursor-pointer"
                  >
                    Load older activity
                  </Button>
                </div>
              )}

              {/* Exhausted State Indicator */}
              {activityStatus === 'Exhausted' && activities.length >= 10 && (
                <p className="text-[11px] text-muted-foreground/60 py-2 text-center font-mono">
                  No older activity
                </p>
              )}

              {activities.length === 0 &&
                activityStatus !== 'LoadingFirstPage' && (
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

          {/* Bottom Actions & Settings (Theme Switcher + Delete Board for Owner) */}
          <div className="shrink-0 border-t border-border/60 bg-muted/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Appearance
              </span>
              <ModeToggle />
            </div>

            {isOwner && onDeleteBoard && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsDeleteBoardOpen(true)}
                className="w-full gap-2 text-xs h-8 cursor-pointer"
              >
                <Trash2 className="size-3.5" />
                <span>Delete board</span>
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Board Confirmation Dialog */}
      {isOwner && onDeleteBoard && (
        <DeleteBoardDialog
          boardTitle={boardTitle}
          isOpen={isDeleteBoardOpen}
          onClose={() => setIsDeleteBoardOpen(false)}
          onConfirm={async () => {
            setIsDeleteBoardOpen(false)
            onClose()
            await onDeleteBoard()
          }}
        />
      )}
    </>
  )
}
