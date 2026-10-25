import { Link } from '@tanstack/react-router'
import { UserButton } from '@clerk/tanstack-react-start'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '#/shared/components/ui/breadcrumb.tsx'
import { ModeToggle } from '#/shared/components/mode-toggle.tsx'
import { Logo } from '#/shared/components/logo.tsx'

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-app-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Link
            to="/home"
            className="flex items-center gap-2 font-heading text-base font-semibold tracking-tight text-foreground transition-opacity hover:opacity-90"
          >
            <Logo className="size-5 text-foreground" />
            Tasklane
          </Link>

          <Breadcrumb className="hidden sm:block">
            <BreadcrumbList className="flex items-center text-sm">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Boards</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="flex items-center gap-2.5">
          <ModeToggle />
          <UserButton
            appearance={{
              elements: {
                avatarBox: 'size-8 rounded-full ring-1 ring-border',
              },
            }}
          />
        </div>
      </div>
    </header>
  )
}
