import { useState, useMemo, memo } from 'react'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  MoreHorizontal,
  Plus,
  Edit2,
  FolderArchive,
  Trash2,
  ArrowLeft,
  ArrowRight,
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
import { ArchiveListDialog } from './archive-list-dialog.tsx'
import type { BoardMemberUser, ListDoc, CardDoc, LabelDoc } from './types.ts'

export interface ListColumnProps {
  list: ListDoc
  cards: CardDoc[]
  cardLabelsMap?: Record<string, LabelDoc[] | undefined>
  cardAssigneesMap?: Record<string, BoardMemberUser[] | undefined>
  cardCommentsCountMap?: Record<string, number | undefined>
  isDraggingOverlay?: boolean
  isFirst?: boolean
  isLast?: boolean
  onRenameList?: (listId: ListDoc['_id'], newTitle: string) => void
  onDeleteList?: (list: ListDoc) => void
  onArchiveAllCards?: (listId: ListDoc['_id']) => void
  onAddCard?: (listId: ListDoc['_id'], title: string) => void
  onRenameCard?: (cardId: CardDoc['_id'], title: string) => void
  onArchiveCard?: (cardId: CardDoc['_id']) => void
  onCardClick?: (card: CardDoc) => void
  onMoveListLeft?: (listId: ListDoc['_id']) => void
  onMoveListRight?: (listId: ListDoc['_id']) => void
  onMoveCardToTop?: (cardId: CardDoc['_id']) => void
  onMoveCardToBottom?: (cardId: CardDoc['_id']) => void
}

export const ListColumn = memo(function ListColumn({
  list,
  cards,
  cardLabelsMap = {},
  cardAssigneesMap = {},
  cardCommentsCountMap = {},
  isDraggingOverlay = false,
  isFirst = false,
  isLast = false,
  onRenameList,
  onDeleteList,
  onArchiveAllCards,
  onAddCard,
  onRenameCard,
  onArchiveCard,
  onCardClick,
  onMoveListLeft,
  onMoveListRight,
  onMoveCardToTop,
  onMoveCardToBottom,
}: ListColumnProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState(list.title)
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false)

  const sortableData = useMemo(
    () => ({
      type: 'list' as const,
      listId: list._id,
    }),
    [list._id],
  )

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: list._id,
    data: sortableData,
    disabled: isEditingTitle || isDraggingOverlay,
  })

  const style = isDraggingOverlay
    ? undefined
    : {
        transform: CSS.Translate.toString(transform),
        transition,
      }

  const cardIds = useMemo(() => cards.map((c) => c._id), [cards])

  const handleTitleSubmit = () => {
    const trimmed = titleValue.trim()
    if (trimmed && trimmed !== list.title) {
      onRenameList?.(list._id, trimmed)
    } else {
      setTitleValue(list.title)
    }
    setIsEditingTitle(false)
  }

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="w-[85vw] sm:w-80 md:w-84 shrink-0 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 min-h-[300px] max-h-[calc(100vh-140px)] transition-all duration-200"
      />
    )
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`group/col flex max-h-[calc(100vh-140px)] w-[85vw] sm:w-80 md:w-84 shrink-0 flex-col rounded-2xl border border-border/70 bg-muted/55 dark:bg-muted/30 shadow-2xs backdrop-blur-sm transition-shadow ${
          isDraggingOverlay
            ? 'ring-2 ring-primary/40 shadow-2xl bg-card/95 backdrop-blur-none cursor-grabbing'
            : ''
        }`}
      >
        {/* Sticky Column Header - Entire Header acts as Drag Handle */}
        <div
          {...(!isEditingTitle && !isDraggingOverlay
            ? { ...attributes, ...listeners }
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
                aria-label={`Edit title for ${list.title}`}
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
                className="w-full rounded-md border border-ring bg-background px-2 py-0.5 font-heading text-base font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 break-all cursor-text"
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
              {cards.length}
            </span>

            {!isDraggingOverlay && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    aria-label={`Actions for ${list.title}`}
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
                    className="text-sm cursor-pointer"
                  >
                    <Plus className="mr-2 size-3.5" />
                    <span>Add card...</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setIsEditingTitle(true)}
                    className="text-sm cursor-pointer"
                  >
                    <Edit2 className="mr-2 size-3.5" />
                    <span>Rename list</span>
                  </DropdownMenuItem>

                  {(onMoveListLeft || onMoveListRight) && (
                    <>
                      <DropdownMenuSeparator />
                      {onMoveListLeft && (
                        <DropdownMenuItem
                          disabled={isFirst}
                          onClick={() => onMoveListLeft(list._id)}
                          className="text-sm cursor-pointer"
                        >
                          <ArrowLeft className="mr-2 size-3.5" />
                          <span>Move list left</span>
                        </DropdownMenuItem>
                      )}
                      {onMoveListRight && (
                        <DropdownMenuItem
                          disabled={isLast}
                          onClick={() => onMoveListRight(list._id)}
                          className="text-sm cursor-pointer"
                        >
                          <ArrowRight className="mr-2 size-3.5" />
                          <span>Move list right</span>
                        </DropdownMenuItem>
                      )}
                    </>
                  )}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    disabled={cards.length === 0}
                    onClick={() => setIsArchiveDialogOpen(true)}
                    className="text-sm cursor-pointer"
                  >
                    <FolderArchive className="mr-2 size-3.5" />
                    <span>Archive all cards</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    className="text-sm cursor-pointer"
                    onClick={() => onDeleteList?.(list)}
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
        <div className="flex-1 overflow-y-auto px-2.5 py-2 flex flex-col gap-2 min-h-[60px] scrollbar-thin">
          {isDraggingOverlay ? (
            cards.map((card) => (
              <CardItem
                key={card._id}
                card={card}
                labels={cardLabelsMap[card._id]}
                assignees={cardAssigneesMap[card._id]}
                commentsCount={cardCommentsCountMap[card._id]}
                isDraggingOverlay
              />
            ))
          ) : (
            <SortableContext
              items={cardIds}
              strategy={verticalListSortingStrategy}
            >
              {cards.map((card) => (
                <CardItem
                  key={card._id}
                  card={card}
                  labels={cardLabelsMap[card._id]}
                  assignees={cardAssigneesMap[card._id]}
                  commentsCount={cardCommentsCountMap[card._id]}
                  onRenameCard={onRenameCard}
                  onArchiveCard={onArchiveCard}
                  onCardClick={onCardClick}
                  onMoveToTop={onMoveCardToTop}
                  onMoveToBottom={onMoveCardToBottom}
                />
              ))}
            </SortableContext>
          )}

          {cards.length === 0 && (
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
              onAddCard={(title) => onAddCard?.(list._id, title)}
            />
          </div>
        )}
      </div>

      {/* Archive All Cards Confirmation Dialog */}
      <ArchiveListDialog
        list={list}
        cardCount={cards.length}
        isOpen={isArchiveDialogOpen}
        onClose={() => setIsArchiveDialogOpen(false)}
        onConfirm={() => onArchiveAllCards?.(list._id)}
      />
    </>
  )
})
