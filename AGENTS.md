# Trello Clone

A project-management platform for organizing work through boards, lists, and cards.

## Layout

- Root: `docs/` (ADRs), `.agents/` (skills), `CONTEXT.md` (domain language). No `package.json` here.
- `app/`: the entire TanStack Start application — `package.json`, `src/`, `convex/`, `vite.config.ts`.

## Commands

Run all commands from `app/`. Use `pnpm` (and `pnpm dlx`) for tooling, not npm/npx.

- `pnpm dev` — dev server on port 3000
- `pnpm convex:dev` — run Convex backend development sync & watcher
- `pnpm generate-routes` — regenerate the TanStack route tree
- `pnpm build` — production build
- `pnpm preview` — preview the production build
- `pnpm lint` — eslint
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm check` — prettier --check
- `pnpm format` — prettier --write + eslint --fix

## Pointers

- Editing code under `app/` (TanStack Router/Start, Convex, routes, anything in `app/src`): first read `app/AGENTS.md` and run any `tanstackIntent` guidance it lists.
- Changing architecture or the stack: read the ADRs in `docs/adr/` first.
- Unsure which repo skill applies: consult the `ask-matt` skill.

## Agent skills

### Issue tracker

Issues and specs live as GitHub issues. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — one root `CONTEXT.md` plus `docs/adr/`. See `docs/agents/domain.md`.

## Convex & Clerk Authentication Patterns

When working with authenticated queries and routes:

1. **Frontend: Use `useConvexAuth()` and conditionally skip queries**:
   - Do NOT rely solely on Clerk's `useAuth()` to fire queries. Clerk can be loaded before its JWT token is delivered to Convex's WebSocket connection on page refreshes.
   - Use `const { isLoading, isAuthenticated } = useConvexAuth()` from `convex/react`.
   - Pass `'skip'` to `useQuery` / `usePaginatedQuery` when `!isAuthenticated`:
     ```tsx
     const queryArgs = isAuthenticated ? { boardId } : 'skip'
     const board = useQuery(api.boards.get, queryArgs)
     ```
   - Guard component rendering in sequence:
     1. `if (isLoading) return <Skeleton />`
     2. `if (!isAuthenticated) return <SignInRequired />`
     3. `if (data === undefined) return <Skeleton />`
     4. `if (data === null) return <NotFound />`

2. **Backend: Queries must not throw on missing auth**:
   - `query` handlers must return `null` or `[]` when `!identity` rather than throwing fatal errors. Throwing in queries crashes the client error boundary during initial token handshakes.
   - `mutation` handlers should continue to throw on unauthorized access.

## Verify your work

Always typecheck first before linting and formatting. Ensure the app has zero TypeScript errors via `pnpm typecheck` before running `pnpm lint`, `pnpm check`, or `pnpm format`.

Before declaring a task done that touched `app/`: run in this exact order from `app/`:
1. `pnpm typecheck` — must pass with 0 TypeScript errors before proceeding.
2. `pnpm lint` — verify ESLint rules.
3. `pnpm check` — verify Prettier formatting (or `pnpm format` to auto-fix).
