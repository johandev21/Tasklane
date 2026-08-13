import { useEffect, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { UserButton, useAuth, useUser } from '@clerk/tanstack-react-start'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { ArrowRight, FolderPlus, KanbanSquare, Plus } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import { Badge } from '#/components/ui/badge.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from '#/components/ui/avatar.tsx'
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
  EmptyMedia,
  EmptyTitle,
} from '#/components/ui/empty.tsx'
import {
  Dialog,
  DialogClose,
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
import { ModeToggle } from '#/components/mode-toggle.tsx'

export const Route = createFileRoute('/home')({
  component: HomePage,
})

function HomePage() {
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
  const upsertUser = useMutation(api.users.upsertUser)
  const dbUser = useQuery(api.users.currentUser)
  const [activeTab, setActiveTab] = useState('all')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [boardName, setBoardName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Sync authenticated Clerk user to Convex users table
  useEffect(() => {
    if (isLoaded && user) {
      upsertUser({
        name: user.fullName || user.firstName || undefined,
        email: user.primaryEmailAddress?.emailAddress || undefined,
        imageUrl: user.imageUrl || undefined,
      }).catch((err) => {
        console.error('Failed to upsert user in Convex:', err)
      })
    }
  }, [isLoaded, user, upsertUser])

  // Sample workspace content matching design brief Section 7
  const sampleBoards = [
    {
      id: 'board-1',
      name: 'Mobile App Launch',
      isOwner: true,
      description: 'Q3 Product launch milestone across iOS, Android, and Web.',
      listsCount: 3,
      cardsCount: 7,
      members: [
        { name: 'Priya Patel', initials: 'PP' },
        { name: 'Marcus Chen', initials: 'MC' },
        { name: 'Ana Gomez', initials: 'AG' },
        { name: 'Leo Rossi', initials: 'LR' },
      ],
    },
    {
      id: 'board-2',
      name: 'Editorial Calendar',
      isOwner: false,
      description: 'Weekly content production, newsletters, and launch blogs.',
      listsCount: 4,
      cardsCount: 12,
      members: [
        { name: 'Ana Gomez', initials: 'AG' },
        { name: 'Marcus Chen', initials: 'MC' },
      ],
    },
    {
      id: 'board-3',
      name: 'Q3 Hiring',
      isOwner: false,
      description:
        'Pipeline for Senior Full-Stack and Product Design candidates.',
      listsCount: 5,
      cardsCount: 8,
      members: [
        { name: 'Priya Patel', initials: 'PP' },
        { name: 'Leo Rossi', initials: 'LR' },
      ],
    },
  ]

  const filteredBoards = sampleBoards.filter((board) => {
    if (activeTab === 'owned') return board.isOwner
    if (activeTab === 'shared') return !board.isOwner
    return true
  })

  const userName = dbUser?.name || user?.firstName || user?.fullName || 'there'

  const handleCreateBoard = (e: React.FormEvent) => {
    e.preventDefault()
    if (!boardName.trim()) return

    setIsSubmitting(true)
    setTimeout(() => {
      setIsSubmitting(false)
      setBoardName('')
      setCreateDialogOpen(false)
    }, 300)
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

  return (
    <div className="flex min-h-screen flex-col bg-app-background selection:bg-primary/10">
      {/* Header with single user profile and clean breadcrumbs */}
      <header className="sticky top-0 z-40 bg-app-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Link
              to="/home"
              className="flex items-center gap-2 font-semibold tracking-tight transition-opacity hover:opacity-90"
            >
              <KanbanSquare className="size-5.5 shrink-0 text-foreground" />
              <span className="font-heading text-base font-semibold tracking-tight text-foreground">
                Tasklane
              </span>
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

          <div className="flex items-center gap-2">
            <ModeToggle />
            <UserButton
              appearance={{
                elements: {
                  userButtonAvatarBox: 'size-8 ring-1 ring-border',
                },
              }}
            />
          </div>
        </div>
      </header>

      {/* Main Workspace Dashboard Content */}
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="flex flex-col gap-6">
            {/* Clean Dashboard Title Bar with SINGLE Create Board action */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
                  Boards
                </h1>
                <p className="text-sm text-muted-foreground">
                  Welcome back, {userName}. Select a Board to open your Lists
                  and Cards.
                </p>
              </div>

              <div>
                <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                  <Plus data-icon="inline-start" />
                  Create Board
                </Button>
              </div>
            </div>

            {/* Boards Section with Clean Tabs */}
            <div className="flex flex-col gap-5">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="all">All Boards</TabsTrigger>
                  <TabsTrigger value="owned">Owned by you</TabsTrigger>
                  <TabsTrigger value="shared">Shared with you</TabsTrigger>
                </TabsList>

                {['all', 'owned', 'shared'].map((tabKey) => (
                  <TabsContent key={tabKey} value={tabKey} className="mt-5">
                    {filteredBoards.length > 0 ? (
                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredBoards.map((board) => (
                          <Card
                            key={board.id}
                            className="border-border transition-all hover:border-foreground/20 hover:shadow-xs"
                          >
                            <CardHeader>
                              <div className="flex items-center justify-between gap-2">
                                <Badge
                                  variant={
                                    board.isOwner ? 'default' : 'secondary'
                                  }
                                >
                                  {board.isOwner ? 'Owner' : 'Member'}
                                </Badge>
                              </div>
                              <CardTitle className="mt-2 text-lg">
                                {board.name}
                              </CardTitle>
                              <CardDescription className="line-clamp-2">
                                {board.description}
                              </CardDescription>
                            </CardHeader>

                            <CardContent>
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>
                                  {board.listsCount} Lists · {board.cardsCount}{' '}
                                  Cards
                                </span>
                                <AvatarGroup>
                                  {board.members.map((member, i) => (
                                    <Avatar key={i} size="sm">
                                      <AvatarFallback className="text-[10px] font-medium">
                                        {member.initials}
                                      </AvatarFallback>
                                    </Avatar>
                                  ))}
                                  {board.members.length > 3 && (
                                    <AvatarGroupCount>
                                      +{board.members.length - 3}
                                    </AvatarGroupCount>
                                  )}
                                </AvatarGroup>
                              </div>
                            </CardContent>

                            <CardFooter className="border-t border-border pt-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1.5"
                                onClick={() => setCreateDialogOpen(true)}
                              >
                                <span>Open Board</span>
                                <ArrowRight className="size-3.5" />
                              </Button>
                            </CardFooter>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Empty className="my-8 border border-border bg-card">
                        <EmptyMedia variant="icon">
                          <FolderPlus className="size-6" />
                        </EmptyMedia>
                        <EmptyHeader>
                          <EmptyTitle>No Boards found</EmptyTitle>
                          <EmptyDescription>
                            You don't have any boards in this view. Create a new
                            Board to get started.
                          </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                          <Button
                            size="sm"
                            onClick={() => setCreateDialogOpen(true)}
                          >
                            <Plus data-icon="inline-start" />
                            Create Board
                          </Button>
                        </EmptyContent>
                      </Empty>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </div>
        </div>
      </main>

      {/* Single Create Board Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="border-border sm:max-w-md">
          <form onSubmit={handleCreateBoard}>
            <DialogHeader>
              <DialogTitle>Create Board</DialogTitle>
              <DialogDescription>
                A Board is a collaborative space for organizing work through
                Lists and Cards.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="new-board-name">Board Name</FieldLabel>
                  <Input
                    id="new-board-name"
                    placeholder="e.g. Mobile App Launch"
                    value={boardName}
                    onChange={(e) => setBoardName(e.target.value)}
                    autoFocus
                    required
                  />
                </Field>
              </FieldGroup>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={isSubmitting || !boardName.trim()}
              >
                <Plus data-icon="inline-start" />
                {isSubmitting ? 'Creating...' : 'Create Board'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
