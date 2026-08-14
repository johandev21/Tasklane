import { useState } from 'react'
import { Edit2, Archive, Clock, Flame, AlignLeft } from 'lucide-react'
import { Button } from '#/components/ui/button.tsx'
import type { CardDoc } from './types.ts'

export interface CardItemProps {
  card: CardDoc
  onRenameCard: (cardId: CardDoc['_id'], newTitle: string) => void
  onArchiveCard: (cardId: CardDoc['_id']) => void
  onCardClick?: (card: CardDoc) => void
}

export function CardItem({
  card,
  onRenameCard,
  onArchiveCard,
  onCardClick,
}: CardItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(card.title)

  const isOverdue = card.dueDate !== undefined && card.dueDate < Date.now()

  const handleSaveRename = () => {
    const trimmed = editTitle.trim()
    if (trimmed && trimmed !== card.title) {
      onRenameCard(card._id, trimmed)
    } else {
      setEditTitle(card.title)
    }
    setIsEditing(false)
  }

  return (
    <div
      onClick={() => {
        if (!isEditing) {
          onCardClick?.(card)
        }
      }}
      className="group relative rounded-xl border border-border/80 bg-card p-3 shadow-2xs transition-all duration-150 hover:border-border hover:shadow-md hover:-translate-y-0.5 cursor-pointer flex flex-col gap-2"
    >
      {isEditing ? (
        <div
          className="flex flex-col gap-1.5"
          onClick={(e) => e.stopPropagation()}
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
      {!isEditing && (card.dueDate || card.description) && (
        <div className="flex items-center gap-2 flex-wrap pt-0.5 select-none">
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
        </div>
      )}

      {/* Floating quick-actions on hover */}
      {!isEditing && (
        <div className="absolute right-1.5 top-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
        </div>
      )}
    </div>
  )
}
