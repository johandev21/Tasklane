import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuth } from '@clerk/tanstack-react-start'
import { Button } from '#/shared/components/ui/button.tsx'
import { AppError } from '#/shared/components/ui/app-error.tsx'
import {
  DashboardHeader,
  DashboardSkeleton,
  TelemetryStrip,
  BoardFilters,
  BoardGrid,
  NoBoardsState,
  NoFilteredBoardsState,
  CreateBoardDialog,
  useDashboardBoards,
  useCreateBoard,
  filterBoards,
} from '#/features/dashboard'
import type { BoardFilterMode } from '#/features/dashboard'
import { SignInRequired, useHomeUserSync } from '#/features/auth'

interface HomeSearch {
  view?: BoardFilterMode
}

export const Route = createFileRoute('/home')({
  validateSearch: (search: Record<string, unknown>): HomeSearch => {
    const view = search.view
    if (view === 'owned' || view === 'shared' || view === 'all') {
      return { view }
    }
    return { view: 'all' }
  },
  errorComponent: AppError,
  component: HomePage,
})

export function HomePage() {
  const { isLoaded, isSignedIn } = useAuth()
  const { view = 'all' } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const { boards, isLoading: isLoadingBoards } = useDashboardBoards()
  const { createBoard } = useCreateBoard()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  useHomeUserSync(isLoaded)

  if (isLoaded && !isSignedIn) {
    return <SignInRequired />
  }

  const allBoards = boards ?? []
  const displayedBoards = filterBoards(allBoards, view)

  const handleSelectFilter = (nextMode: BoardFilterMode) => {
    void navigate({
      search: (prev) => ({
        ...prev,
        view: nextMode === 'all' ? undefined : nextMode,
      }),
    })
  }

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
                  filterMode={view}
                  onSelectFilter={handleSelectFilter}
                />
                <Button onClick={() => setCreateDialogOpen(true)}>
                  Create Board
                </Button>
              </div>

              {displayedBoards.length === 0 ? (
                <NoFilteredBoardsState
                  filterMode={view}
                  onResetFilter={() => handleSelectFilter('all')}
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
        onCreateBoard={createBoard}
      />
    </div>
  )
}
