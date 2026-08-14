import { useState, memo } from 'react'
import {
  MoreHorizontal,
  Plus,
  Edit2,
  FolderArchive,
  Trash2,
} from 'lucide-react'
import { Button } from '#/components/ui/button.tsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu.tsx'
import { CardItem } from './card-item.tsx'
import { ListComposer } from './list-composer.tsx'
import type { ListDoc, CardDoc } from './types.ts'

export interface ListColumnProps {
  list: ListDoc
  cards: CardDoc[]
  onRenameList: (listId: ListDoc['_id'], newTitle: string) => void
  onDeleteList: (list: ListDoc) => void
  onArchiveAllCards: (listId: ListDoc['_id']) => void
  onAddCard: (listId: ListDoc['_id'], title: string) => void
  onRenameCard: (cardId: CardDoc['_id'], title: string) => void
  onArchiveCard: (cardId: CardDoc['_id']) => void
  onCardClick?: (card: CardDoc) => void
}

export const ListColumn = memo(function ListColumn({
  list,
  cards,
  onRenameList,
  onDeleteList,
  onArchiveAllCards,
  onAddCard,
  onRenameCard,
  onArchiveCard,
  onCardClick,
}: ListColumnProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState(list.title)
  const [isComposerOpen, setIsComposerOpen] = useState(false)

  const handleTitleSubmit = () => {
    const trimmed = titleValue.trim()
    if (trimmed && trimmed !== list.title) {
      onRenameList(list._id, trimmed)
    } else {
      setTitleValue(list.title)
    }
    setIsEditingTitle(false)
  }

  return (
    <div className="group/col flex max-h-[calc(100vh-140px)] w-[85vw] sm:w-80 md:w-84 shrink-0 flex-col rounded-2xl border border-border/70 bg-muted/55 dark:bg-muted/30 shadow-2xs backdrop-blur-sm transition-shadow">
      {/* Sticky Column Header */}
      <div className="sticky top-0 z-10 shrink-0 bg-card/90 dark:bg-card/90 backdrop-blur-md rounded-t-2xl border-b border-border/40 flex items-center justify-between gap-1.5 p-3 pb-2.5 select-none">
        <div className="flex flex-1 items-center min-w-0">
          {isEditingTitle ? (
            <input
              autoFocus
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSubmit()
                if (e.key === 'Escape') {
                  setTitleValue(list.title)
                  setIsEditingTitle(false)
                }
              }}
              className="w-full rounded-md border border-ring bg-background px-2 py-0.5 font-heading text-base font-semibold text-foreground outline-none break-all"
            />
          ) : (
            <h2
              onClick={() => setIsEditingTitle(true)}
              className="font-heading text-base font-semibold tracking-tight text-foreground break-all px-1 py-0.5 rounded transition-colors line-clamp-2 cursor-pointer hover:bg-muted/60"
              title="Click to rename list"
            >
              {list.title}
            </h2>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span className="font-mono text-xs text-muted-foreground px-1 select-none">
            {cards.length}
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground hover:text-foreground opacity-70 group-hover/col:opacity-100 transition-opacity cursor-pointer"
              >
                <MoreHorizontal className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                List Actions
              </div>
              <DropdownMenuItem
                onClick={() => setIsComposerOpen(true)}
                className="text-sm"
              >
                <Plus className="mr-2 size-3.5" />
                <span>Add card...</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setIsEditingTitle(true)}
                className="text-sm"
              >
                <Edit2 className="mr-2 size-3.5" />
                <span>Rename list</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onArchiveAllCards(list._id)}
                className="text-sm"
              >
                <FolderArchive className="mr-2 size-3.5" />
                <span>Archive all cards</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive text-sm"
                onClick={() => onDeleteList(list)}
              >
                <Trash2 className="mr-2 size-3.5" />
                <span>Delete list</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Internal Scrollable Cards Container */}
      <div className="flex-1 overflow-y-auto px-2.5 py-2 flex flex-col gap-2 min-h-[60px] scrollbar-thin">
        {cards.map((card) => (
          <CardItem
            key={card._id}
            card={card}
            onRenameCard={onRenameCard}
            onArchiveCard={onArchiveCard}
            onCardClick={onCardClick}
          />
        ))}

        {cards.length === 0 && (
          <div className="flex h-20 items-center justify-center rounded-xl border border-dashed border-border/50 text-sm text-muted-foreground/70 text-center px-2">
            No cards in this list
          </div>
        )}
      </div>

      {/* Sticky Column Footer: Quick Composer */}
      <div className="sticky bottom-0 z-10 shrink-0 bg-card/90 dark:bg-card/90 backdrop-blur-md rounded-b-2xl border-t border-border/40 p-2.5">
        <ListComposer
          isOpen={isComposerOpen}
          onOpen={() => setIsComposerOpen(true)}
          onClose={() => setIsComposerOpen(false)}
          onAddCard={(title) => onAddCard(list._id, title)}
        />
      </div>
    </div>
  )
})
