import { Link } from '@tanstack/react-router'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '#/shared/components/ui/empty.tsx'
import { Button } from '#/shared/components/ui/button.tsx'

interface SignInRequiredProps {
  title?: string
  description?: string
}

export function SignInRequired({
  title = 'Sign in required',
  description = 'Please sign in to access your Tasklane boards.',
}: SignInRequiredProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <Empty className="max-w-md border border-border bg-card">
        <EmptyHeader>
          <EmptyTitle>{title}</EmptyTitle>
          <EmptyDescription>{description}</EmptyDescription>
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
