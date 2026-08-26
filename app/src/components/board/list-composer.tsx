import { useState, useRef, useEffect } from 'react'
import type { FormEvent } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '#/components/ui/button.tsx'

export interface ListComposerProps {
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
  onAddCard: (title: string) => void
}

export function ListComposer({
  isOpen,
  onOpen,
  onClose,
  onAddCard,
}: ListComposerProps) {
  const [newCardText, setNewCardText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (isOpen) {
      textareaRef.current?.focus()
    }
  }, [isOpen])

  // Handle click outside to cleanly close the composer when empty
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(e.target as Node)) {
        if (!newCardText.trim()) {
          onClose()
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, newCardText, onClose])

  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault()
    const trimmed = newCardText.trim()
    if (trimmed) {
      onAddCard(trimmed)
      setNewCardText('')
      // Maintain focus for rapid sequential creation
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 0)
    }
  }

  if (isOpen) {
    return (
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="rounded-xl border border-border/80 bg-card p-2.5 shadow-sm transition-all animate-in fade-in-50 duration-150"
      >
        <textarea
          aria-label="New card title"
          ref={textareaRef}
          autoFocus
          rows={2}
          placeholder="Enter a title for this card..."
          value={newCardText}
          onChange={(e) => setNewCardText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit()
            }
            if (e.key === 'Escape') {
              onClose()
              setNewCardText('')
            }
          }}
          className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none break-all leading-snug"
        />
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              type="submit"
              disabled={!newCardText.trim()}
              className="text-xs h-7 px-2.5"
            >
              Add card
            </Button>
            <Button
              size="icon-xs"
              variant="ghost"
              type="button"
              onClick={() => {
                onClose()
                setNewCardText('')
              }}
              className="text-muted-foreground hover:text-foreground"
              title="Cancel (Esc)"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>
      </form>
    )
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground group cursor-pointer"
    >
      <Plus className="size-3.5 group-hover:text-primary transition-colors" />
      <span>Add a card</span>
    </button>
  )
}
