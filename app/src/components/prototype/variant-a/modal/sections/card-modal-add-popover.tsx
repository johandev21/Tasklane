import { useState } from 'react'
import { Plus, Tag, Clock, User, ChevronLeft, Check, Flame } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { LABEL_COLORS } from '../../constants'
import type { BoardData, CardItem, Label } from '#/components/prototype/types'

export interface CardModalAddPopoverProps {
  card: CardItem
  board: BoardData
  onToggleLabel: (label: Label) => void
  onToggleAssignee: (memberId: string) => void
  onUpdateDueDate: (date: string | undefined, overdue: boolean) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  initialView?: 'menu' | 'labels' | 'dates' | 'members'
  trigger?: React.ReactNode
}

export function CardModalAddPopover({
  card,
  board,
  onToggleLabel,
  onToggleAssignee,
  onUpdateDueDate,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  initialView = 'menu',
  trigger,
}: CardModalAddPopoverProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [currentView, setCurrentView] = useState<
    'menu' | 'labels' | 'dates' | 'members'
  >(initialView)

  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : internalOpen
  const setIsOpen = (next: boolean) => {
    if (!next) setCurrentView(initialView)
    if (isControlled) {
      setControlledOpen?.(next)
    } else {
      setInternalOpen(next)
    }
  }

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
      onUpdateDueDate(undefined, false)
      return
    }
    try {
      const parsed = new Date(val).toISOString()
      const overdue = new Date(parsed).getTime() < Date.now()
      onUpdateDueDate(parsed, overdue)
    } catch {
      // ignore
    }
  }

  return (
    <Popover modal={false} open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button
            size="sm"
            className="gap-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-sm font-medium h-8 px-3 shadow-2xs"
          >
            <Plus className="size-4" />
            <span>Add</span>
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-72 p-3 space-y-3 max-h-[var(--radix-popover-content-available-height,360px)] overflow-y-auto overscroll-contain"
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        {/* Main Menu View */}
        {currentView === 'menu' && (
          <div className="space-y-1">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 pb-1">
              Add to card
            </div>

            {/* Labels Option */}
            <button
              type="button"
              onClick={() => setCurrentView('labels')}
              className="flex w-full items-start gap-3 rounded-xl p-2 text-left hover:bg-muted/70 transition-colors group"
            >
              <div className="rounded-lg border border-border bg-muted/40 p-2 text-muted-foreground group-hover:text-foreground shrink-0 mt-0.5">
                <Tag className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">
                  Labels
                </div>
                <p className="text-xs text-muted-foreground leading-snug">
                  Organize, categorize, and prioritize
                </p>
              </div>
            </button>

            {/* Dates Option */}
            <button
              type="button"
              onClick={() => setCurrentView('dates')}
              className="flex w-full items-start gap-3 rounded-xl p-2 text-left hover:bg-muted/70 transition-colors group"
            >
              <div className="rounded-lg border border-border bg-muted/40 p-2 text-muted-foreground group-hover:text-foreground shrink-0 mt-0.5">
                <Clock className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">Dates</div>
                <p className="text-xs text-muted-foreground leading-snug">
                  Start dates, due dates, and reminders
                </p>
              </div>
            </button>

            {/* Members Option */}
            <button
              type="button"
              onClick={() => setCurrentView('members')}
              className="flex w-full items-start gap-3 rounded-xl p-2 text-left hover:bg-muted/70 transition-colors group"
            >
              <div className="rounded-lg border border-border bg-muted/40 p-2 text-muted-foreground group-hover:text-foreground shrink-0 mt-0.5">
                <User className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">
                  Members
                </div>
                <p className="text-xs text-muted-foreground leading-snug">
                  Assign members
                </p>
              </div>
            </button>
          </div>
        )}

        {/* Sub-view: Labels */}
        {currentView === 'labels' && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 pb-0.5">
              <button
                type="button"
                onClick={() => setCurrentView('menu')}
                className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted"
                title="Back"
              >
                <ChevronLeft className="size-4" />
              </button>
              <div className="text-sm font-semibold text-foreground">
                Labels
              </div>
            </div>

            <div className="space-y-1.5 max-h-60 overflow-y-auto overscroll-contain p-1 pr-1.5">
              {board.labels.map((lbl) => {
                const colorDef = LABEL_COLORS[lbl.color]
                const isSelected = card.labels.some((l) => l.id === lbl.id)

                return (
                  <button
                    key={lbl.id}
                    type="button"
                    onClick={() => onToggleLabel(lbl)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-all text-left ${
                      isSelected
                        ? `${colorDef.badgeClass} font-semibold ring-1 ring-inset ring-foreground/25 shadow-xs`
                        : 'hover:bg-muted/70 text-foreground border border-border/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span
                        className={`size-2.5 rounded-full ${colorDef.dotClass} shrink-0`}
                      />
                      <span className="truncate break-all">{lbl.name}</span>
                    </div>
                    {isSelected && (
                      <Check className="size-4 text-foreground shrink-0 ml-1.5" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Sub-view: Dates */}
        {currentView === 'dates' && (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 pb-0.5">
              <button
                type="button"
                onClick={() => setCurrentView('menu')}
                className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted"
                title="Back"
              >
                <ChevronLeft className="size-4" />
              </button>
              <div className="text-sm font-semibold text-foreground">
                Due Date
              </div>
            </div>

            <Input
              type="datetime-local"
              value={formatForInput(card.dueDate)}
              onChange={(e) => handleDueDateChange(e.target.value)}
              className="text-sm h-9 bg-background"
            />

            {card.dueDate && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {card.isOverdue && (
                    <span className="rounded bg-red-600 px-1.5 py-0.5 text-xs font-bold text-white uppercase flex items-center gap-1">
                      <Flame className="size-3" /> Overdue
                    </span>
                  )}
                  <span>
                    Due{' '}
                    {new Date(card.dueDate).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUpdateDueDate(undefined, false)}
                  className="w-full text-destructive hover:bg-destructive/10 text-xs h-7"
                >
                  Clear due date
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Sub-view: Members */}
        {currentView === 'members' && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 pb-0.5">
              <button
                type="button"
                onClick={() => setCurrentView('menu')}
                className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted"
                title="Back"
              >
                <ChevronLeft className="size-4" />
              </button>
              <div className="text-sm font-semibold text-foreground">
                Assign Members
              </div>
            </div>

            <div className="space-y-1.5 max-h-60 overflow-y-auto overscroll-contain p-1 pr-1.5">
              {board.members.map((m) => {
                const isAssigned = card.assigneeIds.includes(m.id)

                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onToggleAssignee(m.id)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-left transition-all ${
                      isAssigned
                        ? 'bg-primary/15 text-primary font-medium ring-1 ring-inset ring-primary/40'
                        : 'hover:bg-muted/70 text-foreground border border-border/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <img
                        src={m.avatarUrl}
                        alt={m.name}
                        className="size-6 rounded-full object-cover shrink-0 ring-1 ring-border"
                      />
                      <span className="truncate break-all">{m.name}</span>
                    </div>
                    {isAssigned && (
                      <Check className="size-4 text-primary shrink-0 ml-1.5" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
