# Tasklane

Project management through Boards, Lists, and Cards.

## Layout

- Root: Bun workspace configuration, docs/ (ADRs), .agents/, and CONTEXT.md.
- app/: TanStack Start web application.
- api/: Elysia API, Better Auth, Drizzle, and SQLite.

## Commands

Use Bun from the repository root:

- bun install — install all workspace dependencies
- bun run dev — start web (:3000) and API (:3001)
- bun run typecheck — typecheck both workspaces
- bun run test — run workspace tests
- bun run build — build the web app
- bun run lint, bun run check, bun run format — frontend lint/format tools
- bun run --cwd app generate-routes — regenerate TanStack routes

## Pointers

- Before editing app/, read app/AGENTS.md.
- Before changing architecture, read relevant ADRs in docs/adr/.
- Current architecture decisions are recorded in docs/adr/; ADRs 0004–0006
  supersede the original Convex and Clerk decisions.
- Domain terms are defined in CONTEXT.md; keep that vocabulary stable.

## Authentication and API behavior

- The web app calls same-origin /api routes through Vite's development proxy.
- Better Auth owns user and session records. Set BETTER_AUTH_SECRET and
  BETTER_AUTH_URL in api/.env.
- Unauthenticated reads return null or []; writes return HTTP 401.
- Enforce Board membership and Owner permissions in the API, never only in UI.
- SQLite is intentionally single-process; realtime uses in-process WebSocket
  topics and presence sweeping.

## Verification

For app changes, run in order: bun run typecheck, bun run lint, then
bun run check. Run API tests with bun run --cwd api test.
