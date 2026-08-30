import { useState } from 'react'
import { Plus, Tag, ChevronLeft, Check, Users, Crown } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/shared/components/ui/popover.tsx'
import { Button } from '#/shared/components/ui/button.tsx'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '#/shared/components/ui/avatar.tsx'
import { Input } from '#/shared/components/ui/input.tsx'
import { Badge } from '#/shared/components/ui/badge.tsx'
import { getLabelColor } from '#/features/board/utils/label-colors.ts'
import { getInitials } from '#/features/board/utils/board-transforms.ts'

import type {
  BoardMemberUser,
  LabelDoc,
} from '#/features/board/types/board.types.ts'

export interface CardModalAddPopoverProps {
  boardLabels: LabelDoc[]
  cardLabels: LabelDoc[]
  boardMembers?: BoardMemberUser[]
  cardAssignees?: BoardMemberUser[]
  onToggleLabel: (label: LabelDoc) => void
  onToggleAssignee?: (userId: string) => void
  trigger?: React.ReactNode
}

export function CardModalAddPopover({
  boardLabels,
  cardLabels,
  boardMembers = [],
  cardAssignees = [],
  onToggleLabel,
  onToggleAssignee,
  trigger,
}: CardModalAddPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentView, setCurrentView] = useState<'menu' | 'labels' | 'members'>(
    'menu',
  )

  const handleOpenChange = (next: boolean) => {
    setIsOpen(next)
    if (!next) {
      setCurrentView('menu')
    }
  }

  return (
    <Popover modal={true} open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 rounded-lg text-xs font-medium h-8 px-3 shadow-2xs cursor-pointer"
          >
            <Plus className="size-3.5" />
            <span>Add</span>
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-80 p-3.5 space-y-3 max-h-[var(--radix-popover-content-available-height,420px)] overflow-y-auto"
      >
        {currentView === 'menu' && (
          <AddPopoverMainMenu
            onSelectLabels={() => setCurrentView('labels')}
            onSelectMembers={() => setCurrentView('members')}
          />
        )}

        {currentView === 'labels' && (
          <AddPopoverLabelsView
            boardLabels={boardLabels}
            cardLabels={cardLabels}
            onBack={() => setCurrentView('menu')}
            onToggleLabel={onToggleLabel}
          />
        )}

        {currentView === 'members' && (
          <AddPopoverMembersView
            boardMembers={boardMembers}
            cardAssignees={cardAssignees}
            onBack={() => setCurrentView('menu')}
            onToggleAssignee={onToggleAssignee}
          />
        )}
      </PopoverContent>
    </Popover>
  )
}

function AddPopoverMainMenu({
  onSelectLabels,
  onSelectMembers,
}: {
  onSelectLabels: () => void
  onSelectMembers: () => void
}) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 pb-1">
        Add to card
      </div>

      <button
        type="button"
        onClick={onSelectLabels}
        className="flex w-full items-start gap-3 rounded-xl p-2 text-left hover:bg-muted/70 transition-colors group cursor-pointer"
      >
        <div className="rounded-lg border border-border bg-muted/40 p-2 text-muted-foreground group-hover:text-foreground shrink-0 mt-0.5">
          <Tag className="size-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground">Labels</div>
          <p className="text-xs text-muted-foreground leading-snug">
            Apply color markers from board palette
          </p>
        </div>
      </button>

      <button
        type="button"
        onClick={onSelectMembers}
        className="flex w-full items-start gap-3 rounded-xl p-2 text-left hover:bg-muted/70 transition-colors group cursor-pointer"
      >
        <div className="rounded-lg border border-border bg-muted/40 p-2 text-muted-foreground group-hover:text-foreground shrink-0 mt-0.5">
          <Users className="size-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground">Members</div>
          <p className="text-xs text-muted-foreground leading-snug">
            Assign team members to this card
          </p>
        </div>
      </button>
    </div>
  )
}

interface AddPopoverLabelsViewProps {
  boardLabels: LabelDoc[]
  cardLabels: LabelDoc[]
  onBack: () => void
  onToggleLabel: (label: LabelDoc) => void
}

