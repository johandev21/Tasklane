import { memo, useMemo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CardItemView } from './card-item-view'
import type { CardItem, Member } from '#/components/prototype/types'

export interface SortableCardItemProps {
  card: CardItem
  listId: string
  members: Member[]
  isLabelsExpanded?: boolean
  onToggleLabelsExpanded?: () => void
  onSelectCard: (id: string) => void
  onRenameCard: (id: string, title: string) => void
  onArchiveCard: (id: string) => void
}

export const SortableCardItem = memo(function SortableCardItem({
  card,
  listId,
  members,
  isLabelsExpanded,
  onToggleLabelsExpanded,
  onSelectCard,
  onRenameCard,
  onArchiveCard,
}: SortableCardItemProps) {
  const data = useMemo(
    () => ({
      type: 'card' as const,
      cardId: card.id,
      listId,
    }),
    [card.id, listId],
  )

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
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
        className="h-20 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 opacity-50"
      />
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onSelectCard(card.id)}
      className="cursor-pointer focus:outline-none"
    >
      <CardItemView
        card={card}
        members={members}
        isLabelsExpanded={isLabelsExpanded}
        onToggleLabelsExpanded={onToggleLabelsExpanded}
        onRenameCard={onRenameCard}
        onArchiveCard={onArchiveCard}
      />
    </div>
  )
})
