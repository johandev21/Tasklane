import { useState } from 'react'
import { Plus, Tag, ChevronLeft, Check, Users, Crown } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Badge } from '#/components/ui/badge.tsx'
import { getLabelColor } from '../../labels/label-colors.ts'
import type { BoardMemberUser, LabelDoc } from '../../types.ts'

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0 || !parts[0]) return '?'
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

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
  const [memberSearchQuery, setMemberSearchQuery] = useState('')

  const handleOpenChange = (next: boolean) => {
    setIsOpen(next)
    if (!next) {
      setCurrentView('menu')
      setMemberSearchQuery('')
    }
  }

  const filteredMembers = boardMembers.filter((m) => {
    if (!memberSearchQuery.trim()) return true
    const query = memberSearchQuery.toLowerCase()
    return (
      m.name.toLowerCase().includes(query) ||
      m.email.toLowerCase().includes(query)
    )
  })

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
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
        {/* Main Menu View */}
        {currentView === 'menu' && (
          <div className="space-y-1">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 pb-1">
              Add to card
            </div>

            {/* Labels Item */}
            <button
              type="button"
              onClick={() => setCurrentView('labels')}
              className="flex w-full items-start gap-3 rounded-xl p-2 text-left hover:bg-muted/70 transition-colors group cursor-pointer"
            >
              <div className="rounded-lg border border-border bg-muted/40 p-2 text-muted-foreground group-hover:text-foreground shrink-0 mt-0.5">
                <Tag className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">
                  Labels
                </div>
                <p className="text-xs text-muted-foreground leading-snug">
                  Apply color markers from board palette
                </p>
              </div>
            </button>

            {/* Members Item */}
            <button
              type="button"
              onClick={() => setCurrentView('members')}
              className="flex w-full items-start gap-3 rounded-xl p-2 text-left hover:bg-muted/70 transition-colors group cursor-pointer"
            >
              <div className="rounded-lg border border-border bg-muted/40 p-2 text-muted-foreground group-hover:text-foreground shrink-0 mt-0.5">
                <Users className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">
                  Members
                </div>
                <p className="text-xs text-muted-foreground leading-snug">
                  Assign team members to this card
                </p>
              </div>
            </button>
          </div>
        )}

        {/* Labels View */}
        {currentView === 'labels' && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 pb-0.5 border-b border-border/40">
              <button
                type="button"
                onClick={() => setCurrentView('menu')}
                className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                title="Back"
              >
                <ChevronLeft className="size-4" />
              </button>
              <div className="text-sm font-semibold text-foreground">
                Labels
              </div>
            </div>

            <div className="space-y-1.5 max-h-60 overflow-y-auto p-0.5">
              {boardLabels.map((lbl) => {
                const colorDef = getLabelColor(lbl.color)
                const isSelected = cardLabels.some((l) => l._id === lbl._id)

                return (
                  <button
                    key={lbl._id}
                    type="button"
                    onClick={() => onToggleLabel(lbl)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-all text-left cursor-pointer ${
                      isSelected
                        ? `${colorDef.badgeClass} font-semibold ring-1 ring-inset ring-foreground/25 shadow-2xs`
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

              {boardLabels.length === 0 && (
                <p className="text-xs text-muted-foreground italic py-3 text-center">
                  No labels in this board&apos;s palette.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Members View */}
        {currentView === 'members' && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 pb-0.5 border-b border-border/40">
              <button
                type="button"
                onClick={() => setCurrentView('menu')}
                className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                title="Back"
              >
                <ChevronLeft className="size-4" />
              </button>
              <div className="text-sm font-semibold text-foreground">
                Assign Members
              </div>
            </div>

            {boardMembers.length > 5 && (
              <Input
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
                    className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-all text-left cursor-pointer ${
                      isAssigned
                        ? 'border border-primary/50 bg-primary/10 text-primary font-medium ring-1 ring-primary/20'
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
        )}
      </PopoverContent>
    </Popover>
  )
}
