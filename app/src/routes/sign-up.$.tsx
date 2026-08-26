import { createFileRoute } from '@tanstack/react-router'
import { SignUp } from '@clerk/tanstack-react-start'

export const Route = createFileRoute('/sign-up/$')({
  component: SignUpPage,
})

function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-app-background p-4">
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        fallbackRedirectUrl="/home"
      />
    </div>
  )
}
