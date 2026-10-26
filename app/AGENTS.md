# Web application

This workspace is the TanStack Start and React UI. Run scripts from the
repository root with Bun or from this directory with bun.

## Commands

- bun run dev — Vite on port 3000
- bun run generate-routes — regenerate the TanStack route tree
- bun run build — production build
- bun run typecheck — tsc --noEmit
- bun run lint — ESLint
- bun run check — Prettier check
- bun run format — Prettier write and ESLint fix

## App architecture

- Keep route files focused on route composition and delegate domain UI to
  feature modules under src/features/.
- Use Better Auth session state for identity and TanStack Query for server data.
- Call the Elysia API through the same-origin /api proxy; do not add direct
  cross-origin browser requests.
- Treat unauthenticated reads as null or empty arrays and show loading,
  unauthenticated, not-found, and error states separately.
- Keep Board membership and Owner checks authoritative in the API.
- Invalidate only affected Board query keys on board.changed WebSocket events.
- Presence heartbeats run every 20 seconds; reconnect/open re-registers a
  viewer, and the API sweeps entries older than 60 seconds.

## Verification

For app changes, run in order: bun run typecheck, bun run lint, bun run check.
