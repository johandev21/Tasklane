import { User, Tag, Clock, MoveRight, Archive, Check } from 'lucide-react'
import { Input } from '#/components/ui/input'
import { Button } from '#/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { LABEL_COLORS } from '../../constants'
import type { BoardData, CardItem, Label } from '#/components/prototype/types'

export interface CardModalActionsProps {
  card: CardItem
  board: BoardData
  onUpdateCard: (patch: Partial<CardItem>) => void
  onToggleLabel: (label: Label) => void
  onToggleAssignee: (memberId: string) => void
  onMoveToList: (listId: string) => void
  onArchive: () => void
}

export function CardModalActions({
  card,
  board,
  onUpdateCard,
  onToggleLabel,
  onToggleAssignee,
  onMoveToList,
  onArchive,
}: CardModalActionsProps) {
  const formatForInput = (iso?: string) => {
    if (!iso) return ''
    try {
      const d = new Date(iso)
      return d.toISOString().slice(0, 16)
    } catch {
      return ''
    }
  }

  const handleDueDateChange = (val: string) => {
    if (!val) {
      onUpdateCard({ dueDate: undefined, isOverdue: false })
      return
    }
    try {
      const parsed = new Date(val).toISOString()
      const overdue = new Date(parsed).getTime() < Date.now()
      onUpdateCard({ dueDate: parsed, isOverdue: overdue })
    } catch {
      // ignore invalid input
    }
  }

  return (
    <div className="space-y-5">
      {/* Group 1: Add to Card */}
      <div className="space-y-1.5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1 mb-1">
          Add to card
        </h4>

        {/* Members / Assignees Popover */}
        <Popover modal={true}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg bg-muted/60 hover:bg-muted px-3 py-1.5 text-sm font-medium text-foreground transition-colors text-left"
            >
              <User className="size-4 text-muted-foreground" />
              <span>Members</span>
              {card.assigneeIds.length > 0 && (
                <span className="ml-auto text-xs text-muted-foreground font-mono">
                  {card.assigneeIds.length}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-3 space-y-2">
            <div className="text-sm font-semibold text-foreground">
              Assign Members
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {board.members.map((m) => {
                const isAssigned = card.assigneeIds.includes(m.id)
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onToggleAssignee(m.id)}
                    className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm text-left transition-colors ${
                      isAssigned
                        ? 'bg-primary/15 text-primary font-medium'
                        : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={m.avatarUrl}
                        alt={m.name}
                        className="size-5 rounded-full object-cover shrink-0"
                      />
                      <span className="truncate break-all">{m.name}</span>
                    </div>
                    {isAssigned && (
                      <Check className="size-3.5 text-primary shrink-0 ml-1" />
                    )}
                  </button>
                )
              })}
            </div>
          </PopoverContent>
        </Popover>

        {/* Labels Popover */}
        <Popover modal={true}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg bg-muted/60 hover:bg-muted px-3 py-1.5 text-sm font-medium text-foreground transition-colors text-left"
            >
              <Tag className="size-4 text-muted-foreground" />
              <span>Labels</span>
              {card.labels.length > 0 && (
                <span className="ml-auto text-xs text-muted-foreground font-mono">
                  {card.labels.length}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-3 space-y-2">
            <div className="text-sm font-semibold text-foreground">
              Board Labels
            </div>
            <div className="space-y-1 max-h-52 overflow-y-auto">
              {board.labels.map((lbl) => {
                const colorDef = LABEL_COLORS[lbl.color]
                const isSelected = card.labels.some((l) => l.id === lbl.id)

                return (
                  <button
                    key={lbl.id}
                    type="button"
                    onClick={() => onToggleLabel(lbl)}
                    className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors text-left ${
                      isSelected
                        ? `${colorDef.badgeClass} font-semibold`
                        : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate break-all">{lbl.name}</span>
                    </div>
                    {isSelected && (
                      <Check className="size-3.5 text-primary shrink-0 ml-1" />
                    )}
                  </button>
                )
              })}
            </div>
          </PopoverContent>
        </Popover>

        {/* Dates Popover */}
        <Popover modal={true}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg bg-muted/60 hover:bg-muted px-3 py-1.5 text-sm font-medium text-foreground transition-colors text-left"
            >
              <Clock className="size-4 text-muted-foreground" />
              <span>Dates</span>
              {card.dueDate && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date(card.dueDate).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-3 space-y-2.5">
            <div className="text-sm font-semibold text-foreground">
              Set Due Date
            </div>
            <Input
              type="datetime-local"
              value={formatForInput(card.dueDate)}
              onChange={(e) => handleDueDateChange(e.target.value)}
              className="text-sm h-8 bg-background"
            />
            {card.dueDate && (
              <Button
                variant="outline"
                size="xs"
                className="w-full text-destructive hover:bg-destructive/10 text-xs"
                onClick={() =>
                  onUpdateCard({ dueDate: undefined, isOverdue: false })
                }
              >
                Clear due date
              </Button>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Group 2: Actions */}
      <div className="space-y-1.5 pt-2 border-t border-border/40">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1 mb-1">
          Actions
        </h4>

        {/* Move Card Dropdown (Accessible keyboard/alternative to drag-and-drop) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg bg-muted/60 hover:bg-muted px-3 py-1.5 text-sm font-medium text-foreground transition-colors text-left"
            >
              <MoveRight className="size-4 text-muted-foreground" />
              <span>Move</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              Move to List:
            </div>
            {board.lists.map((l) => (
              <DropdownMenuItem
                key={l.id}
                onClick={() => onMoveToList(l.id)}
                className="text-sm flex items-center justify-between"
              >
                <span className="truncate break-all">{l.title}</span>
                {card.listId === l.id && (
                  <Check className="size-3.5 text-primary shrink-0" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Archive Card Action */}
        <button
          type="button"
          onClick={onArchive}
          className="flex w-full items-center gap-2 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive px-3 py-1.5 text-sm font-medium transition-colors text-left"
        >
          <Archive className="size-4" />
          <span>Archive</span>
        </button>
      </div>
    </div>
  )
}
