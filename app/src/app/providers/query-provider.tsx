import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { authClient } from '#/shared/api/auth.ts'

export function QueryProvider({ children }: { children: ReactNode }) {
  const { data: session } = authClient.useSession()

  return (
    <SessionQueryProvider key={session?.user.id ?? 'signed-out'}>
      {children}
    </SessionQueryProvider>
  )
}

function SessionQueryProvider({ children }: { children: ReactNode }) {
  // A fresh cache per user also isolates in-flight requests during account changes.
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 15_000, retry: 1 },
          mutations: { retry: false },
        },
      }),
  )

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
