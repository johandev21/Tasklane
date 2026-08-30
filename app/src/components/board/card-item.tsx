import { useState, useMemo, memo } from 'react'
import type { KeyboardEvent, MouseEvent } from 'react'
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
import { getInitials } from './board-transforms.ts'
import type { BoardMemberUser, CardDoc, LabelDoc } from './types.ts'

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

  const handleSaveRename = () => {
    const trimmed = editTitle.trim()
    if (trimmed && trimmed !== card.title) {
      onRenameCard?.(card._id, trimmed)
    } else {
      setEditTitle(card.title)
    }
    setIsEditing(false)
  }

  const handleCancelRename = () => {
    setEditTitle(card.title)
    setIsEditing(false)
  }

  const handleCardClick = () => {
    if (!isEditing && !isDraggingOverlay) {
      onCardClick?.(card)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.key === 'Enter' || event.key === ' ') && !isEditing) {
      event.preventDefault()
      onCardClick?.(card)
    }
  }

  if (isDragging) {
    return <CardDraggingPlaceholder setNodeRef={setNodeRef} style={style} />
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(!isEditing && !isDraggingOverlay
        ? { ...attributes, ...listeners }
        : {})}
      onClick={handleCardClick}
      role="button"
      tabIndex={!isEditing && !isDraggingOverlay ? 0 : -1}
      onKeyDown={handleKeyDown}
      className={`group relative rounded-xl border border-border/80 bg-card p-3 shadow-2xs transition-all duration-150 flex flex-col gap-2 touch-manipulation select-none ${
        isDraggingOverlay
          ? 'ring-2 ring-primary/40 shadow-2xl scale-[1.02] cursor-grabbing'
          : 'hover:border-border hover:shadow-md hover:-translate-y-0.5 cursor-pointer'
      }`}
    >
      {/* Label Badges */}
      {!isEditing && labels.length > 0 && <CardLabelBadges labels={labels} />}

      {/* Card Title or Editor */}
      {isEditing ? (
        <CardTitleEditor
          title={card.title}
          value={editTitle}
          onChange={setEditTitle}
          onSave={handleSaveRename}
          onCancel={handleCancelRename}
        />
      ) : (
        <CardTitleDisplay title={card.title} />
      )}

      {/* Metadata & Assignees Footer */}
      {!isEditing &&
        (card.dueDate ||
          card.description ||
          commentsCount > 0 ||
          assignees.length > 0) && (
          <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5 select-none">
            <CardMetadataIndicators
              dueDate={card.dueDate}
              hasDescription={Boolean(card.description)}
              commentsCount={commentsCount}
            />

            {assignees.length > 0 && (
              <CardAssigneeStack assignees={assignees} />
            )}
          </div>
        )}

      {/* Floating quick-actions on hover */}
      {!isEditing && !isDraggingOverlay && (
        <CardQuickActionsMenu
          cardId={card._id}
          onStartEdit={() => setIsEditing(true)}
          onMoveToTop={onMoveToTop}
          onMoveToBottom={onMoveToBottom}
          onArchiveCard={onArchiveCard}
        />
      )}
    </div>
  )
})

function CardDraggingPlaceholder({
  setNodeRef,
  style,
}: {
  setNodeRef: (element: HTMLElement | null) => void
  style: React.CSSProperties | undefined
}) {
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="h-20 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 opacity-50 transition-all"
    />
  )
}

function CardLabelBadges({ labels }: { labels: LabelDoc[] }) {
  return (
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
  )
}

interface CardTitleEditorProps {
  title: string
  value: string
  onChange: (val: string) => void
  onSave: () => void
  onCancel: () => void
}

function CardTitleEditor({
  title,
  value,
  onChange,
  onSave,
  onCancel,
}: CardTitleEditorProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSave()
    }
    if (e.key === 'Escape') {
      onCancel()
    }
  }

  const stopProp = (e: MouseEvent) => e.stopPropagation()

  return (
    <div
      className="flex flex-col gap-1.5"
      onClick={stopProp}
      onPointerDown={stopProp}
    >
      <textarea
        aria-label={`Edit title for ${title}`}
        autoFocus
        rows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full resize-none rounded-md border border-ring bg-background p-1.5 text-sm text-foreground focus:outline-none break-words"
      />
      <div className="flex items-center gap-1">
        <Button size="xs" onClick={onSave}>
          Save
        </Button>
        <Button size="xs" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

function CardTitleDisplay({ title }: { title: string }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <p className="whitespace-pre-line break-words text-sm font-medium leading-snug text-foreground">
        {title}
      </p>
    </div>
  )
}

interface CardMetadataIndicatorsProps {
  dueDate?: number
  hasDescription: boolean
  commentsCount: number
}

function CardMetadataIndicators({
  dueDate,
  hasDescription,
  commentsCount,
}: CardMetadataIndicatorsProps) {
  const isOverdue = dueDate !== undefined && dueDate < Date.now()

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {dueDate && (
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
            {new Date(dueDate).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </span>
      )}

      {hasDescription && (
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
  )
}

function CardAssigneeStack({ assignees }: { assignees: BoardMemberUser[] }) {
  return (
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
  )
}

interface CardQuickActionsMenuProps {
  cardId: CardDoc['_id']
  onStartEdit: () => void
  onMoveToTop?: (cardId: CardDoc['_id']) => void
  onMoveToBottom?: (cardId: CardDoc['_id']) => void
  onArchiveCard?: (cardId: CardDoc['_id']) => void
}

function CardQuickActionsMenu({
  cardId,
  onStartEdit,
  onMoveToTop,
  onMoveToBottom,
  onArchiveCard,
}: CardQuickActionsMenuProps) {
  const stopProp = (e: MouseEvent) => {
    e.stopPropagation()
  }

  const handleEditClick = (e: MouseEvent) => {
    e.stopPropagation()
    onStartEdit()
  }

  return (
    <div
      className="absolute right-1.5 top-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
      onClick={stopProp}
      onPointerDown={stopProp}
    >
      <button
        type="button"
        onClick={handleEditClick}
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
                onClick={() => onMoveToTop(cardId)}
                className="text-xs cursor-pointer"
              >
                <ArrowUpToLine className="mr-2 size-3.5" />
                <span>Move to top</span>
              </DropdownMenuItem>
            )}
            {onMoveToBottom && (
              <DropdownMenuItem
                onClick={() => onMoveToBottom(cardId)}
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
                onClick={() => onArchiveCard(cardId)}
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
            onArchiveCard(cardId)
          }}
          className="rounded-md bg-card/90 p-1 text-muted-foreground/60 shadow-xs hover:bg-muted hover:text-foreground backdrop-blur-xs cursor-pointer"
          title="Archive card"
        >
          <Archive className="size-3" />
        </button>
      )}
    </div>
  )
}
