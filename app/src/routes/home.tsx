import { useEffect, useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { UserButton, useAuth, useUser } from '@clerk/tanstack-react-start'
import { useMutation, useQuery } from 'convex/react'
import { toast } from 'sonner'
import { api } from '../../convex/_generated/api'

import { Button } from '#/components/ui/button.tsx'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '#/components/ui/breadcrumb.tsx'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '#/components/ui/empty.tsx'
import { ModeToggle } from '#/components/mode-toggle.tsx'

import { TelemetryStrip } from '#/components/dashboard/telemetry-strip.tsx'
import { BoardCard } from '#/components/dashboard/board-card.tsx'
import { CreateBoardDialog } from '#/components/dashboard/create-board-dialog.tsx'
import { DashboardSkeleton } from '#/components/dashboard/dashboard-skeleton.tsx'
import { AppError } from '#/components/ui/app-error.tsx'
import type { BoardSummary } from '#/components/dashboard/types.ts'

export const Route = createFileRoute('/home')({
  errorComponent: AppError,
  component: HomePage,
})

export function HomePage() {
  const navigate = useNavigate()
  const { isLoaded, isSignedIn } = useAuth()
  const boards = useQuery(api.boards.list)
  const createBoardMutation = useMutation(api.boards.create)

  useHomeUserSync(isLoaded)

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [filterMode, setFilterMode] = useState<'all' | 'owned' | 'shared'>(
    'all',
  )

  const handleCreateBoard = async (name: string) => {
    try {
      const boardId = await createBoardMutation({ name })
      await navigate({ to: '/boards/$boardId', params: { boardId } })
    } catch (err) {
      console.error('Failed to create board:', err)
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to create board. Please try again.',
      )
    }
  }

  if (isLoaded && !isSignedIn) {
    return <HomeSignInRequired />
  }

  const isLoadingBoards = boards === undefined
  const allBoards = boards ?? []
  const displayedBoards = filterBoards(allBoards, filterMode)

  return (
    <div className="flex min-h-screen flex-col bg-app-background selection:bg-primary/10">
      <DashboardHeader />

      <main className="flex-1 pb-16">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          {isLoadingBoards ? (
            <DashboardSkeleton />
          ) : allBoards.length === 0 ? (
            <NoBoardsState onOpenCreate={() => setCreateDialogOpen(true)} />
          ) : (
            <div className="flex flex-col gap-8">
              <TelemetryStrip boards={allBoards} />

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <BoardFilters
                  filterMode={filterMode}
                  onSelectFilter={setFilterMode}
                />
                <Button onClick={() => setCreateDialogOpen(true)}>
                  Create Board
                </Button>
              </div>

              {displayedBoards.length === 0 ? (
                <NoFilteredBoardsState
                  filterMode={filterMode}
                  onResetFilter={() => setFilterMode('all')}
                  onOpenCreate={() => setCreateDialogOpen(true)}
                />
              ) : (
                <BoardGrid boards={displayedBoards} />
              )}
            </div>
          )}
        </div>
      </main>

      <CreateBoardDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreateBoard={handleCreateBoard}
      />
    </div>
  )
}

function HomeSignInRequired() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <Empty className="max-w-md border border-border bg-card">
        <EmptyHeader>
          <EmptyTitle>Sign in required</EmptyTitle>
          <EmptyDescription>
            Please sign in to access your Tasklane boards.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link to="/sign-in/$" params={{ _splat: '' }}>
              Sign In
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  )
}

function DashboardHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-app-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Link
            to="/home"
            className="font-heading text-base font-semibold tracking-tight text-foreground transition-opacity hover:opacity-90"
          >
            Tasklane
          </Link>

          <Breadcrumb className="hidden sm:block">
            <BreadcrumbList className="flex items-center text-sm">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Boards</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="flex items-center gap-2.5">
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
    </header>
  )
}

interface BoardFiltersProps {
  filterMode: 'all' | 'owned' | 'shared'
  onSelectFilter: (mode: 'all' | 'owned' | 'shared') => void
}

function BoardFilters({ filterMode, onSelectFilter }: BoardFiltersProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onSelectFilter('all')}
        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
          filterMode === 'all'
            ? 'bg-foreground text-background'
            : 'bg-muted text-muted-foreground hover:text-foreground'
        }`}
      >
        All
      </button>
      <button
        type="button"
        onClick={() => onSelectFilter('owned')}
        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
          filterMode === 'owned'
            ? 'bg-foreground text-background'
            : 'bg-muted text-muted-foreground hover:text-foreground'
        }`}
      >
        Owned
      </button>
      <button
        type="button"
        onClick={() => onSelectFilter('shared')}
        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
          filterMode === 'shared'
            ? 'bg-foreground text-background'
            : 'bg-muted text-muted-foreground hover:text-foreground'
        }`}
      >
        Shared
      </button>
    </div>
  )
}

function BoardGrid({ boards }: { boards: BoardSummary[] }) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
      {boards.map((board) => (
        <BoardCard key={board._id} board={board} />
      ))}
    </div>
  )
}

function NoBoardsState({ onOpenCreate }: { onOpenCreate: () => void }) {
  return (
    <div className="pt-12">
      <Empty className="mx-auto max-w-lg border border-border bg-card/60 p-8 shadow-xs">
        <EmptyHeader>
          <EmptyTitle>No boards yet</EmptyTitle>
          <EmptyDescription>
            Create your first board to start organizing work through lists and
            cards, with real-time collaboration.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={onOpenCreate}>Create Board</Button>
        </EmptyContent>
      </Empty>
    </div>
  )
}

interface NoFilteredBoardsStateProps {
  filterMode: 'all' | 'owned' | 'shared'
  onResetFilter: () => void
  onOpenCreate: () => void
}

function NoFilteredBoardsState({
  filterMode,
  onResetFilter,
  onOpenCreate,
}: NoFilteredBoardsStateProps) {
  return (
    <div className="py-8">
      <Empty className="mx-auto max-w-md border border-border/80 bg-card/60 p-8 shadow-xs">
        <EmptyHeader>
          <EmptyTitle>
            {filterMode === 'owned' ? 'No owned boards' : 'No shared boards'}
          </EmptyTitle>
          <EmptyDescription>
            {filterMode === 'owned'
              ? 'You do not own any boards yet. Create a board or switch to view shared boards.'
              : 'No boards have been shared with you yet.'}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onResetFilter}>
            Show All Boards
          </Button>
          {filterMode === 'owned' && (
            <Button size="sm" onClick={onOpenCreate}>
              Create Board
            </Button>
          )}
        </EmptyContent>
      </Empty>
    </div>
  )
}

function filterBoards(
  boards: BoardSummary[],
  filterMode: 'all' | 'owned' | 'shared',
): BoardSummary[] {
  if (filterMode === 'owned') {
    return boards.filter((b) => b.isOwner)
  }
  if (filterMode === 'shared') {
    return boards.filter((b) => !b.isOwner)
  }
  return boards
}

function useHomeUserSync(isLoaded: boolean) {
  const { user } = useUser()
  const upsertUser = useMutation(api.users.upsertUser)

  useEffect(() => {
    if (isLoaded && user) {
      upsertUser({
        name: user.fullName || user.firstName || undefined,
        email: user.primaryEmailAddress?.emailAddress || undefined,
        imageUrl: user.imageUrl || undefined,
      }).catch((err) => {
        console.error('Failed to sync user in Convex:', err)
      })
    }
  }, [isLoaded, user, upsertUser])
}
