import { useEffect } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuth } from '@clerk/tanstack-react-start'
import { KanbanSquare, MessageSquare, Users, Zap } from 'lucide-react'

import { Button } from '#/shared/components/ui/button.tsx'
import { Badge } from '#/shared/components/ui/badge.tsx'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/shared/components/ui/card.tsx'
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
} from '#/shared/components/ui/avatar.tsx'
import { ModeToggle } from '#/shared/components/mode-toggle.tsx'
import { Logo } from '#/shared/components/logo.tsx'

export const Route = createFileRoute('/')({ component: LandingPage })

export function LandingPage() {
  const { isSignedIn, isLoaded } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate({ to: '/home' })
    }
  }, [isLoaded, isSignedIn, navigate])

  return (
    <div className="flex min-h-screen flex-col bg-app-background selection:bg-primary/10">
      <LandingHeader isLoaded={isLoaded} isSignedIn={Boolean(isSignedIn)} />

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
          <LandingHero />
          <LandingBoardPreview />
          <LandingFeatureHighlights />
        </div>
      </main>
    </div>
  )
}

function LandingHeader({
  isLoaded,
  isSignedIn,
}: {
  isLoaded: boolean
  isSignedIn: boolean
}) {
  return (
    <header className="sticky top-0 z-40 bg-app-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link
          to="/"
          className="flex items-center gap-2 font-semibold tracking-tight transition-opacity hover:opacity-90"
        >
          <Logo className="size-6 text-foreground" />
          <span className="font-heading text-base font-semibold tracking-tight text-foreground">
            Tasklane
          </span>
        </Link>

        <div className="flex items-center gap-2.5">
          <ModeToggle />
          {isLoaded && isSignedIn ? (
            <Button size="sm" asChild>
              <Link to="/home">Go to Workspace</Link>
            </Button>
          ) : isLoaded ? (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/sign-in/$" params={{ _splat: '' }}>
                  Sign In
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/sign-up/$" params={{ _splat: '' }}>
                  Get Started
                </Link>
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}

function LandingHero() {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <h1 className="font-heading text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
        Organize work through Boards, Lists, and Cards
      </h1>

      <p className="mt-6 text-base text-muted-foreground sm:text-lg">
        A calm, minimal, production-grade project management platform for
        high-velocity teams. Collaborate live with your Members, track work
        across Lists, and capture every detail.
      </p>

      <div className="mt-8 flex items-center justify-center gap-3">
        <Button size="lg" asChild>
          <Link to="/sign-up/$" params={{ _splat: '' }}>
            Get Started for Free
          </Link>
        </Button>
        <Button variant="outline" size="lg" asChild>
          <Link to="/sign-in/$" params={{ _splat: '' }}>
            Sign In to Workspace
          </Link>
        </Button>
      </div>
    </div>
  )
}

function LandingBoardPreview() {
  return (
    <div className="mt-16 overflow-hidden rounded-[min(var(--radius-4xl),24px)] border border-border bg-card p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4">
        {/* Mockup Board Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <div className="flex items-center gap-3">
            <KanbanSquare className="size-8" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-base font-bold tracking-tight">
                  Mobile App Launch
                </h2>
                <Badge variant="secondary">Owner</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Collaborative space · 4 Members
              </p>
            </div>
          </div>

          {/* Presence Strip */}
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-muted-foreground">Viewing now:</span>
            <AvatarGroup>
              <Avatar size="sm">
                <AvatarFallback className="text-[10px] font-medium">
                  PP
                </AvatarFallback>
              </Avatar>
              <Avatar size="sm">
                <AvatarFallback className="text-[10px] font-medium">
                  MC
                </AvatarFallback>
              </Avatar>
              <Avatar size="sm">
                <AvatarFallback className="text-[10px] font-medium">
                  AG
                </AvatarFallback>
              </Avatar>
              <Avatar size="sm">
                <AvatarFallback className="text-[10px] font-medium">
                  LR
                </AvatarFallback>
              </Avatar>
            </AvatarGroup>
          </div>
        </div>

        {/* Mockup Lists Canvas */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* List 1: Backlog */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/40 p-3.5">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-heading text-sm font-semibold">Backlog</h3>
              <span className="text-xs text-muted-foreground">3</span>
            </div>

            <div className="flex flex-col gap-2.5">
              <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-[10px]">
                    Content
                  </Badge>
                  <span className="text-[10px] font-medium text-destructive">
                    Overdue
                  </span>
                </div>
                <h4 className="mt-2 text-xs font-medium">
                  Finalize onboarding copy
                </h4>
                <div className="mt-3 flex items-center justify-between">
                  <Avatar size="sm" className="size-5">
                    <AvatarFallback className="text-[9px]">PP</AvatarFallback>
                  </Avatar>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-[10px]">
                    Engineering
                  </Badge>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <MessageSquare className="size-3" /> 3
                  </span>
                </div>
                <h4 className="mt-2 text-xs font-medium">Deep-link handling</h4>
                <div className="mt-3 flex items-center justify-between">
                  <Avatar size="sm" className="size-5">
                    <AvatarFallback className="text-[9px]">MC</AvatarFallback>
                  </Avatar>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
                <h4 className="text-xs font-medium">Beta feedback triage</h4>
                <div className="mt-2 flex items-center text-[10px] text-muted-foreground">
                  <MessageSquare className="mr-1 size-3" /> 1 comment
                </div>
              </div>
            </div>
          </div>

          {/* List 2: In Progress */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/40 p-3.5">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-heading text-sm font-semibold">
                In Progress
              </h3>
              <span className="text-xs text-muted-foreground">2</span>
            </div>

            <div className="flex flex-col gap-2.5">
              <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary" className="text-[10px]">
                    Engineering
                  </Badge>
                  <Badge variant="destructive" className="text-[10px]">
                    Blocked
                  </Badge>
                </div>
                <h4 className="mt-2 text-xs font-medium">
                  Push-notification permissions
                </h4>
                <div className="mt-3 flex items-center justify-between">
                  <AvatarGroup>
                    <Avatar size="sm" className="size-5">
                      <AvatarFallback className="text-[9px]">MC</AvatarFallback>
                    </Avatar>
                    <Avatar size="sm" className="size-5">
                      <AvatarFallback className="text-[9px]">AG</AvatarFallback>
                    </Avatar>
                  </AvatarGroup>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-[10px]">
                    Marketing
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    In 2 days
                  </span>
                </div>
                <h4 className="mt-2 text-xs font-medium">Press kit assets</h4>
                <div className="mt-3 flex items-center justify-between">
                  <Avatar size="sm" className="size-5">
                    <AvatarFallback className="text-[9px]">AG</AvatarFallback>
                  </Avatar>
                </div>
              </div>
            </div>
          </div>

          {/* List 3: Done */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/40 p-3.5">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-heading text-sm font-semibold">Done</h3>
              <span className="text-xs text-muted-foreground">2</span>
            </div>

            <div className="flex flex-col gap-2.5">
              <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
                <Badge variant="secondary" className="text-[10px]">
                  Design
                </Badge>
                <h4 className="mt-2 text-xs font-medium">Design tokens</h4>
                <div className="mt-3 flex items-center justify-between">
                  <Avatar size="sm" className="size-5">
                    <AvatarFallback className="text-[9px]">LR</AvatarFallback>
                  </Avatar>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary" className="text-[10px]">
                    Engineering
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    Content
                  </Badge>
                </div>
                <h4 className="mt-2 text-xs font-medium">Auth flow</h4>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function LandingFeatureHighlights() {
  return (
    <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-3">
      <Card className="border-border">
        <CardHeader>
          <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-foreground">
            <KanbanSquare className="size-5" />
          </div>
          <CardTitle className="mt-3 text-base">Boards & Lists</CardTitle>
          <CardDescription>
            Structure work through clear horizontal columns and vertical card
            stacks.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-foreground">
            <Users className="size-5" />
          </div>
          <CardTitle className="mt-3 text-base">Real-time Presence</CardTitle>
          <CardDescription>
            See exactly who is viewing and collaborating on the Board live at
            any moment.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-foreground">
            <Zap className="size-5" />
          </div>
          <CardTitle className="mt-3 text-base">Instant Updates</CardTitle>
          <CardDescription>
            Every Card move, Comment, and Label syncs across all screens with
            zero latency.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
