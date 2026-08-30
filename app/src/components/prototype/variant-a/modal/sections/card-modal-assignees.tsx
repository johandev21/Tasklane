import { UserPlus, Check } from 'lucide-react'
import type { Member } from '#/components/prototype/types'

export interface CardModalAssigneesProps {
  members: Member[]
  assigneeIds: string[]
  onToggleAssignee: (memberId: string) => void
}

export function CardModalAssignees({
  members,
  assigneeIds,
  onToggleAssignee,
}: CardModalAssigneesProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <UserPlus className="size-3.5" />
          <span>Assignees</span>
        </h4>
        <span className="text-xs text-muted-foreground font-mono">
          {assigneeIds.length} assigned
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        {members.map((member) => {
          const isAssigned = assigneeIds.includes(member.id)
          return (
            <button
              key={member.id}
              type="button"
              onClick={() => onToggleAssignee(member.id)}
              className={`flex items-center justify-between rounded-xl border p-2 text-sm transition-colors text-left ${
                isAssigned
                  ? 'border-primary/50 bg-primary/10 text-primary font-medium'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <img
                  src={member.avatarUrl}
                  alt={member.name}
                  className="size-5 rounded-full object-cover shrink-0"
                />
                <span className="break-all leading-snug">{member.name}</span>
              </div>
              {isAssigned && (
                <Check className="size-3.5 text-primary shrink-0 ml-1" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
