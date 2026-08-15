import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Menu, KanbanSquare, UserPlus } from 'lucide-react'
import { UserButton } from '@clerk/tanstack-react-start'
import { Button } from '#/components/ui/button.tsx'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '#/components/ui/breadcrumb.tsx'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar.tsx'
import { ModeToggle } from '#/components/mode-toggle.tsx'
import { BoardMembersDialog } from './board-members-dialog.tsx'
import type { BoardDoc, BoardMemberUser } from './types.ts'

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0 || !parts[0]) return '?'
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export interface BoardHeaderProps {
  board: BoardDoc
  members?: BoardMemberUser[]
  isOwner?: boolean
  currentUserId?: string
  onOpenBoardMenu?: () => void
  onOpenActivityMenu?: () => void
  onInviteMember?: (email: string) => Promise<void>
  onRemoveMember?: (userId: string) => Promise<void>
}

export function BoardHeader({
  board,
  members = [],
  isOwner,
  currentUserId,
  onOpenBoardMenu,
  onOpenActivityMenu,
  onInviteMember,
  onRemoveMember,
}: BoardHeaderProps) {
  const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false)
  const handleOpen = onOpenBoardMenu || onOpenActivityMenu

  const maxVisibleAvatars = 3
  const visibleMembers = members.slice(0, maxVisibleAvatars)
  const overflowCount = Math.max(0, members.length - maxVisibleAvatars)

  return (
    <>
      <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
        {/* Left: Home Navigation + Breadcrumbs + Board Title */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Link
            to="/home"
            className="flex items-center gap-2 font-heading text-base font-semibold tracking-tight text-foreground transition-opacity hover:opacity-90 shrink-0"
          >
            <KanbanSquare className="size-5 shrink-0 text-foreground" />
            <span className="hidden xs:inline font-heading text-base font-semibold tracking-tight text-foreground">
              Tasklane
            </span>
          </Link>

          <Breadcrumb className="flex items-center text-sm min-w-0">
            <BreadcrumbList className="flex items-center text-sm">
              <BreadcrumbSeparator />
              <BreadcrumbItem className="hidden sm:inline-flex">
                <BreadcrumbLink asChild>
                  <Link to="/home">Boards</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden sm:inline-flex" />
              <BreadcrumbItem className="min-w-0">
                <BreadcrumbPage className="font-heading text-sm sm:text-base font-semibold text-foreground truncate px-1.5 py-0.5 rounded-md">
                  {board.name}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Right: Members / Share Avatar Pile + Board Menu + Theme Toggle + User Menu */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Members Avatar Pile & Share Trigger */}
          <div className="flex items-center gap-1.5">
            {members.length > 0 && (
              <button
                type="button"
                onClick={() => setIsMembersDialogOpen(true)}
                className="flex -space-x-2 overflow-hidden py-1 px-0.5 rounded-full hover:opacity-80 transition-opacity cursor-pointer"
                title="View board members"
              >
                {visibleMembers.map((m) => (
                  <Avatar
                    key={m.userId}
                    className="size-7 ring-2 ring-card shrink-0"
                  >
                    <AvatarImage src={m.imageUrl} alt={m.name} />
                    <AvatarFallback className="text-xs font-semibold bg-muted text-foreground">
                      {getInitials(m.name)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {overflowCount > 0 && (
                  <div
                    className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground ring-2 ring-card"
                    title={`+${overflowCount} more members`}
                  >
                    +{overflowCount}
                  </div>
                )}
              </button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMembersDialogOpen(true)}
              className="text-xs h-8 gap-1.5 cursor-pointer"
              title="Share and manage board members"
            >
              <UserPlus className="size-3.5" />
              <span className="hidden sm:inline">Share</span>
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleOpen}
            className="text-xs h-8 gap-1.5 cursor-pointer"
            title="Open board menu"
          >
            <Menu className="size-3.5" />
            <span className="hidden sm:inline">Board menu</span>
          </Button>

          <div className="h-4 w-px bg-border/60 hidden sm:block" />

          <ModeToggle />

          <UserButton
            appearance={{
              elements: {
                avatarBox: 'size-8 rounded-full ring-1 ring-border',
              },
            }}
          />
        </div>
      </div>

      {/* Board Members Dialog */}
      <BoardMembersDialog
        isOpen={isMembersDialogOpen}
        onClose={() => setIsMembersDialogOpen(false)}
        members={members}
        isOwner={isOwner ?? board.isOwner}
        currentUserId={currentUserId}
        onInviteMember={onInviteMember}
        onRemoveMember={onRemoveMember}
      />
    </>
  )
}
