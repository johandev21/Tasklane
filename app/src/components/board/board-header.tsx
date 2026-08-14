import { Link } from '@tanstack/react-router'
import { Menu, KanbanSquare } from 'lucide-react'
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
import { ModeToggle } from '#/components/mode-toggle.tsx'
import type { BoardDoc } from './types.ts'

export interface BoardHeaderProps {
  board: BoardDoc
  onOpenBoardMenu?: () => void
  onOpenActivityMenu?: () => void
}

export function BoardHeader({
  board,
  onOpenBoardMenu,
  onOpenActivityMenu,
}: BoardHeaderProps) {
  const handleOpen = onOpenBoardMenu || onOpenActivityMenu

  return (
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

      {/* Right: Board Menu Entry Point + Theme Toggle + User Menu */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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
  )
}
