import { useState } from 'react'
import { Users, Plus, Check, Crown } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Badge } from '#/components/ui/badge.tsx'
import type { BoardMemberUser } from '../../types.ts'

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0 || !parts[0]) return '?'
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export interface CardModalAssigneesProps {
  boardMembers?: BoardMemberUser[]
  cardAssignees?: BoardMemberUser[]
  onToggleAssignee?: (userId: string) => void
}

export function CardModalAssignees({
  boardMembers = [],
  cardAssignees = [],
  onToggleAssignee,
}: CardModalAssigneesProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredMembers = boardMembers.filter((m) => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      m.name.toLowerCase().includes(query) ||
      m.email.toLowerCase().includes(query)
    )
  })

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Users className="size-3.5" />
          <span>Assignees</span>
        </h4>
        <span className="text-xs text-muted-foreground font-mono">
          {cardAssignees.length} assigned
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {cardAssignees.map((member) => (
          <button
            key={member.userId}
            type="button"
            onClick={() => onToggleAssignee?.(member.userId)}
            className="group flex items-center gap-1.5 rounded-lg border border-border/80 bg-muted/40 hover:bg-muted px-2.5 py-1 text-xs font-medium text-foreground transition-all cursor-pointer shadow-2xs hover:border-border"
            title={`${member.name} - Click to unassign`}
          >
            <Avatar className="size-4.5 border-none">
              <AvatarImage src={member.imageUrl} alt={member.name} />
              <AvatarFallback className="text-[9px] font-semibold bg-primary/15 text-primary">
                {getInitials(member.name)}
              </AvatarFallback>
            </Avatar>
            <span className="break-all">{member.name}</span>
            <Check className="size-3 text-muted-foreground group-hover:hidden shrink-0 ml-0.5" />
            <span className="hidden group-hover:inline text-xs font-bold text-destructive shrink-0 ml-0.5">
              ×
            </span>
          </button>
        ))}

        {/* Assign Member Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-lg border-dashed border-border/80 text-muted-foreground hover:text-foreground text-xs h-7 px-2.5 cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>
                {cardAssignees.length === 0 ? 'Assign member' : 'Edit'}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-72 p-3 space-y-2.5 max-h-[var(--radix-popover-content-available-height,360px)] overflow-y-auto"
          >
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-0.5">
              Assign Board Members
            </div>

            {boardMembers.length > 5 && (
              <Input
                placeholder="Filter members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-xs"
              />
            )}

            <div className="flex flex-col gap-1 max-h-52 overflow-y-auto p-0.5">
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
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
