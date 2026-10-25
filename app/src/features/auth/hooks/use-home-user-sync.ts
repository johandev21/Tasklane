import { useEffect } from 'react'
import { useUser } from '@clerk/tanstack-react-start'
import { useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

export function useHomeUserSync(isLoaded: boolean) {
  const { user } = useUser()
  const upsertUser = useMutation(api.users.upsertUser)

  useEffect(() => {
    if (isLoaded && user) {
      upsertUser({
        name: user.fullName || user.firstName || undefined,
        email: user.primaryEmailAddress?.emailAddress || undefined,
        imageUrl: user.imageUrl || undefined,
      }).catch((err) => {
        console.error('Failed to sync user in Convex:', err)
      })
    }
  }, [isLoaded, user, upsertUser])
}
