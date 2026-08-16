import { useState, useMemo, memo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Edit2,
  Archive,
  Clock,
  Flame,
  AlignLeft,
  MessageSquare,
  ArrowUpToLine,
  ArrowDownToLine,
  MoreHorizontal,
} from 'lucide-react'
import { Button } from '#/components/ui/button.tsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu.tsx'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar.tsx'
import { getLabelColor } from './labels/label-colors.ts'
import type { BoardMemberUser, CardDoc, LabelDoc } from './types.ts'

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0 || !parts[0]) return '?'
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export interface CardItemProps {
  card: CardDoc
  labels?: LabelDoc[]
  assignees?: BoardMemberUser[]
  commentsCount?: number
  isDraggingOverlay?: boolean
  onRenameCard?: (cardId: CardDoc['_id'], newTitle: string) => void
  onArchiveCard?: (cardId: CardDoc['_id']) => void
  onCardClick?: (card: CardDoc) => void
  onMoveToTop?: (cardId: CardDoc['_id']) => void
  onMoveToBottom?: (cardId: CardDoc['_id']) => void
}

export const CardItem = memo(function CardItem({
  card,
  labels = [],
  assignees = [],
  commentsCount = 0,
  isDraggingOverlay = false,
  onRenameCard,
  onArchiveCard,
  onCardClick,
  onMoveToTop,
  onMoveToBottom,
}: CardItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(card.title)

  const sortableData = useMemo(
    () => ({
      type: 'card' as const,
      cardId: card._id,
      listId: card.listId,
    }),
    [card._id, card.listId],
  )

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card._id,
    data: sortableData,
    disabled: isEditing || isDraggingOverlay,
  })

  const style = isDraggingOverlay
    ? undefined
    : {
        transform: CSS.Translate.toString(transform),
        transition,
      }

  const isOverdue = card.dueDate !== undefined && card.dueDate < Date.now()

  const handleSaveRename = () => {
    const trimmed = editTitle.trim()
    if (trimmed && trimmed !== card.title) {
      onRenameCard?.(card._id, trimmed)
    } else {
      setEditTitle(card.title)
    }
    setIsEditing(false)
  }

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="h-20 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 opacity-50 transition-all"
      />
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(!isEditing && !isDraggingOverlay
        ? { ...attributes, ...listeners }
        : {})}
      onClick={() => {
        if (!isEditing && !isDraggingOverlay) {
          onCardClick?.(card)
        }
      }}
      className={`group relative rounded-xl border border-border/80 bg-card p-3 shadow-2xs transition-all duration-150 flex flex-col gap-2 touch-manipulation select-none ${
        isDraggingOverlay
          ? 'ring-2 ring-primary/40 shadow-2xl scale-[1.02] cursor-grabbing'
          : 'hover:border-border hover:shadow-md hover:-translate-y-0.5 cursor-pointer'
      }`}
    >
      {/* Label Badges */}
      {!isEditing && labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {labels.map((lbl) => {
            const colorDef = getLabelColor(lbl.color)
            return (
              <span
                key={lbl._id}
                className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold border ${colorDef.badgeClass} max-w-full`}
                title={lbl.name}
              >
                <span className="truncate break-all">{lbl.name}</span>
              </span>
            )
          })}
        </div>
      )}

      {isEditing ? (
        <div
          className="flex flex-col gap-1.5"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <textarea
            autoFocus
            rows={2}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSaveRename()
              }
              if (e.key === 'Escape') {
                setEditTitle(card.title)
                setIsEditing(false)
              }
            }}
            className="w-full resize-none rounded-md border border-ring bg-background p-1.5 text-sm text-foreground focus:outline-none break-words"
          />
          <div className="flex items-center gap-1">
            <Button size="xs" onClick={handleSaveRename}>
              Save
            </Button>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => {
                setEditTitle(card.title)
                setIsEditing(false)
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-2">
          <p className="whitespace-pre-line break-words text-sm font-medium leading-snug text-foreground">
            {card.title}
          </p>
        </div>
      )}

      {/* Badges / Metadata Indicators */}
      {!isEditing &&
        (card.dueDate ||
          card.description ||
          commentsCount > 0 ||
          assignees.length > 0) && (
          <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5 select-none">
            <div className="flex items-center gap-2 flex-wrap">
              {card.dueDate && (
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium border ${
                    isOverdue
                      ? 'bg-red-500/15 border-red-300 dark:border-red-800/80 text-red-600 dark:text-red-400 font-semibold'
                      : 'bg-muted/50 border-border/70 text-muted-foreground'
                  }`}
                >
                  {isOverdue ? (
                    <Flame className="size-3 text-red-600 dark:text-red-400" />
                  ) : (
                    <Clock className="size-3" />
                  )}
                  <span>
                    {new Date(card.dueDate).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </span>
              )}

              {card.description && (
                <span
                  className="inline-flex items-center text-muted-foreground/70"
                  title="This card has a description"
                >
                  <AlignLeft className="size-3.5" />
                </span>
              )}

              {commentsCount > 0 && (
                <span
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground/70"
                  title={`${commentsCount} comment${commentsCount === 1 ? '' : 's'}`}
                >
                  <MessageSquare className="size-3.5" />
                  <span className="font-mono text-[11px]">{commentsCount}</span>
                </span>
              )}
            </div>

            {/* Assignees Avatar Stack */}
            {assignees.length > 0 && (
              <div className="flex -space-x-1.5 overflow-hidden ml-auto">
                {assignees.map((member) => (
                  <Avatar
                    key={member.userId}
                    className="size-5 ring-1 ring-card border-none"
                    title={member.name}
                  >
                    <AvatarImage src={member.imageUrl} alt={member.name} />
                    <AvatarFallback className="text-[9px] font-semibold bg-primary/15 text-primary">
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
            )}
          </div>
        )}

      {/* Floating quick-actions on hover */}
      {!isEditing && !isDraggingOverlay && (
        <div
          className="absolute right-1.5 top-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setIsEditing(true)
            }}
            className="rounded-md bg-card/90 p-1 text-muted-foreground shadow-xs hover:bg-muted hover:text-foreground backdrop-blur-xs cursor-pointer"
            title="Quick edit title"
          >
            <Edit2 className="size-3" />
          </button>

          {(onMoveToTop || onMoveToBottom) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="rounded-md bg-card/90 p-1 text-muted-foreground shadow-xs hover:bg-muted hover:text-foreground backdrop-blur-xs cursor-pointer"
                  title="Move card options"
                >
                  <MoreHorizontal className="size-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {onMoveToTop && (
                  <DropdownMenuItem
                    onClick={() => onMoveToTop(card._id)}
                    className="text-xs cursor-pointer"
                  >
                    <ArrowUpToLine className="mr-2 size-3.5" />
                    <span>Move to top</span>
                  </DropdownMenuItem>
                )}
                {onMoveToBottom && (
                  <DropdownMenuItem
                    onClick={() => onMoveToBottom(card._id)}
                    className="text-xs cursor-pointer"
                  >
                    <ArrowDownToLine className="mr-2 size-3.5" />
                    <span>Move to bottom</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {onArchiveCard && (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onArchiveCard(card._id)}
                    className="text-xs cursor-pointer"
                  >
                    <Archive className="mr-2 size-3.5" />
                    <span>Archive card</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {!onMoveToTop && !onMoveToBottom && onArchiveCard && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onArchiveCard(card._id)
              }}
              className="rounded-md bg-card/90 p-1 text-muted-foreground/60 shadow-xs hover:bg-muted hover:text-foreground backdrop-blur-xs cursor-pointer"
              title="Archive card"
            >
              <Archive className="size-3" />
            </button>
          )}
        </div>
      )}
    </div>
  )
})
