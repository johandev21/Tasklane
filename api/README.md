# Tasklane API

Run from `api/` using Bun. The API is independently deployable from the web app.
Verified with Bun 1.4.4; the server requires Bun because it uses `bun:sqlite` and
Bun's WebSocket topics. Run one API process against a writable, persistent SQLite
file. For a container, set `HOST=0.0.0.0`.

```sh
bun install
cp .env.example .env
# Set BETTER_AUTH_SECRET to a random value of at least 32 characters.
bun run db:migrate
bun run dev
```

The server listens on `127.0.0.1:3001` by default. `GET /api/health` returns
`{ "status": "ok" }`. Better Auth handles `/api/auth/*`, including
`POST /api/auth/sign-up/email`, `POST /api/auth/sign-in/email`,
`POST /api/auth/sign-out`, and `GET /api/auth/get-session`.
`GET /api/users/me` returns the signed-in user or `null`.

The frontend can `import type { App } from '@tasklane/api'` for Eden's `treaty<App>`.
Browser requests must include credentials. Configure the web proxy to forward
`/api` and `/ws` to port 3001, including WebSocket upgrades. Set `BETTER_AUTH_URL`
to the public web origin (default `http://localhost:3000`), and `WEB_ORIGIN` to the
allowed web origin(s), separated by commas. `DATABASE_URL` is a SQLite filename
(default `./data/tasklane.sqlite`). Pending migrations apply on startup.

## HTTP contract

All domain responses are JSON. Create routes return the new ID as a **JSON string**
(for example, `"01M5SSW8H6PDFZ34DZR5S18QGC"`), rather than an object. Other writes
return `{ "success": true }`, except attachment routes described below.

Domain rows use `id` and `createdAt` (Unix milliseconds). IDs are text ULIDs.
Optional database fields are `null`; archived cards whose list was deleted have
`listId: null`. Better Auth's user/session timestamps serialize as ISO strings.

Unauthenticated reads return `null` for a single resource, `[]` for collections,
or an empty pagination result. Authenticated non-members receive `403`; protected
writes require a session (`401`). Other domain errors are JSON `{ "error": "…" }`:
`400` for invalid values, `404` for missing resources, `409` for state conflicts,
and `422` for malformed request bodies or query parameters.

| Method             | Path                                          | Body / behavior                                                        |
| ------------------ | --------------------------------------------- | ---------------------------------------------------------------------- |
| GET, POST          | `/api/boards`                                 | List accessible boards / create with `{ name }`                        |
| GET, PATCH, DELETE | `/api/boards/:boardId`                        | Get / rename with `{ name }` / delete                                  |
| GET, POST          | `/api/boards/:boardId/lists`                  | List / create with `{ title }`                                         |
| PATCH, DELETE      | `/api/lists/:listId`                          | Rename with `{ title }` / archive cards and delete list                |
| POST               | `/api/lists/:listId/archive-cards`            | Archive active cards, retain list                                      |
| POST               | `/api/lists/:listId/reorder`                  | Ordering body below                                                    |
| GET                | `/api/boards/:boardId/cards`                  | Active cards                                                           |
| GET                | `/api/boards/:boardId/archive`                | Archived cards, newest first                                           |
| POST               | `/api/lists/:listId/cards`                    | Create with `{ title }`                                                |
| GET, PATCH         | `/api/cards/:cardId`                          | Get / rename with `{ title }`                                          |
| PUT                | `/api/cards/:cardId/description`              | `{ description?: string \| null }`; omitted/null clears                |
| PUT                | `/api/cards/:cardId/due-date`                 | `{ dueDate?: number \| null }`; Unix milliseconds; omitted/null clears |
| POST               | `/api/cards/:cardId/archive`                  | Soft delete                                                            |
| POST               | `/api/cards/:cardId/restore`                  | Restore to original or first available list                            |
| POST               | `/api/cards/:cardId/move`                     | `{ targetListId }`; append to target                                   |
| POST               | `/api/cards/:cardId/reorder`                  | `{ targetListId, ...ordering }`                                        |
| GET, POST          | `/api/boards/:boardId/labels`                 | Palette / create with `{ name, color }`                                |
| PATCH, DELETE      | `/api/labels/:labelId`                        | `{ name?, color? }` / delete palette label and attachments             |
| GET                | `/api/boards/:boardId/card-labels`            | Attachments enriched with `label`                                      |
| GET                | `/api/cards/:cardId/labels`                   | Attached palette labels                                                |
| PUT, DELETE        | `/api/cards/:cardId/labels/:labelId`          | Attach / detach, idempotently                                          |
| POST               | `/api/cards/:cardId/labels/:labelId/toggle`   | Toggle attachment                                                      |
| GET, POST          | `/api/boards/:boardId/members`                | Members, owner first / invite existing user with `{ email }`           |
| DELETE             | `/api/boards/:boardId/members/:userId`        | Remove member and board-scoped assignments/presence                    |
| GET                | `/api/boards/:boardId/assignees`              | Assignments enriched with `user`                                       |
| GET                | `/api/cards/:cardId/assignees`                | Card assignments enriched with `user`                                  |
| PUT, DELETE        | `/api/cards/:cardId/assignees/:userId`        | Assign / unassign, idempotently                                        |
| POST               | `/api/cards/:cardId/assignees/:userId/toggle` | Toggle assignment                                                      |
| GET, POST          | `/api/cards/:cardId/comments`                 | Chronological comments / add with `{ body }`                           |
| GET                | `/api/cards/:cardId/comments/page`            | Newest-first cursor pagination                                         |
| PATCH, DELETE      | `/api/comments/:commentId`                    | Edit with `{ body }` / delete, author only                             |
| GET                | `/api/boards/:boardId/comment-counts`         | Nonzero counts as `{ cardId, count }[]`                                |
| GET                | `/api/boards/:boardId/activity`               | Newest-first activity enriched with `actor`                            |
| GET                | `/api/boards/:boardId/activity/page`          | Newest-first cursor pagination                                         |
| GET                | `/api/cards/:cardId/activity`                 | Activity scoped to this card's ID                                      |
| GET, POST, DELETE  | `/api/boards/:boardId/presence`               | Viewers / heartbeat / leave                                            |

