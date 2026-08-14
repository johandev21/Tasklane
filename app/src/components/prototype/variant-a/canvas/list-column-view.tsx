import { useState, useMemo, memo } from 'react'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import {
  MoreHorizontal,
  Plus,
  Edit2,
  FolderArchive,
  Trash2,
} from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import type { useSortable } from '@dnd-kit/sortable'
import { SortableCardItem } from '../card/sortable-card-item'
import { CardItemView } from '../card/card-item-view'
import { ListComposer } from './list-composer'
import type { CardItem, ListItem, Member } from '#/components/prototype/types'

export interface ListColumnViewProps {
  list: ListItem
  cards: Record<string, CardItem | undefined>
  members: Member[]
  isLabelsExpanded: boolean
  isDraggingOverlay?: boolean
  dragHandleProps?: ReturnType<typeof useSortable>['attributes']
  dragHandleListeners?: ReturnType<typeof useSortable>['listeners']
  onToggleLabelsExpanded: () => void
  onSelectCard: (id: string) => void
  onRenameList: (id: string, title: string) => void
  onDeleteList: (id: string) => void
  onArchiveAllCards: (id: string) => void
  onAddCard: (listId: string, title: string) => void
  onRenameCard: (id: string, title: string) => void
  onArchiveCard: (id: string) => void
}

export const ListColumnView = memo(function ListColumnView({
  list,
  cards,
  members,
  isLabelsExpanded,
  isDraggingOverlay = false,
  dragHandleProps,
  dragHandleListeners,
  onToggleLabelsExpanded,
  onSelectCard,
  onRenameList,
  onDeleteList,
  onArchiveAllCards,
  onAddCard,
  onRenameCard,
  onArchiveCard,
}: ListColumnViewProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState(list.title)
  const [isComposerOpen, setIsComposerOpen] = useState(false)

  const handleTitleSubmit = () => {
    if (titleValue.trim() && titleValue !== list.title) {
      onRenameList(list.id, titleValue.trim())
    } else {
      setTitleValue(list.title)
    }
    setIsEditingTitle(false)
  }

  const displayedCardIds = useMemo(
    () =>
      list.cardIds.filter((cardId) => {
        const card = cards[cardId]
        return card && !card.isArchived
      }),
    [list.cardIds, cards],
  )

  return (
    <div
      className={`group/col flex max-h-[calc(100vh-140px)] w-[85vw] sm:w-80 md:w-84 shrink-0 flex-col rounded-2xl border border-border/70 bg-muted/55 dark:bg-muted/30 shadow-2xs backdrop-blur-sm transition-shadow ${
        isDraggingOverlay
          ? 'ring-2 ring-primary/40 shadow-2xl bg-card/95 backdrop-blur-none cursor-grabbing'
          : ''
      }`}
    >
      {/* Sticky Column Header - Entire Header acts as Drag Handle (Trello-style) */}
      <div
        {...(!isEditingTitle && !isDraggingOverlay
          ? { ...dragHandleProps, ...dragHandleListeners }
          : {})}
        className={`sticky top-0 z-10 shrink-0 bg-card/90 dark:bg-card/90 backdrop-blur-md rounded-t-2xl border-b border-border/40 flex items-center justify-between gap-1.5 p-3 pb-2.5 select-none ${
          !isEditingTitle && !isDraggingOverlay
            ? 'cursor-grab active:cursor-grabbing'
            : isDraggingOverlay
              ? 'cursor-grabbing'
              : ''
        }`}
      >
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
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className="w-full rounded-md border border-ring bg-background px-2 py-0.5 font-heading text-base font-semibold text-foreground outline-none break-all cursor-text"
            />
          ) : (
            <h2
              onClick={(e) => {
                if (isDraggingOverlay) return
                e.stopPropagation()
                setIsEditingTitle(true)
              }}
              className={`font-heading text-base font-semibold tracking-tight text-foreground break-all px-1 py-0.5 rounded transition-colors line-clamp-2 ${
                !isDraggingOverlay
                  ? 'cursor-pointer hover:bg-muted/60'
                  : 'cursor-grabbing'
              }`}
              title="Click to rename list"
            >
              {list.title}
            </h2>
          )}
        </div>

        <div
          className="flex items-center gap-1 shrink-0"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <span className="font-mono text-xs text-muted-foreground px-1 select-none">
            {displayedCardIds.length}
          </span>

          {!isDraggingOverlay && (
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
                  onClick={() => onArchiveAllCards(list.id)}
                  className="text-sm"
                >
                  <FolderArchive className="mr-2 size-3.5" />
                  <span>Archive all cards</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive text-sm"
                  onClick={() => onDeleteList(list.id)}
                >
                  <Trash2 className="mr-2 size-3.5" />
                  <span>Delete list</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Internal Scrollable Cards Container */}
      <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-2 min-h-[60px] scrollbar-thin">
        {isDraggingOverlay ? (
          displayedCardIds.map((cardId) => {
            const card = cards[cardId]
            if (!card) return null
            return (
              <CardItemView
                key={card.id}
                card={card}
                members={members}
                isLabelsExpanded={isLabelsExpanded}
                onToggleLabelsExpanded={() => {}}
              />
            )
          })
        ) : (
          <SortableContext
            items={displayedCardIds}
            strategy={verticalListSortingStrategy}
          >
            {displayedCardIds.map((cardId) => {
              const card = cards[cardId]
              if (!card) return null
              return (
                <SortableCardItem
                  key={card.id}
                  card={card}
                  listId={list.id}
                  members={members}
                  isLabelsExpanded={isLabelsExpanded}
                  onToggleLabelsExpanded={onToggleLabelsExpanded}
                  onSelectCard={onSelectCard}
                  onRenameCard={onRenameCard}
                  onArchiveCard={onArchiveCard}
                />
              )
            })}
          </SortableContext>
        )}

        {displayedCardIds.length === 0 && (
          <div className="flex h-20 items-center justify-center rounded-xl border border-dashed border-border/50 text-sm text-muted-foreground/70 text-center px-2">
            Drop cards here
          </div>
        )}
      </div>

      {/* Sticky Column Footer: Quick Composer */}
      {!isDraggingOverlay && (
        <div className="sticky bottom-0 z-10 shrink-0 bg-card/90 dark:bg-card/90 backdrop-blur-md rounded-b-2xl border-t border-border/40 p-2.5">
          <ListComposer
            isOpen={isComposerOpen}
            onOpen={() => setIsComposerOpen(true)}
            onClose={() => setIsComposerOpen(false)}
            onAddCard={(title) => onAddCard(list.id, title)}
          />
        </div>
      )}
    </div>
  )
})
