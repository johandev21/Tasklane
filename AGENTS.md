# Trello Clone

A project-management platform for organizing work through boards, lists, and cards.

## Layout

- Root: `docs/` (ADRs), `.agents/` (skills), `CONTEXT.md` (domain language). No `package.json` here.
- `app/`: the entire TanStack Start application — `package.json`, `src/`, `convex/`, `vite.config.ts`.

## Commands

Run all commands from `app/`. Use `pnpm` (and `pnpm dlx`) for tooling, not npm/npx.

- `pnpm dev` — dev server on port 3000
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

## Verify your work

Before declaring a task done that touched `app/`: run `pnpm typecheck`, `pnpm lint`, and `pnpm check` from `app/`.
