import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Trash2 } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '#/components/ui/breadcrumb'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'
import { ModeToggle } from '#/components/mode-toggle'
import type { BoardData } from '#/components/prototype/types'

export interface BoardHeaderProps {
  board: BoardData
  isOwner: boolean
  onUpdateTitle: (title: string) => void
  onOpenDeleteBoard: () => void
}

export function BoardHeader({
  board,
  isOwner,
  onUpdateTitle,
  onOpenDeleteBoard,
}: BoardHeaderProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleInput, setTitleInput] = useState(board.title)

  const handleSaveTitle = () => {
    if (titleInput.trim() && titleInput !== board.title) {
      onUpdateTitle(titleInput.trim())
    } else {
      setTitleInput(board.title)
    }
    setIsEditingTitle(false)
  }

  // Active presence: members currently viewing the board
  const activeMembers = board.members.filter((m) => m.isOnline !== false)
  const maxVisible = 4
  const visibleMembers = activeMembers.slice(0, maxVisible)
  const overflowMembers = activeMembers.slice(maxVisible)

  return (
    <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
      {/* Left: Home Navigation + Breadcrumbs + Inline Editable Board Title */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Link
          to="/home"
          className="font-heading text-base font-semibold tracking-tight text-foreground transition-opacity hover:opacity-90 shrink-0"
        >
          Tasklane
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
              {isOwner && isEditingTitle ? (
                <input
                  autoFocus
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle()
                    if (e.key === 'Escape') {
                      setTitleInput(board.title)
                      setIsEditingTitle(false)
                    }
                  }}
                  className="w-full max-w-xs sm:max-w-sm rounded-md border border-ring bg-background px-2 py-0.5 font-heading text-sm font-semibold text-foreground outline-none break-all"
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
                  {board.title}
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Right Side: Presence Strip + Minimal Delete Board + Theme Mode Toggle */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Presence Strip */}
        <div className="flex items-center gap-1">
          <div className="flex -space-x-1.5 overflow-hidden py-1">
            {visibleMembers.map((m) => (
              <div
                key={m.id}
                className="relative rounded-full ring-2 ring-card"
                title={`${m.name} (Viewing now)`}
              >
                <img
                  src={m.avatarUrl}
                  alt={m.name}
                  className="size-7 rounded-full object-cover"
                />
                <span className="absolute bottom-0 right-0 size-2 rounded-full bg-emerald-500 ring-1 ring-card" />
              </div>
            ))}

            {overflowMembers.length > 0 && (
              <Popover modal={false}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground ring-2 ring-card transition-all hover:bg-muted/80 hover:text-foreground"
                    title={`+${overflowMembers.length} more viewers`}
                  >
                    +{overflowMembers.length}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="w-56 p-2 space-y-1"
                  onWheel={(e) => e.stopPropagation()}
                >
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                    Currently Viewing Board
                  </div>
                  {activeMembers.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-foreground"
                    >
                      <img
                        src={m.avatarUrl}
                        alt={m.name}
                        className="size-5 rounded-full object-cover shrink-0"
                      />
                      <span className="truncate flex-1 break-all">
                        {m.name}
                      </span>
                      <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                    </div>
                  ))}
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>

        {/* Minimal Delete Board Action (Owner only) */}
        {isOwner && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onOpenDeleteBoard}
            className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
            title="Delete board"
          >
            <Trash2 className="size-4" />
          </Button>
        )}

        <div className="h-4 w-px bg-border/60 hidden sm:block" />

        {/* Theme Toggle */}
        <ModeToggle />
      </div>
    </div>
  )
}
