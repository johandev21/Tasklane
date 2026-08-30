import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { ClerkProvider, useAuth } from '@clerk/tanstack-react-start'
import { ConvexProviderWithClerk } from 'convex/react-clerk'

import { convex } from '#/shared/api/convex-client.ts'
import appCss from '../styles.css?url'

import { ThemeProvider } from '#/app/providers/theme-provider.tsx'
import { Toaster } from '#/shared/components/ui/sonner.tsx'
import { AppError } from '#/shared/components/ui/app-error.tsx'
import type { AppErrorProps } from '#/shared/components/ui/app-error.tsx'
import { NotFound } from '#/shared/components/ui/not-found.tsx'
import { OfflineBanner } from '#/shared/components/ui/offline-banner.tsx'

function ErrorBoundary(props: AppErrorProps) {
  return <AppError {...props} />
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Tasklane — Realtime Collaborative Workspace',
      },
      {
        name: 'description',
        content:
          'Organize collaborative work through realtime boards, lists, and cards.',
      },
      { property: 'og:image', content: '/social-preview.svg' },
      { name: 'twitter:image', content: '/social-preview.svg' },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  errorComponent: ErrorBoundary,
  notFoundComponent: NotFound,
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-app-background font-sans text-foreground antialiased selection:bg-primary/10">
        <ThemeProvider
          defaultTheme="system"
          storageKey="theme"
          attribute="class"
        >
          <ClerkProvider publishableKey={publishableKey}>
            <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
              <OfflineBanner />
              {children}
              <Toaster richColors closeButton position="bottom-right" />
            </ConvexProviderWithClerk>
          </ClerkProvider>
        </ThemeProvider>
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
