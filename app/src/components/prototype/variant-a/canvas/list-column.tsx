import { memo, useMemo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ListColumnView } from './list-column-view'
import type { CardItem, ListItem, Member } from '#/components/prototype/types'

export interface ListColumnProps {
  list: ListItem
  cards: Record<string, CardItem | undefined>
  members: Member[]
  isLabelsExpanded: boolean
  onToggleLabelsExpanded: () => void
  onSelectCard: (id: string) => void
  onRenameList: (id: string, title: string) => void
  onDeleteList: (id: string) => void
  onArchiveAllCards: (id: string) => void
  onAddCard: (listId: string, title: string) => void
  onRenameCard: (id: string, title: string) => void
  onArchiveCard: (id: string) => void
}

export const SortableListColumn = memo(function SortableListColumn({
  list,
  cards,
  members,
  isLabelsExpanded,
  onToggleLabelsExpanded,
  onSelectCard,
  onRenameList,
  onDeleteList,
  onArchiveAllCards,
  onAddCard,
  onRenameCard,
  onArchiveCard,
}: ListColumnProps) {
  const data = useMemo(
    () => ({
      type: 'list' as const,
      listId: list.id,
    }),
    [list.id],
  )

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: list.id,
    data,
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
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
    <div
      ref={setNodeRef}
      style={style}
      className="shrink-0 transition-transform duration-200 ease-out will-change-transform"
    >
      <ListColumnView
        list={list}
        cards={cards}
        members={members}
        isLabelsExpanded={isLabelsExpanded}
        onToggleLabelsExpanded={onToggleLabelsExpanded}
        onSelectCard={onSelectCard}
        onRenameList={onRenameList}
        onDeleteList={onDeleteList}
        onArchiveAllCards={onArchiveAllCards}
        onAddCard={onAddCard}
        onRenameCard={onRenameCard}
        onArchiveCard={onArchiveCard}
        dragHandleProps={attributes}
        dragHandleListeners={listeners}
      />
    </div>
  )
})

export { SortableListColumn as ListColumn }
