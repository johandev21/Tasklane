import { useState } from 'react'
import { Edit2, Archive } from 'lucide-react'
import { Button } from '#/components/ui/button.tsx'
import type { CardDoc } from './types.ts'

export interface CardItemProps {
  card: CardDoc
  onRenameCard: (cardId: CardDoc['_id'], newTitle: string) => void
  onArchiveCard: (cardId: CardDoc['_id']) => void
}

export function CardItem({ card, onRenameCard, onArchiveCard }: CardItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(card.title)

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
    <div className="group relative rounded-xl border border-border/80 bg-card p-3 shadow-2xs transition-all duration-150 hover:border-border hover:shadow-md hover:-translate-y-0.5">
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
        <div className="flex items-start justify-between gap-2">
          <p className="whitespace-pre-line break-all text-sm font-medium leading-snug text-foreground">
            {card.title}
          </p>
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
