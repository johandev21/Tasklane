import { Link, useRouter } from '@tanstack/react-router'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '#/components/ui/button.tsx'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '#/components/ui/empty.tsx'

export interface AppErrorProps {
  error?: Error | unknown
  reset?: () => void
  info?: { componentStack: string }
}

export function AppError({ error, reset }: AppErrorProps) {
  const router = useRouter()
  const errorMessage =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'An unexpected error occurred while loading this view.'

  const handleReset = () => {
    if (reset) {
      reset()
    } else {
      router.invalidate()
    }
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
      <Empty className="max-w-md border border-border/80 bg-card p-8 shadow-xs">
        <EmptyMedia variant="icon" className="bg-destructive/10 text-destructive">
          <AlertTriangle className="size-5" />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>Something went wrong</EmptyTitle>
          <EmptyDescription className="text-xs sm:text-sm">
            <span role="alert">{errorMessage}</span>
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex flex-row items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="gap-1.5"
          >
            <RefreshCw className="size-3.5" />
            <span>Try Again</span>
          </Button>
          <Button size="sm" asChild>
            <Link to="/home" className="gap-1.5">
              <Home className="size-3.5" />
              <span>Go to Boards</span>
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  )
}
