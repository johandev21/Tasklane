import { Link } from '@tanstack/react-router'
import {
  LayoutDashboard,
  ArrowLeft,
  Kanban,
  Search,
  CheckCircle2,
  Clock,
  HelpCircle,
} from 'lucide-react'
import { Button } from '#/components/ui/button.tsx'

export function NotFound() {
  const handleGoBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back()
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-between bg-app-background px-4 py-8 sm:px-6 select-none overflow-hidden">
      {/* Top Bar with Tasklane Logo */}
      <header className="z-10 flex w-full max-w-5xl items-center justify-between">
        <Link
          to="/home"
          className="flex items-center gap-2 font-heading text-base font-semibold tracking-tight text-foreground transition-opacity hover:opacity-80"
        >
          <div className="flex size-7 items-center justify-center rounded-lg bg-foreground text-background shadow-xs">
            <Kanban className="size-4" />
          </div>
          <span>Tasklane</span>
        </Link>

        <span className="font-mono text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full border border-border/50">
          Error 404
        </span>
      </header>

      {/* Main Content Area */}
      <main className="z-10 my-auto flex w-full max-w-3xl flex-col items-center justify-center text-center">
        {/* Visual 404 Kanban Illustration */}
        <div className="relative mb-8 flex items-center justify-center gap-2 sm:gap-4">
          {/* Left Number '4' */}
          <span className="font-mono text-7xl sm:text-8xl md:text-9xl font-extrabold tracking-tighter text-foreground/90 select-none">
            4
          </span>

          {/* Center '0' Replaced with Lost Kanban Card */}
          <div className="relative flex size-24 sm:size-28 md:size-32 flex-col justify-between rounded-2xl border-2 border-dashed border-primary/50 bg-card p-3 shadow-md rotate-[-3deg] transition-transform">
            {/* Card Mock Header */}
            <div className="flex items-center justify-between gap-1">
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-1.5 py-0.5 font-mono text-[9px] sm:text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                <HelpCircle className="size-2.5" />
                MISSING
              </span>
              <div className="size-2 rounded-full bg-destructive/60" />
            </div>

            {/* Card Content Placeholder */}
            <div className="flex flex-col items-center justify-center gap-1 my-auto">
              <Search className="size-5 sm:size-6 text-muted-foreground stroke-[2.2]" />
              <span className="font-mono text-[10px] text-muted-foreground font-medium">
                No lane found
              </span>
            </div>

            {/* Card Mock Footer */}
            <div className="flex items-center justify-between pt-1 border-t border-border/60">
              <div className="h-1.5 w-8 rounded-full bg-muted" />
              <div className="h-1.5 w-4 rounded-full bg-muted" />
            </div>
          </div>

          {/* Right Number '4' */}
          <span className="font-mono text-7xl sm:text-8xl md:text-9xl font-extrabold tracking-tighter text-foreground/90 select-none">
            4
          </span>
        </div>

        {/* Text Details */}
        <div className="flex flex-col items-center gap-3 max-w-lg">
          <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            This card drifted off the board
          </h1>
          <p className="text-sm sm:text-base leading-relaxed text-muted-foreground">
            We searched across all lists, columns, and archived cards, but
            couldn&apos;t find this resource. It might have been deleted, moved,
            or never existed in this workspace.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
          <Button
            size="lg"
            asChild
            className="w-full sm:w-auto rounded-xl px-6 font-medium gap-2 shadow-xs cursor-pointer"
          >
            <Link to="/home">
              <LayoutDashboard className="size-4" />
              <span>Back to Dashboard</span>
            </Link>
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={handleGoBack}
            className="w-full sm:w-auto rounded-xl px-6 font-medium gap-2 border-border/80 hover:bg-muted/50 cursor-pointer"
          >
            <ArrowLeft className="size-4" />
            <span>Go Back</span>
          </Button>
        </div>

        {/* Visual Mini Mock Columns to ground the Kanban theme */}
        <div className="mt-12 hidden md:grid grid-cols-3 gap-3 w-full max-w-md opacity-40 hover:opacity-70 transition-opacity pointer-events-none">
          <div className="rounded-xl border border-dashed border-border p-2.5 bg-card/40 flex flex-col gap-1.5 text-left">
            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
              <span>To Do</span>
              <CheckCircle2 className="size-3 text-muted-foreground/60" />
            </div>
            <div className="h-4 rounded bg-muted/60 w-3/4" />
            <div className="h-4 rounded bg-muted/40 w-1/2" />
          </div>

          <div className="rounded-xl border border-dashed border-primary/40 p-2.5 bg-primary/5 flex flex-col gap-1.5 text-left">
            <div className="flex items-center justify-between text-[11px] font-semibold text-primary">
              <span>Lost Lane</span>
              <span className="font-mono text-[9px]">404</span>
            </div>
            <div className="h-4 rounded bg-primary/20 w-full" />
            <div className="h-4 rounded bg-primary/10 w-2/3" />
          </div>

          <div className="rounded-xl border border-dashed border-border p-2.5 bg-card/40 flex flex-col gap-1.5 text-left">
            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
              <span>Done</span>
              <Clock className="size-3 text-muted-foreground/60" />
            </div>
            <div className="h-4 rounded bg-muted/60 w-4/5" />
            <div className="h-4 rounded bg-muted/40 w-3/5" />
          </div>
        </div>
      </main>

      {/* Footer Note */}
      <footer className="z-10 mt-8 text-center text-xs text-muted-foreground/70 font-mono">
        <span>Tasklane Workspace Platform • Status code: 404</span>
      </footer>
    </div>
  )
}
