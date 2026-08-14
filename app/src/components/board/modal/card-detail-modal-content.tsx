import { CardModalTopBar } from './sections/card-modal-top-bar.tsx'
import { CardModalTitle } from './sections/card-modal-title.tsx'
import { CardModalLabels } from './sections/card-modal-labels.tsx'
import { CardModalDueDate } from './sections/card-modal-due-date.tsx'
import { CardModalDescription } from './sections/card-modal-description.tsx'
import type { CardDoc, ListDoc, LabelDoc } from '../types.ts'

export interface CardDetailModalContentProps {
  card: CardDoc
  lists: ListDoc[]
  boardLabels?: LabelDoc[]
  cardLabels?: LabelDoc[]
  isOwner?: boolean
  onSaveTitle: (title: string) => void
  onSaveDescription: (description: string) => void
  onUpdateDueDate: (dueDate: number | undefined) => void
  onMoveToList: (listId: ListDoc['_id']) => void
  onArchive: () => void
  onClose: () => void
  onToggleLabel?: (label: LabelDoc) => void
  onCreateLabel?: (name: string, color: string) => Promise<void> | void
  onUpdateLabel?: (
    labelId: LabelDoc['_id'],
    name?: string,
    color?: string,
  ) => Promise<void> | void
  onRemoveLabel?: (labelId: LabelDoc['_id']) => Promise<void> | void
}

export function CardDetailModalContent({
  card,
  lists,
  boardLabels = [],
  cardLabels = [],
  isOwner = false,
  onSaveTitle,
  onSaveDescription,
  onUpdateDueDate,
  onMoveToList,
  onArchive,
  onClose,
  onToggleLabel,
  onCreateLabel,
  onUpdateLabel,
  onRemoveLabel,
}: CardDetailModalContentProps) {
  const currentList = lists.find((l) => l._id === card.listId)

  return (
    <div className="flex flex-col h-full min-h-0 bg-card select-none">
      {/* 1. Header Bar: List Switcher + Archive + Close */}
      <CardModalTopBar
        currentList={currentList}
        allLists={lists}
        onMoveToList={onMoveToList}
        onArchive={onArchive}
        onClose={onClose}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 flex flex-col gap-6 select-text">
        {/* Card Title Editor */}
        <CardModalTitle title={card.title} onSaveTitle={onSaveTitle} />

        {/* Labels Section */}
        <div className="pt-1">
          <CardModalLabels
            boardLabels={boardLabels}
            cardLabels={cardLabels}
            isOwner={isOwner}
            onToggleLabel={(label) => onToggleLabel?.(label)}
            onCreateLabel={onCreateLabel}
            onUpdateLabel={onUpdateLabel}
            onRemoveLabel={onRemoveLabel}
          />
        </div>

        {/* Due Date Section */}
        <div className="pt-2 border-t border-border/40">
          <CardModalDueDate
            dueDate={card.dueDate}
            onUpdateDueDate={onUpdateDueDate}
          />
        </div>

        {/* Description Section */}
        <div className="pt-2 border-t border-border/40">
          <CardModalDescription
            description={card.description || ''}
            onSaveDescription={onSaveDescription}
          />
        </div>
      </div>
    </div>
  )
}
