import { useState } from 'react'
import { Edit2, Archive, AlignLeft, MessageSquare, Clock } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { LABEL_COLORS } from '../constants'
import type { CardItem, Member } from '#/components/prototype/types'

export interface CardItemViewProps {
  card: CardItem
  members: Member[]
  isLabelsExpanded?: boolean
  isDraggingOverlay?: boolean
  onToggleLabelsExpanded?: () => void
  onRenameCard?: (id: string, title: string) => void
  onArchiveCard?: (id: string) => void
}

export function CardItemView({
  card,
  members,
  isLabelsExpanded = true,
  isDraggingOverlay,
  onToggleLabelsExpanded,
  onRenameCard,
  onArchiveCard,
}: CardItemViewProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(card.title)

  const cardMembers = card.assigneeIds
    .map((id) => members.find((m) => m.id === id))
    .filter((m): m is Member => Boolean(m))

  const handleSaveRename = () => {
    if (editTitle.trim() && editTitle !== card.title) {
      onRenameCard?.(card.id, editTitle.trim())
    } else {
      setEditTitle(card.title)
    }
    setIsEditing(false)
  }

  // Calculate Due Date urgency
  const dueDateObj = card.dueDate ? new Date(card.dueDate) : null
  const now = new Date()
  const isOverdue =
    card.isOverdue ||
    (dueDateObj ? dueDateObj.getTime() < now.getTime() : false)

  const totalComments = card.comments.length
  const hasDescription = Boolean(
    card.description && card.description.trim().length > 0,
  )

  return (
    <div className="group relative rounded-xl border border-border/80 bg-card p-3 shadow-2xs transition-all duration-150 hover:border-border hover:shadow-md hover:-translate-y-0.5">
      {/* Card Labels Bar with Collapsed / Expanded Toggle */}
      {card.labels.length > 0 && (
        <div
          className="mb-2 flex flex-wrap gap-1 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation()
            onToggleLabelsExpanded?.()
          }}
          title="Click label to toggle expanded/compact labels"
        >
          {card.labels.map((label) => {
            const colorDef = LABEL_COLORS[label.color]

            if (!isLabelsExpanded) {
              return (
                <div
                  key={label.id}
                  className={`h-2 w-8 rounded-full transition-all hover:opacity-80 shadow-2xs ${colorDef.dotClass}`}
                  title={label.name}
                />
              )
            }

            return (
              <span
                key={label.id}
                className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border ${colorDef.badgeClass} max-w-full transition-transform hover:scale-105`}
              >
                <span className="break-all">{label.name}</span>
              </span>
            )
          })}
        </div>
      )}

      {/* Card Title & Inline Quick Edit */}
      <div className="mb-2">
        {isEditing ? (
          <div
            className="space-y-1.5"
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
              className="w-full resize-none rounded-md border border-ring bg-background p-1.5 text-sm text-foreground focus:outline-none break-all"
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
          <div className="flex items-start justify-between gap-1">
            <p
              className="whitespace-pre-line break-all text-sm font-medium leading-snug text-foreground"
              dir="auto"
            >
              {card.title}
            </p>
          </div>
        )}
      </div>

      {/* Bottom Metadata Badges & Assignee Avatars */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Due Date Badge */}
          {card.dueDate && (
            <span
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium transition-colors ${
                isOverdue
                  ? 'bg-red-500/15 text-red-600 dark:text-red-400 font-semibold'
                  : 'bg-muted/70 text-muted-foreground'
              }`}
              title={`Due: ${new Date(card.dueDate).toLocaleDateString(
                undefined,
                {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                },
              )}`}
            >
              <Clock className="size-3" />
              <span>
                {new Date(card.dueDate).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </span>
          )}

          {/* Description Indicator */}
          {hasDescription && (
            <span
              className="p-0.5 text-muted-foreground/80 hover:text-foreground transition-colors"
              title="This card has a description"
            >
              <AlignLeft className="size-3.5" />
            </span>
          )}

          {/* Comments Count */}
          {totalComments > 0 && (
            <span
              className="inline-flex items-center gap-0.5 text-xs text-muted-foreground/80"
              title={`${totalComments} comments`}
            >
              <MessageSquare className="size-3" />
              <span>{totalComments}</span>
            </span>
          )}
        </div>

        {/* Assignees Avatar Stack */}
        {cardMembers.length > 0 && (
          <div className="flex -space-x-1.5 overflow-hidden ml-auto">
            {cardMembers.map((m) => (
              <img
                key={m.id}
                src={m.avatarUrl}
                alt={m.name}
                title={m.name}
                className="size-5 rounded-full ring-1 ring-card object-cover"
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating Top-Right Quick Edit Pencil & Archive Buttons on Hover */}
      {!isDraggingOverlay && (
        <div className="absolute right-1.5 top-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onRenameCard && !isEditing && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setIsEditing(true)
              }}
              className="rounded-md bg-card/90 p-1 text-muted-foreground shadow-xs hover:bg-muted hover:text-foreground backdrop-blur-xs"
              title="Quick edit title"
            >
              <Edit2 className="size-3" />
            </button>
          )}

          {onArchiveCard && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onArchiveCard(card.id)
              }}
              className="rounded-md bg-card/90 p-1 text-muted-foreground/60 shadow-xs hover:bg-muted hover:text-foreground backdrop-blur-xs"
              title="Archive card"
            >
              <Archive className="size-3" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
