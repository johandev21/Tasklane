import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Menu, KanbanSquare, Trash2, UserPlus } from 'lucide-react'
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover.tsx'
import { ModeToggle } from '#/components/mode-toggle.tsx'
import { getInitials } from './board-transforms.ts'
import { BoardMembersDialog } from './board-members-dialog.tsx'
import { DeleteBoardDialog } from './delete-board-dialog.tsx'
import type { BoardDoc, BoardMemberUser, PresenceViewer } from './types.ts'

export interface BoardHeaderProps {
  board: BoardDoc
  members?: BoardMemberUser[]
  presence?: PresenceViewer[]
  isOwner?: boolean
  currentUserId?: string
  onOpenBoardMenu?: () => void
  onOpenActivityMenu?: () => void
  onInviteMember?: (email: string) => Promise<void>
  onRemoveMember?: (userId: string) => Promise<void>
  onRenameBoard?: (name: string) => Promise<void>
  onDeleteBoard?: () => Promise<void>
}

export function BoardHeader({
  board,
  members = [],
  presence = [],
  isOwner,
  currentUserId,
  onOpenBoardMenu,
  onOpenActivityMenu,
  onInviteMember,
  onRemoveMember,
  onRenameBoard,
  onDeleteBoard,
}: BoardHeaderProps) {
  const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false)
  const [isDeleteBoardOpen, setIsDeleteBoardOpen] = useState(false)
  const handleOpenMenu = onOpenBoardMenu || onOpenActivityMenu

  return (
    <>
      <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
        <BoardHeaderBrand
          boardName={board.name}
          isOwner={Boolean(isOwner)}
          onRenameBoard={onRenameBoard}
        />

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {presence.length > 0 && (
            <BoardHeaderPresenceStrip presence={presence} />
          )}

          <BoardHeaderActions
            isOwner={Boolean(isOwner)}
            hasDeleteAction={Boolean(onDeleteBoard)}
            onOpenMembers={() => setIsMembersDialogOpen(true)}
            onOpenMenu={handleOpenMenu}
            onOpenDeleteBoard={() => setIsDeleteBoardOpen(true)}
          />
        </div>
      </div>

      <BoardMembersDialog
        isOpen={isMembersDialogOpen}
        onClose={() => setIsMembersDialogOpen(false)}
        members={members}
        isOwner={isOwner ?? board.isOwner}
        currentUserId={currentUserId}
        onInviteMember={onInviteMember}
        onRemoveMember={onRemoveMember}
      />

      {isOwner && onDeleteBoard && (
        <DeleteBoardDialog
          boardTitle={board.name}
          isOpen={isDeleteBoardOpen}
          onClose={() => setIsDeleteBoardOpen(false)}
          onConfirm={onDeleteBoard}
        />
      )}
    </>
  )
}

interface BoardHeaderBrandProps {
  boardName: string
  isOwner: boolean
  onRenameBoard?: (name: string) => Promise<void>
}

function BoardHeaderBrand({
  boardName,
  isOwner,
  onRenameBoard,
}: BoardHeaderBrandProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleInput, setTitleInput] = useState(boardName)

  useEffect(() => {
    if (!isEditingTitle) {
      setTitleInput(boardName)
    }
  }, [boardName, isEditingTitle])

  const handleSaveTitle = () => {
    const trimmed = titleInput.trim()
    if (trimmed && trimmed !== boardName) {
      onRenameBoard?.(trimmed)
    } else {
      setTitleInput(boardName)
    }
    setIsEditingTitle(false)
  }

  return (
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
          <BreadcrumbItem className="hidden md:inline-flex">
            <BreadcrumbLink asChild>
              <Link to="/home">Boards</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="hidden md:inline-flex" />
          <BreadcrumbItem className="min-w-0">
            {isOwner && isEditingTitle ? (
              <input
                aria-label="Board title"
                autoFocus
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle()
                  if (e.key === 'Escape') {
                    setTitleInput(boardName)
                    setIsEditingTitle(false)
                  }
                }}
                className="w-full max-w-[130px] xs:max-w-[180px] sm:max-w-xs md:max-w-sm rounded-md border border-ring bg-background px-2 py-0.5 font-heading text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            ) : (
              <BreadcrumbPage
                onClick={() => isOwner && setIsEditingTitle(true)}
                className={`font-heading text-sm sm:text-base font-semibold text-foreground truncate px-1.5 py-0.5 rounded-md transition-colors ${
                  isOwner
                    ? 'cursor-pointer hover:bg-muted/60'
                    : 'cursor-default'
                }`}
                title={isOwner ? 'Click to rename board' : undefined}
              >
                {boardName}
              </BreadcrumbPage>
            )}
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  )
}

