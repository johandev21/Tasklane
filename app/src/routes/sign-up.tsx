import { createFileRoute } from '@tanstack/react-router'
import { AuthForm, getAuthRedirect } from '#/features/auth'

export const Route = createFileRoute('/sign-up')({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: getAuthRedirect(search.redirect),
  }),
  component: SignUpPage,
})

function SignUpPage() {
  return <AuthForm mode="sign-up" redirect={Route.useSearch().redirect} />
}
