import { useState } from 'react'
import {
  UserPlus,
  UserMinus,
  Crown,
  Mail,
  Loader2,
  ShieldAlert,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar.tsx'
import { Badge } from '#/components/ui/badge.tsx'
import type { BoardMemberUser } from './types.ts'

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0 || !parts[0]) return '?'
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export interface BoardMembersDialogProps {
  isOpen: boolean
  onClose: () => void
  members: BoardMemberUser[]
  isOwner: boolean
  currentUserId?: string
  onInviteMember?: (email: string) => Promise<void>
  onRemoveMember?: (userId: string) => Promise<void>
}

export function BoardMembersDialog({
  isOpen,
  onClose,
  members,
  isOwner,
  currentUserId,
  onInviteMember,
  onRemoveMember,
}: BoardMembersDialogProps) {
  const [emailInput, setEmailInput] = useState('')
  const [isInviting, setIsInviting] = useState(false)
  const [removingUserId, setRemovingUserId] = useState<string | null>(null)

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = emailInput.trim()
    if (!trimmed) return

    if (!trimmed.includes('@') || !trimmed.includes('.')) {
      toast.error('Please enter a valid email address')
      return
    }

    setIsInviting(true)
    try {
      if (onInviteMember) {
        await onInviteMember(trimmed)
        toast.success(`Invited ${trimmed} to the board`)
        setEmailInput('')
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to invite member'
      toast.error(message)
    } finally {
      setIsInviting(false)
    }
  }

  const handleRemove = async (member: BoardMemberUser) => {
    if (!onRemoveMember) return
    setRemovingUserId(member.userId)
    try {
      await onRemoveMember(member.userId)
      toast.success(`Removed ${member.name} from the board`)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to remove member'
      toast.error(message)
    } finally {
      setRemovingUserId(null)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-6 bg-card border-border shadow-lg">
        <DialogHeader className="gap-1.5 pb-2">
          <DialogTitle className="text-lg font-heading font-semibold text-foreground">
            Board Members
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isOwner
              ? 'Invite teammates to collaborate or manage existing members.'
              : 'View people who have access to collaborate on this board.'}
          </DialogDescription>
        </DialogHeader>

        {/* Invite Form for Board Owner */}
        {isOwner && onInviteMember && (
          <form onSubmit={handleInvite} className="space-y-2 pt-1 pb-3">
            <label
              htmlFor="member-invite-email"
              className="text-xs font-semibold text-foreground flex items-center gap-1.5"
            >
              <UserPlus className="size-3.5 text-muted-foreground" />
              <span>Invite by email</span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  id="member-invite-email"
                  type="email"
                  placeholder="colleague@example.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  disabled={isInviting}
                  className="pl-8 text-xs h-9"
                  autoComplete="email"
                />
              </div>
              <Button
                type="submit"
                size="sm"
                disabled={!emailInput.trim() || isInviting}
                className="h-9 px-3 text-xs gap-1.5 shrink-0 cursor-pointer"
              >
                {isInviting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <UserPlus className="size-3.5" />
                )}
                <span>Invite</span>
              </Button>
            </div>
          </form>
        )}

        {!isOwner && (
          <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2.5 text-xs text-muted-foreground border border-border/50">
            <ShieldAlert className="size-4 shrink-0 text-muted-foreground/80" />
            <span>Only the board owner can invite or remove members.</span>
          </div>
        )}

        {/* Members Roster List */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium px-1">
            <span>Members</span>
            <span>Role</span>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 -mr-1">
            {members.map((member) => {
              const isCurrentUser = member.userId === currentUserId
              const isMemberOwner = member.isOwner
              const isCurrentlyRemoving = removingUserId === member.userId

              return (
                <div
                  key={member.userId}
                  className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <Avatar className="size-8 rounded-full ring-1 ring-border shrink-0">
                      <AvatarImage src={member.imageUrl} alt={member.name} />
                      <AvatarFallback className="text-xs font-semibold bg-muted text-foreground">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1 flex flex-col">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-xs font-semibold text-foreground truncate">
                          {member.name}
                        </span>
                        {isCurrentUser && (
                          <span className="text-xs text-muted-foreground font-medium">
                            (You)
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground truncate font-mono">
                        {member.email || 'No email available'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isMemberOwner ? (
                      <Badge
                        variant="secondary"
                        className="text-xs gap-1 px-2 py-0.5 font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                      >
                        <Crown className="size-3 text-amber-500" />
                        <span>Owner</span>
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-xs px-2 py-0.5 font-normal text-muted-foreground border-border/80"
                      >
                        Member
                      </Badge>
                    )}

                    {/* Owner-only Remove Action for regular members */}
                    {isOwner && !isMemberOwner && onRemoveMember && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleRemove(member)}
                        disabled={isCurrentlyRemoving}
                        className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                        title={`Remove ${member.name} from board`}
                      >
                        {isCurrentlyRemoving ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <UserMinus className="size-3.5" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