function AddPopoverLabelsView({
  boardLabels,
  cardLabels,
  onBack,
  onToggleLabel,
}: AddPopoverLabelsViewProps) {
  return (
    <div className="space-y-2.5">
      <AddPopoverHeader title="Labels" onBack={onBack} />

      <div className="space-y-1.5 max-h-60 overflow-y-auto p-0.5">
        {boardLabels.map((lbl) => {
          const colorDef = getLabelColor(lbl.color)
          const isSelected = cardLabels.some((l) => l._id === lbl._id)

          return (
            <button
              key={lbl._id}
              type="button"
              onClick={() => onToggleLabel(lbl)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors text-left cursor-pointer ${
                isSelected
                  ? `border ${colorDef.badgeClass} font-semibold shadow-2xs`
                  : 'hover:bg-muted/70 text-foreground border border-border/40'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span className="truncate break-all">{lbl.name}</span>
              </div>
              {isSelected && (
                <Check className="size-4 text-foreground shrink-0 ml-1.5" />
              )}
            </button>
          )
        })}

        {boardLabels.length === 0 && (
          <p className="text-xs text-muted-foreground italic py-3 text-center">
            No labels in this board&apos;s palette.
          </p>
        )}
      </div>
    </div>
  )
}

interface AddPopoverMembersViewProps {
  boardMembers: BoardMemberUser[]
  cardAssignees: BoardMemberUser[]
  onBack: () => void
  onToggleAssignee?: (userId: string) => void
}

function AddPopoverMembersView({
  boardMembers,
  cardAssignees,
  onBack,
  onToggleAssignee,
}: AddPopoverMembersViewProps) {
  const [memberSearchQuery, setMemberSearchQuery] = useState('')

  const filteredMembers = boardMembers.filter((m) => {
    if (!memberSearchQuery.trim()) return true
    const query = memberSearchQuery.toLowerCase()
    return (
      m.name.toLowerCase().includes(query) ||
      m.email.toLowerCase().includes(query)
    )
  })

  return (
    <div className="space-y-2.5">
      <AddPopoverHeader title="Assign Members" onBack={onBack} />

      {boardMembers.length > 5 && (
        <Input
          aria-label="Filter members"
          placeholder="Filter members..."
          value={memberSearchQuery}
          onChange={(e) => setMemberSearchQuery(e.target.value)}
          className="h-8 text-xs"
        />
      )}

      <div className="flex flex-col gap-1 max-h-60 overflow-y-auto p-0.5">
        {filteredMembers.map((member) => {
          const isAssigned = cardAssignees.some(
            (a) => a.userId === member.userId,
          )

          return (
            <button
              key={member.userId}
              type="button"
              onClick={() => onToggleAssignee?.(member.userId)}
              className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors text-left cursor-pointer ${
                isAssigned
                  ? 'border border-primary/50 bg-primary/10 text-primary font-medium shadow-2xs'
                  : 'border border-transparent bg-transparent text-foreground hover:bg-muted/70'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <Avatar className="size-6 shrink-0 border-none">
                  <AvatarImage src={member.imageUrl} alt={member.name} />
                  <AvatarFallback className="text-[10px] font-semibold bg-primary/15 text-primary">
                    {getInitials(member.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate break-all font-medium text-foreground">
                      {member.name}
                    </span>
                    {member.isOwner && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1 py-0 h-4 gap-0.5 font-normal shrink-0"
                      >
                        <Crown className="size-2.5" />
                        <span>Owner</span>
                      </Badge>
                    )}
                  </div>
                  {member.email && (
                    <span className="text-[11px] text-muted-foreground truncate">
                      {member.email}
                    </span>
                  )}
                </div>
              </div>
              {isAssigned && (
                <Check className="size-4 text-primary shrink-0 ml-1.5" />
              )}
            </button>
          )
        })}

        {filteredMembers.length === 0 && (
          <p className="text-xs text-muted-foreground italic py-3 text-center">
            No board members found.
          </p>
        )}
      </div>
    </div>
  )
}

function AddPopoverHeader({
  title,
  onBack,
}: {
  title: string
  onBack: () => void
}) {
  return (
    <div className="flex items-center gap-1.5 pb-0.5 border-b border-border/40">
      <button
        type="button"
        onClick={onBack}
        className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
        title="Back"
      >
        <ChevronLeft className="size-4" />
      </button>
      <div className="text-sm font-semibold text-foreground">{title}</div>
    </div>
  )
}
