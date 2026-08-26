import { Plus, ChevronDown, Flame } from 'lucide-react'
import { CardModalTopBar } from './sections/card-modal-top-bar'
import { CardModalTitle } from './sections/card-modal-title'
import { CardModalAddPopover } from './sections/card-modal-add-popover'
import { CardModalDescription } from './sections/card-modal-description'
import { CardModalComments } from './sections/card-modal-comments'
import { LABEL_COLORS } from '../constants'
import type {
  BoardData,
  CardItem,
  Label,
  Member,
} from '#/components/prototype/types'

export interface CardDetailModalContentProps {
  card: CardItem
  board: BoardData
  currentUserId: string
  onUpdateCard: (patch: Partial<CardItem>) => void
  onToggleLabel: (label: Label) => void
  onToggleAssignee: (memberId: string) => void
  onAddComment: (text: string) => void
  onEditComment: (commentId: string, newText: string) => void
  onDeleteComment: (commentId: string) => void
  onMoveCardToList: (targetListId: string) => void
  onArchiveCard: () => void
  onClose: () => void
}

export function CardDetailModalContent({
  card,
  board,
  currentUserId,
  onUpdateCard,
  onToggleLabel,
  onToggleAssignee,
  onAddComment,
  onEditComment,
  onDeleteComment,
  onMoveCardToList,
  onArchiveCard,
  onClose,
}: CardDetailModalContentProps) {
  const currentList = board.lists.find((l) => l.id === card.listId)

  const cardMembers = card.assigneeIds
    .map((id) => board.members.find((m) => m.id === id))
    .filter((m): m is Member => Boolean(m))

  const handleUpdateDueDate = (date: string | undefined, overdue: boolean) => {
    onUpdateCard({ dueDate: date, isOverdue: overdue })
  }

  const hasMetadata =
    cardMembers.length > 0 || card.labels.length > 0 || Boolean(card.dueDate)

  return (
    <div className="flex flex-col h-full min-h-0 bg-card select-none">
      {/* 1. Header Bar: Trello-style List Switcher + Archive + Close */}
      <CardModalTopBar
        currentList={currentList}
        allLists={board.lists}
        onMoveToList={onMoveCardToList}
        onArchive={onArchiveCard}
        onClose={onClose}
      />

      {/* 2. Main Two-Column Layout */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
        {/* Left Column: Card Details (~58-60% width) */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-6 select-text">
          {/* Card Title with Status Circle */}
          <CardModalTitle
            title={card.title}
            onSaveTitle={(newTitle) => onUpdateCard({ title: newTitle })}
          />

          {/* Quick Action Toolbar: "+ Add" Button */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CardModalAddPopover
                card={card}
                board={board}
                onToggleLabel={onToggleLabel}
                onToggleAssignee={onToggleAssignee}
                onUpdateDueDate={handleUpdateDueDate}
              />
            </div>

            {/* Inline Active Metadata Grid (Members, Labels, Due Date) */}
            {hasMetadata && (
              <div className="flex flex-wrap items-start gap-6 pt-1">
                {/* Members Section */}
                {cardMembers.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-muted-foreground block">
                      Members
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {cardMembers.map((m) => (
                        <img
                          key={m.id}
                          src={m.avatarUrl}
                          alt={m.name}
                          title={m.name}
                          className="size-7 rounded-full object-cover ring-1 ring-border shadow-2xs"
                        />
                      ))}
                      <CardModalAddPopover
                        card={card}
                        board={board}
                        initialView="members"
                        onToggleLabel={onToggleLabel}
                        onToggleAssignee={onToggleAssignee}
                        onUpdateDueDate={handleUpdateDueDate}
                        trigger={
                          <button
                            type="button"
                            className="size-7 rounded-full border border-dashed border-border/80 hover:border-foreground/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                            title="Add member"
                          >
                            <Plus className="size-3.5" />
                          </button>
                        }
                      />
                    </div>
                  </div>
                )}

                {/* Labels Section */}
                {card.labels.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-muted-foreground block">
                      Labels
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {card.labels.map((lbl) => {
                        const colorDef = LABEL_COLORS[lbl.color]
                        return (
                          <span
                            key={lbl.id}
                            className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium border ${colorDef.badgeClass}`}
                          >
                            <span className="break-all">{lbl.name}</span>
                          </span>
                        )
                      })}
                      <CardModalAddPopover
                        card={card}
                        board={board}
                        initialView="labels"
                        onToggleLabel={onToggleLabel}
                        onToggleAssignee={onToggleAssignee}
                        onUpdateDueDate={handleUpdateDueDate}
                        trigger={
                          <button
                            type="button"
                            className="size-7 rounded-md border border-dashed border-border/80 hover:border-foreground/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                            title="Add label"
                          >
                            <Plus className="size-3.5" />
                          </button>
                        }
                      />
                    </div>
                  </div>
                )}

                {/* Due Date Section */}
                {card.dueDate && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-muted-foreground block">
                      Due date
                    </span>
                    <CardModalAddPopover
                      card={card}
                      board={board}
                      initialView="dates"
                      onToggleLabel={onToggleLabel}
                      onToggleAssignee={onToggleAssignee}
                      onUpdateDueDate={handleUpdateDueDate}
                      trigger={
                        <button
                          type="button"
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm font-medium transition-colors ${
                            card.isOverdue
                              ? 'bg-red-500/15 border-red-300 dark:border-red-700/60 text-red-600 dark:text-red-400'
                              : 'bg-muted/30 border-border/80 hover:bg-muted/70 text-foreground'
                          }`}
                        >
                          <span>
                            {new Date(card.dueDate).toLocaleDateString(
                              undefined,
                              {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              },
                            )}
                          </span>
                          {card.isOverdue && (
                            <span className="rounded bg-red-600 px-1 py-0.2 text-xs font-bold text-white uppercase flex items-center gap-0.5">
                              <Flame className="size-3" />
                              Overdue
                            </span>
                          )}
                          <ChevronDown className="size-3.5 text-muted-foreground" />
                        </button>
                      }
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Description Section */}
          <div className="pt-2">
            <CardModalDescription
              description={card.description || ''}
              onSaveDescription={(desc) => onUpdateCard({ description: desc })}
            />
          </div>
        </div>

        {/* Right Column: Comments & Activity (~42% width) */}
        <div className="w-full md:w-[42%] lg:w-[400px] shrink-0 bg-muted/25 dark:bg-muted/10 p-5 overflow-y-auto select-text">
          <CardModalComments
            cardTitle={card.title}
            comments={card.comments}
            activity={board.activity}
            members={board.members}
            currentUserId={currentUserId}
            onAddComment={onAddComment}
            onEditComment={onEditComment}
            onDeleteComment={onDeleteComment}
          />
        </div>
      </div>
    </div>
  )
}