Label attachment writes return `{ attached: boolean, id: string | null }`.
Assignment writes return `{ assigned: boolean, id: string | null }`.
Palette colors are `red`, `orange`, `yellow`, `green`, `teal`, `blue`, `purple`,
and `pink`, with a maximum of eight labels per board.

Only the owner can rename/delete a board, manage its palette, or invite/remove
members. Any current member can edit lists/cards, attach labels, assign current
members (including the owner), and comment. Only a comment's author can edit or
delete it, even when another member owns the board. Member removal retains
comments and activity history.

Ordering bodies accept `{ previousId?: string | null, nextId?: string | null }`.
The server removes the moved item, inserts before a surviving next anchor or
after a surviving previous anchor, then writes consecutive integer positions in
one transaction. If both anchors disappeared, it appends; an explicit
`previousId: null` with a missing next anchor prepends. Omitting anchors appends.
For compatibility, `{ newPosition: number }` uses a clamped integer index when
no anchors are supplied. Cross-board card moves and moving archived cards are
rejected. Cross-list moves reindex both lists.

Pagination accepts `?limit=25&cursor=...` (`limit` 1–100) and returns
`{ page, isDone, continueCursor }`. Pass `continueCursor` to get the next page;
it is empty when done. Cursors are scoped to the resource, and order by
`createdAt` plus `id` for stable pagination across equal timestamps and deletions.

## Realtime

Connect to `/ws/boards/:boardId` with the Better Auth cookie. Upgrades require
current board access and a trusted browser origin. The server publishes JSON to
`board:{boardId}` after successful transactions:

```ts
{ type: 'board.changed', boardId, keys: ['lists', 'cards', 'activity'] }
{ type: 'presence.changed', boardId, viewers: [{ userId, name, email, imageUrl }] }
```

Import `BoardEvent` and `QueryKey` from `@tasklane/api` for client event types.
Invalidation keys are `boards`, `lists`, `cards`, `labels`, `cardLabels`, `members`,
`assignees`, `comments`, `commentCounts`, `activity`, and `presence`. Map these to
the corresponding frontend query keys. Reconnects should refetch board data;
events have no replay buffer.

Opening a socket records presence. Send `{ type: 'heartbeat' }` on the socket,
or POST the HTTP presence route every 20 seconds while visible. The last socket
closing removes that user's presence; closing one of several tabs preserves it.
Presence expires after 30 seconds, with a 60-second process-local sweep.
Membership and session revocation are checked before room broadcasts and during
the sweep; revoked sockets close with code `1008`. Board deletion sends one
final invalidation and closes its sockets.

## Verification and boundaries

```sh
bun run typecheck
bun test
bun run check
bun run db:generate
```

Tests use migrated temporary SQLite files, real Better Auth email/password
sessions, and live WebSocket upgrades on ephemeral ports. They cover permission
boundaries, JSON contracts, cascade deletion, rollback, archive retention,
anchor ordering, pagination, presence, and socket revocation/isolation.

`bun run db:generate` generates future schema migrations; commit both SQL and
Drizzle metadata. `bun run db:migrate` applies migrations explicitly; startup
also applies them. Database backups and deployment are operational concerns.

Password reset and verification email delivery are not configured. Realtime
topics and presence are process-local, so deployments run one API process unless
shared realtime infrastructure is added. The web app owns proxying, auth forms,
query integration, and browser interactions.
