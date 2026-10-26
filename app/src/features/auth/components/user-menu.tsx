import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { authClient } from '#/shared/api/auth.ts'
import { Button } from '#/shared/components/ui/button.tsx'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '#/shared/components/ui/avatar.tsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/shared/components/ui/dropdown-menu.tsx'

export function UserMenu() {
  const { data: session } = authClient.useSession()
  const client = useQueryClient()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const signingOut = useRef(false)
  if (!session) return null

  async function signOut() {
    if (signingOut.current) return
    signingOut.current = true
    setIsSigningOut(true)
    try {
      const result = await authClient.signOut()
      if (result.error)
        throw new Error(result.error.message ?? 'Unable to sign out.')
      client.clear()
      window.location.assign('/')
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Unable to sign out. Please try again.',
      )
      signingOut.current = false
      setIsSigningOut(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="User menu"
          disabled={isSigningOut}
        >
          <Avatar className="size-8 ring-1 ring-border">
            <AvatarImage
              src={session.user.image ?? undefined}
              alt={session.user.name}
            />
            <AvatarFallback>
              {session.user.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{session.user.name}</DropdownMenuLabel>
          <DropdownMenuLabel className="font-normal">
            {session.user.email}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            disabled={isSigningOut}
            onSelect={() => void signOut()}
          >
            {isSigningOut ? 'Signing out…' : 'Sign out'}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
