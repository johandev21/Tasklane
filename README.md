# Tasklane

Tasklane is a collaborative project management app organized around Boards,
Lists, and Cards. It includes labels, members, comments, archive, activity,
drag-and-drop ordering, and live presence.

## Stack

- Web: TanStack Start, React, TanStack Query
- API: Elysia on Bun, with Eden Treaty types
- Authentication: Better Auth, email and password
- Database: SQLite through Drizzle and bun:sqlite
- Realtime: authenticated WebSockets, board topics, and heartbeat presence

Current architecture decisions are recorded in docs/adr/. ADRs 0004–0006
describe the active stack; ADRs 0001–0003 are retained as superseded history.

## Requirements

- Bun 1.4 or newer
- Node-compatible browser for the web UI

## Setup

From the repository root:

```sh
bun install
```

Create api/.env with a generated secret and the local auth URL:

```sh
BETTER_AUTH_SECRET=<at least 32 random bytes>
BETTER_AUTH_URL=http://localhost:3000
DATABASE_URL=./data/tasklane.sqlite
WEB_ORIGIN=http://localhost:3000
```

Start both services:

```sh
bun run dev
```

Open http://localhost:3000. The web server proxies /api and /ws to the API so
browser requests use same-origin cookies. The database is created by the API
migrations on first start.

## Commands

Run from the repository root:

| Command | Purpose |
| --- | --- |
| bun run dev | Start web on :3000 and API on :3001 |
| bun run typecheck | Typecheck both workspaces |
| bun run test | Run workspace tests |
| bun run build | Build the web application |
| bun run lint | Lint the web application |
| bun run check | Check formatting |
| bun run format | Format and autofix the web application |

API-specific commands can be run with bun run --cwd api <script>. TanStack
route generation is bun run --cwd app generate-routes.

## Persistence and realtime limits

SQLite is configured for WAL and foreign-key enforcement. Run a single API
process: its WebSocket topic and presence state are in memory. Multi-process
deployment requires shared realtime infrastructure.
