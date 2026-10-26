import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { authClient } from '#/shared/api/auth.ts'
import { Button } from '#/shared/components/ui/button.tsx'
import { Input } from '#/shared/components/ui/input.tsx'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '#/shared/components/ui/field.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '#/shared/components/ui/card.tsx'
import { Logo } from '#/shared/components/logo.tsx'
import { getAuthRedirect } from '../utils/auth-redirect.ts'

export function AuthForm({
  mode,
  redirect,
}: {
  mode: 'sign-in' | 'sign-up'
  redirect?: string
}) {
  const isSignUp = mode === 'sign-up'
  const destination = getAuthRedirect(redirect)
  const session = authClient.useSession()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submitting = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState(false)

  useEffect(() => {
    if (session.data) window.location.replace(destination)
  }, [session.data, destination])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '').trim()
    const password = String(form.get('password') ?? '')
    const name = String(form.get('name') ?? '').trim()
    if (isSignUp && !name) {
      setError('Enter your name.')
      return
    }
    submitting.current = true
    setIsSubmitting(true)
    setError(null)
    try {
      const result = isSignUp
        ? await authClient.signUp.email({ name, email, password })
        : await authClient.signIn.email({ email, password })
      if (result.error) {
        setError(result.error.message ?? 'Unable to sign in. Please try again.')
        return
      }
      const nextSession = await authClient.getSession()
      if (nextSession.error)
        throw new Error('Unable to check your session. Please try signing in.')
      if (nextSession.data) window.location.assign(destination)
      else if (isSignUp) setCreated(true)
      else setError('Unable to start your session. Please try again.')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to connect. Please try again.',
      )
    } finally {
      submitting.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <Link to="/" aria-label="Tasklane home">
            <Logo className="mb-3 size-8" />
          </Link>
          <CardTitle>
            {isSignUp ? 'Create your account' : 'Sign in to Tasklane'}
          </CardTitle>
          <CardDescription>
            {isSignUp
              ? 'Organize work with your Members.'
              : 'Continue to your Boards, Lists, and Cards.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {created ? (
            <p role="status">Account created. Sign in to continue.</p>
          ) : (
            <form onSubmit={handleSubmit} aria-busy={isSubmitting}>
              <FieldGroup>
                {isSignUp && (
                  <Field data-disabled={isSubmitting}>
                    <FieldLabel htmlFor="name">Name</FieldLabel>
                    <Input
                      id="name"
                      name="name"
                      autoComplete="name"
                      required
                      disabled={isSubmitting}
                    />
                  </Field>
                )}
                <Field data-disabled={isSubmitting}>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    disabled={isSubmitting}
                  />
                </Field>
                <Field data-disabled={isSubmitting}>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete={
                      isSignUp ? 'new-password' : 'current-password'
                    }
                    minLength={isSignUp ? 8 : undefined}
                    maxLength={128}
                    required
                    disabled={isSubmitting}
                  />
                </Field>
                {error && <FieldError>{error}</FieldError>}
                <Button
                  type="submit"
                  disabled={isSubmitting || session.isPending}
                >
                  {isSubmitting
                    ? 'Please wait…'
                    : isSignUp
                      ? 'Create account'
                      : 'Sign in'}
                </Button>
                {session.error && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void session.refetch()}
                  >
                    Retry session check
                  </Button>
                )}
              </FieldGroup>
            </form>
          )}
        </CardContent>
        <CardFooter>
          <Link
            className="text-sm underline underline-offset-4"
            to={isSignUp ? '/sign-in' : '/sign-up'}
            search={{ redirect: destination }}
          >
            {isSignUp
              ? 'Already have an account? Sign in'
              : 'Create an account'}
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