function BoardHeaderPresenceStrip({
  presence,
}: {
  presence: PresenceViewer[]
}) {
  const maxVisibleAvatars = 4
  const visibleViewers = presence.slice(0, maxVisibleAvatars)
  const overflowViewers = presence.slice(maxVisibleAvatars)

  return (
    <div className="hidden sm:flex items-center gap-1.5">
      <div
        className="flex -space-x-2 overflow-hidden py-1 px-0.5"
        title="Currently viewing"
      >
        {visibleViewers.map((viewer, idx) => (
          <div
            key={viewer.userId}
            className={`relative shrink-0 ${idx >= 2 ? 'hidden lg:block' : ''}`}
          >
            <Avatar className="size-7 ring-2 ring-card">
              <AvatarImage
                src={viewer.imageUrl}
                alt={viewer.name}
                className="object-cover"
              />
              <AvatarFallback className="text-xs font-semibold bg-muted text-foreground">
                {getInitials(viewer.name)}
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 size-2 rounded-full bg-emerald-500 ring-1 ring-card" />
          </div>
        ))}
      </div>

      {presence.length > 2 && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground ring-2 ring-card transition-colors hover:bg-muted/80 hover:text-foreground cursor-pointer"
              title={`${presence.length} viewers`}
            >
              <span className="lg:hidden">+{presence.length - 2}</span>
              <span className="hidden lg:inline">
                +
                {overflowViewers.length > 0
                  ? overflowViewers.length
                  : presence.length}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 p-2 space-y-1">
            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
              Currently Viewing Board
            </div>
            {presence.map((viewer) => (
              <div
                key={viewer.userId}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-foreground"
              >
                <Avatar className="size-5 shrink-0">
                  <AvatarImage src={viewer.imageUrl} alt={viewer.name} />
                  <AvatarFallback className="text-xs">
                    {getInitials(viewer.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 truncate">{viewer.name}</span>
                <span className="size-2 shrink-0 rounded-full bg-emerald-500" />
              </div>
            ))}
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}

interface BoardHeaderActionsProps {
  isOwner: boolean
  hasDeleteAction: boolean
  onOpenMembers: () => void
  onOpenMenu?: () => void
  onOpenDeleteBoard: () => void
}

function BoardHeaderActions({
  isOwner,
  hasDeleteAction,
  onOpenMembers,
  onOpenMenu,
  onOpenDeleteBoard,
}: BoardHeaderActionsProps) {
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={onOpenMembers}
        className="h-8 px-2 sm:px-2.5 lg:px-3 text-xs gap-1.5 cursor-pointer"
        title="Share and manage board members"
      >
        <UserPlus className="size-3.5" />
        <span className="hidden lg:inline">Share</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onOpenMenu}
        className="h-8 px-2 sm:px-2.5 lg:px-3 text-xs gap-1.5 cursor-pointer"
        title="Open board menu"
      >
        <Menu className="size-3.5" />
        <span className="hidden lg:inline">Board menu</span>
      </Button>

      {isOwner && hasDeleteAction && (
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onOpenDeleteBoard}
          className="hidden lg:inline-flex size-8 text-muted-foreground rounded-lg transition-colors hover:bg-destructive/10 hover:text-destructive"
          title="Delete board"
        >
          <Trash2 className="size-4" />
        </Button>
      )}

      <div className="h-4 w-px bg-border/60 hidden md:block" />

      <div className="hidden md:inline-flex">
        <ModeToggle />
      </div>

      <UserButton
        appearance={{
          elements: {
            avatarBox: 'size-8 rounded-full ring-1 ring-border',
          },
        }}
      />
    </>
  )
}
