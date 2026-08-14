import { useState, memo } from 'react'
import type { FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '#/components/ui/button.tsx'
import { Input } from '#/components/ui/input.tsx'
import { ListColumn } from './list-column.tsx'
import type { BoardMemberUser, ListDoc, CardDoc, LabelDoc } from './types.ts'

export interface BoardCanvasProps {
  lists: ListDoc[]
  cards: CardDoc[]
  cardLabelsMap?: Record<string, LabelDoc[] | undefined>
  cardAssigneesMap?: Record<string, BoardMemberUser[] | undefined>
  onAddList: (title: string) => void
  onRenameList: (listId: ListDoc['_id'], newTitle: string) => void
  onDeleteList: (list: ListDoc) => void
  onArchiveAllCards: (listId: ListDoc['_id']) => void
  onAddCard: (listId: ListDoc['_id'], title: string) => void
  onRenameCard: (cardId: CardDoc['_id'], title: string) => void
  onArchiveCard: (cardId: CardDoc['_id']) => void
  onCardClick?: (card: CardDoc) => void
}

export const BoardCanvas = memo(function BoardCanvas({
  lists,
  cards,
  cardLabelsMap = {},
  cardAssigneesMap = {},
  onAddList,
  onRenameList,
  onDeleteList,
  onArchiveAllCards,
  onAddCard,
  onRenameCard,
  onArchiveCard,
  onCardClick,
}: BoardCanvasProps) {
  const [isAddingList, setIsAddingList] = useState(false)
  const [newListTitle, setNewListTitle] = useState('')

  const handleCreateListSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = newListTitle.trim()
    if (trimmed) {
      onAddList(trimmed)
      setNewListTitle('')
      setIsAddingList(false)
    }
  }

  return (
    <main className="relative flex-1 overflow-x-auto overflow-y-hidden px-4 sm:px-6 py-5 touch-pan-x [overflow-scrolling:touch]">
      <div className="flex h-full items-start gap-4 sm:gap-5 pb-4">
        {lists.map((list) => {
          const listCards = cards.filter((c) => c.listId === list._id)
          return (
            <ListColumn
              key={list._id}
              list={list}
              cards={listCards}
              cardLabelsMap={cardLabelsMap}
              cardAssigneesMap={cardAssigneesMap}
              onRenameList={onRenameList}
              onDeleteList={onDeleteList}
              onArchiveAllCards={onArchiveAllCards}
              onAddCard={onAddCard}
              onRenameCard={onRenameCard}
              onArchiveCard={onArchiveCard}
              onCardClick={onCardClick}
            />
          )
        })}

        {/* Quick Add List Column Tile */}
        <div className="w-[85vw] sm:w-80 md:w-84 shrink-0 pr-6">
          {isAddingList ? (
            <form
              onSubmit={handleCreateListSubmit}
              className="rounded-2xl border border-border/80 bg-card p-3.5 shadow-md flex flex-col gap-3"
            >
              <Input
                autoFocus
                placeholder="Enter list title..."
                value={newListTitle}
                onChange={(e) => setNewListTitle(e.target.value)}
                className="text-sm break-all"
              />
              <div className="flex items-center gap-2">
                <Button size="sm" type="submit" disabled={!newListTitle.trim()}>
                  Add List
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  type="button"
                  onClick={() => {
                    setIsAddingList(false)
                    setNewListTitle('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddingList(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border/80 bg-muted/30 p-4 text-sm font-medium text-muted-foreground transition-all hover:border-border hover:bg-muted/60 hover:text-foreground cursor-pointer"
            >
              <Plus className="size-4" />
              <span>Add another list</span>
            </button>
          )}
        </div>
      </div>
    </main>
  )
})
