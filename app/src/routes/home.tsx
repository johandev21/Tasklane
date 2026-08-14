// Three variants of the dashboard / boards page, switchable via ?variant=, on the existing /home route.
import { useEffect, useState } from 'react'
import {
  Link,
  createFileRoute,
  useNavigate,
  useSearch,
} from '@tanstack/react-router'
import { UserButton, useAuth, useUser } from '@clerk/tanstack-react-start'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

import { Button } from '#/components/ui/button.tsx'
import { Badge } from '#/components/ui/badge.tsx'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog.tsx'
import { Field, FieldGroup, FieldLabel } from '#/components/ui/field.tsx'
import { Input } from '#/components/ui/input.tsx'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '#/components/ui/tabs.tsx'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table.tsx'
import { Skeleton } from '#/components/ui/skeleton.tsx'
import { Spinner } from '#/components/ui/spinner.tsx'
import { ModeToggle } from '#/components/mode-toggle.tsx'
import { PrototypeSwitcher } from '#/components/prototype-switcher.tsx'
import type { VariantOption } from '#/components/prototype-switcher.tsx'

interface HomeSearch {
  variant?: 'A' | 'B' | 'C'
}

export const Route = createFileRoute('/home')({
  validateSearch: (search: Record<string, unknown>): HomeSearch => {
    const variant = search.variant as string | undefined
    return {
      variant:
        variant === 'A' || variant === 'B' || variant === 'C' ? variant : 'A',
    }
  },
  component: HomePage,
})

const PROTOTYPE_VARIANTS: VariantOption[] = [
  { id: 'A', label: 'Sectioned Grid' },
  { id: 'B', label: 'Dense Table' },
  { id: 'C', label: 'Catalog & Tile' },
]

export interface BoardSummary {
  _id: Id<'boards'>
  _creationTime: number
  name: string
  ownerId: string
  isOwner: boolean
  memberCount: number
  listsCount: number
}

function HomePage() {
  const search = useSearch({ from: '/home' })
  const navigate = useNavigate({ from: '/home' })
  const activeVariant = search.variant ?? 'A'

  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
  const upsertUser = useMutation(api.users.upsertUser)
  const boards = useQuery(api.boards.list)
  const createBoardMutation = useMutation(api.boards.create)

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [boardName, setBoardName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = boardName.trim()
    if (!trimmed) {
      setErrorMessage('Board name is required')
      return
    }

    try {
      setIsSubmitting(true)
      setErrorMessage(null)
      await createBoardMutation({ name: trimmed })
      setBoardName('')
      setCreateDialogOpen(false)
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to create board',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoaded && !isSignedIn) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Empty className="max-w-md border border-border bg-card">
          <EmptyHeader>
            <EmptyTitle>Sign in required</EmptyTitle>
            <EmptyDescription>
              Please sign in to access your Tasklane workspace and boards.
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
                  <BreadcrumbLink asChild>
                    <Link to="/home">Workspace</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
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
      <main className="flex-1 pb-20">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          {isLoadingBoards ? (
            <DashboardLoadingSkeleton />
          ) : boards.length === 0 ? (
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
            <>
              {activeVariant === 'A' && (
                <VariantA
                  boards={boards}
                  onOpenCreate={() => setCreateDialogOpen(true)}
                />
              )}
              {activeVariant === 'B' && (
                <VariantB
                  boards={boards}
                  onOpenCreate={() => setCreateDialogOpen(true)}
                />
              )}
              {activeVariant === 'C' && (
                <VariantC
                  boards={boards}
                  onOpenCreate={() => setCreateDialogOpen(true)}
                />
              )}
            </>
          )}
        </div>
      </main>

      {/* Create Board Modal */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <form onSubmit={handleCreateBoard}>
            <DialogHeader>
              <DialogTitle>Create board</DialogTitle>
              <DialogDescription>
                Boards are collaborative spaces for organizing work with
                members.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <FieldGroup>
                <Field data-invalid={errorMessage ? true : undefined}>
                  <FieldLabel htmlFor="board-title">Board title</FieldLabel>
                  <Input
                    id="board-title"
                    value={boardName}
                    onChange={(e) => setBoardName(e.target.value)}
                    placeholder="e.g. Mobile App Launch"
                    autoFocus
                    maxLength={100}
                    disabled={isSubmitting}
                    aria-invalid={errorMessage ? true : undefined}
                  />
                  {errorMessage ? (
                    <p className="mt-1 text-xs text-destructive">
                      {errorMessage}
                    </p>
                  ) : null}
                </Field>
              </FieldGroup>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Spinner data-icon="inline-start" />
                    Creating...
                  </>
                ) : (
                  'Create'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Floating Prototype Switcher */}
      <PrototypeSwitcher
        variants={PROTOTYPE_VARIANTS}
        currentVariant={activeVariant}
        onSelectVariant={(variantId) => {
          navigate({
            search: (prev) => ({
              ...prev,
              variant: variantId as 'A' | 'B' | 'C',
            }),
            replace: true,
          })
        }}
      />
    </div>
  )
}

/**
 * Loading skeleton state
 */
function DashboardLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-36 w-full rounded-2xl" />
      </div>
    </div>
  )
}

