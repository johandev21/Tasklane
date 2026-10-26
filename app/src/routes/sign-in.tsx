import { createFileRoute } from '@tanstack/react-router'
import { AuthForm, getAuthRedirect } from '#/features/auth'

export const Route = createFileRoute('/sign-in')({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: getAuthRedirect(search.redirect),
  }),
  component: SignInPage,
})

function SignInPage() {
  return <AuthForm mode="sign-in" redirect={Route.useSearch().redirect} />
}
