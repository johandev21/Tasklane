import { useEffect, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { UserButton, useAuth, useUser } from '@clerk/tanstack-react-start'
import { useMutation, useQuery } from 'convex/react'
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

export const Route = createFileRoute('/home')({
  component: HomePage,
})

function HomePage() {
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
  const upsertUser = useMutation(api.users.upsertUser)
  const boards = useQuery(api.boards.list)
  const createBoardMutation = useMutation(api.boards.create)

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [filterMode, setFilterMode] = useState<'all' | 'owned' | 'shared'>(
    'all',
  )

  // Sync authenticated Clerk user to Convex users cache table
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

  const handleCreateBoard = async (name: string) => {
    await createBoardMutation({ name })
  }

  if (isLoaded && !isSignedIn) {
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

  const isLoadingBoards = boards === undefined
  const allBoards = boards ?? []
  const ownedBoards = allBoards.filter((b) => b.isOwner)
  const sharedBoards = allBoards.filter((b) => !b.isOwner)

  const displayedBoards =
    filterMode === 'owned'
      ? ownedBoards
      : filterMode === 'shared'
        ? sharedBoards
        : allBoards

  return (
    <div className="flex min-h-screen flex-col bg-app-background selection:bg-primary/10">
      {/* Top Application Header */}
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

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          {isLoadingBoards ? (
            <DashboardSkeleton />
          ) : allBoards.length === 0 ? (
            <div className="pt-12">
              <Empty className="mx-auto max-w-lg border border-border bg-card/60 p-8 shadow-xs">
                <EmptyHeader>
                  <EmptyTitle>No boards yet</EmptyTitle>
                  <EmptyDescription>
                    Create your first board to start organizing work through
                    lists and cards, with real-time collaboration.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    Create Board
                  </Button>
                </EmptyContent>
              </Empty>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {/* Telemetry Strip */}
              <TelemetryStrip boards={allBoards} />

              {/* Action Bar with Segment Filter & Create Action */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFilterMode('all')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      filterMode === 'all'
                        ? 'bg-foreground text-background'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('owned')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      filterMode === 'owned'
                        ? 'bg-foreground text-background'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Owned
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('shared')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      filterMode === 'shared'
                        ? 'bg-foreground text-background'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Shared
                  </button>
                </div>

                <Button onClick={() => setCreateDialogOpen(true)}>
                  Create Board
                </Button>
              </div>

              {/* Boards Workload Grid */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {displayedBoards.map((board) => (
                  <BoardCard key={board._id} board={board} />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Create Board Modal Dialog */}
      <CreateBoardDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreateBoard={handleCreateBoard}
      />
    </div>
  )
}