/**
 * Variant A: Structured Grouped Grid
 * Divides boards into clearly labeled sections (Owned Boards vs Shared with You)
 */
export function VariantA({
  boards,
  onOpenCreate,
}: {
  boards: BoardSummary[]
  onOpenCreate: () => void
}) {
  const ownedBoards = boards.filter((b) => b.isOwner)
  const sharedBoards = boards.filter((b) => !b.isOwner)

  return (
    <div className="flex flex-col gap-8">
      {/* Top Header & Primary Action */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground">
            Boards
          </h1>
          <span className="text-xs text-muted-foreground">
            {boards.length} total
          </span>
        </div>

        <Button onClick={onOpenCreate}>Create Board</Button>
      </div>

      {/* Owned Boards Section */}
      {ownedBoards.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Owned by you ({ownedBoards.length})
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ownedBoards.map((board) => (
              <BoardCard key={board._id} board={board} />
            ))}
          </div>
        </section>
      )}

      {/* Shared Boards Section */}
      {sharedBoards.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Shared with you ({sharedBoards.length})
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sharedBoards.map((board) => (
              <BoardCard key={board._id} board={board} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

/**
 * Variant B: Unified Dense Table View
 * High-density tabular layout with role filtering and fast scanning
 */
export function VariantB({
  boards,
  onOpenCreate,
}: {
  boards: BoardSummary[]
  onOpenCreate: () => void
}) {
  const [tab, setTab] = useState<'all' | 'owned' | 'shared'>('all')

  const filteredBoards = boards.filter((b) => {
    if (tab === 'owned') return b.isOwner
    if (tab === 'shared') return !b.isOwner
    return true
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground">
            Workspace Boards
          </h1>
          <p className="text-sm text-muted-foreground">
            Dense list view of all collaborative boards across your account.
          </p>
        </div>

        <Button onClick={onOpenCreate}>Create Board</Button>
      </div>

      <Tabs
        value={tab}
        onValueChange={(val) => setTab(val as 'all' | 'owned' | 'shared')}
      >
        <TabsList>
          <TabsTrigger value="all">All ({boards.length})</TabsTrigger>
          <TabsTrigger value="owned">
            Owned ({boards.filter((b) => b.isOwner).length})
          </TabsTrigger>
          <TabsTrigger value="shared">
            Shared ({boards.filter((b) => !b.isOwner).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[45%]">Board</TableHead>
                  <TableHead className="w-[15%]">Role</TableHead>
                  <TableHead className="w-[15%]">Members</TableHead>
                  <TableHead className="w-[15%]">Lists</TableHead>
                  <TableHead className="w-[10%] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBoards.map((board) => (
                  <TableRow key={board._id}>
                    <TableCell className="font-medium text-foreground">
                      {board.name}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={board.isOwner ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {board.isOwner ? 'Owner' : 'Member'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {board.memberCount}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {board.listsCount}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="xs">
                        Open
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

/**
 * Variant C: Workspace Board Catalog with Inline Create Tile
 * Card catalog where the first item is an inline creation card
 */
export function VariantC({
  boards,
  onOpenCreate,
}: {
  boards: BoardSummary[]
  onOpenCreate: () => void
}) {
  const [query, setQuery] = useState('')

  const filteredBoards = boards.filter((b) =>
    b.name.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground">
            Board Catalog
          </h1>
          <p className="text-sm text-muted-foreground">
            Search and launch workspace boards or quickly start a new one.
          </p>
        </div>

        <div className="w-full sm:w-64">
          <Input
            placeholder="Search boards..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Inline Create Tile */}
        <button
          type="button"
          onClick={onOpenCreate}
          className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border/80 bg-card/40 p-6 text-center transition-colors hover:border-foreground/30 hover:bg-card focus-visible:border-ring focus-visible:outline-none"
        >
          <span className="text-sm font-medium text-foreground">
            + Create new board
          </span>
          <span className="text-xs text-muted-foreground">
            Start a new collaborative board
          </span>
        </button>

        {/* Board Cards */}
        {filteredBoards.map((board) => (
          <BoardCard key={board._id} board={board} />
        ))}
      </div>
    </div>
  )
}

/**
 * Standard Board Card Component
 */
function BoardCard({ board }: { board: BoardSummary }) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="truncate">{board.name}</CardTitle>
        <CardAction>
          <Badge
            variant={board.isOwner ? 'default' : 'secondary'}
            className="text-xs"
          >
            {board.isOwner ? 'Owner' : 'Member'}
          </Badge>
        </CardAction>
        <CardDescription>
          {board.listsCount === 1 ? '1 list' : `${board.listsCount} lists`}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="text-xs text-muted-foreground">
          {board.memberCount === 1
            ? '1 member'
            : `${board.memberCount} members`}
        </div>
      </CardContent>

      <CardFooter className="justify-end border-t border-border/40">
        <Button variant="ghost" size="xs">
          Open board
        </Button>
      </CardFooter>
    </Card>
  )
}
