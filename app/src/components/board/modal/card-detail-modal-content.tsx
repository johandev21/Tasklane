import { CardModalTopBar } from './sections/card-modal-top-bar.tsx'
import { CardModalTitle } from './sections/card-modal-title.tsx'
import { CardModalAssignees } from './sections/card-modal-assignees.tsx'
import { CardModalLabels } from './sections/card-modal-labels.tsx'
import { CardModalDueDate } from './sections/card-modal-due-date.tsx'
import { CardModalDescription } from './sections/card-modal-description.tsx'
import { CardModalAddPopover } from './sections/card-modal-add-popover.tsx'
import type { BoardMemberUser, CardDoc, ListDoc, LabelDoc } from '../types.ts'

export interface CardDetailModalContentProps {
  card: CardDoc
  lists: ListDoc[]
  boardLabels?: LabelDoc[]
  cardLabels?: LabelDoc[]
  boardMembers?: BoardMemberUser[]
  cardAssignees?: BoardMemberUser[]
  onSaveTitle: (title: string) => void
  onSaveDescription: (description: string) => void
  onUpdateDueDate: (dueDate: number | undefined) => void
  onMoveToList: (listId: ListDoc['_id']) => void
  onArchive: () => void
  onClose: () => void
  onToggleLabel?: (label: LabelDoc) => void
  onToggleAssignee?: (userId: string) => void
}

export function CardDetailModalContent({
  card,
  lists,
  boardLabels = [],
  cardLabels = [],
  boardMembers = [],
  cardAssignees = [],
  onSaveTitle,
  onSaveDescription,
  onUpdateDueDate,
  onMoveToList,
  onArchive,
  onClose,
  onToggleLabel,
  onToggleAssignee,
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
        {/* Card Title Editor with Quick Add Popover */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardModalTitle title={card.title} onSaveTitle={onSaveTitle} />
          </div>
          <CardModalAddPopover
            boardLabels={boardLabels}
            cardLabels={cardLabels}
            boardMembers={boardMembers}
            cardAssignees={cardAssignees}
            onToggleLabel={(label) => onToggleLabel?.(label)}
            onToggleAssignee={onToggleAssignee}
          />
        </div>

        {/* Assignees Section */}
        <div className="pt-1">
          <CardModalAssignees
            boardMembers={boardMembers}
            cardAssignees={cardAssignees}
            onToggleAssignee={onToggleAssignee}
          />
        </div>

        {/* Labels Section */}
        <div className="pt-2 border-t border-border/40">
          <CardModalLabels
            boardLabels={boardLabels}
            cardLabels={cardLabels}
            onToggleLabel={(label) => onToggleLabel?.(label)}
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
