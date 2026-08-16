---
name: missing-non-happy-states
description: Audit and improve frontend features for complete non-happy-state coverage, including loading, empty, error, retry, offline, partial, unauthorized, malformed-data, and recovery states. Use when building, reviewing, debugging, or testing data-driven UI, forms, async actions, dashboards, lists, search, authentication flows, or generated frontend code that may only implement the polished success path.
---

# Missing Non-Happy States

## Purpose

Treat UI correctness as the full set of states a user can experience, not the screenshot of a successful request. Make failure and recovery paths explicit, accessible, actionable, and testable.

## Workflow

### 1. Inventory stateful boundaries

Find every boundary that can wait, fail, return no data, return incomplete data, or require permission: fetches, mutations, uploads, pagination, search, filters, auth, routes, browser APIs, and third-party integrations. Inspect existing query/mutation state, not only rendered markup.

### 2. Build a state matrix

For each boundary, record the state, user-visible result, allowed actions, announcement/focus behavior, and data assumptions. At minimum cover:

- initial/loading and refresh-in-progress
- success with data, success with zero results, and success with partial data
- recoverable error with retry, terminal error, timeout, offline, and unauthorized/forbidden
- malformed or unexpected payload, stale data, duplicate submission, and cancellation
- mutation pending, success, failure, and rollback/optimistic divergence

Do not collapse distinct meanings into one generic `isLoading` or permanent spinner. Preserve usable stale data while refreshing when appropriate.

### 3. Implement recovery as a first-class path

Give each recoverable state a clear explanation and an action that can actually change the outcome. Make retry idempotent, prevent duplicate submissions, preserve user input where safe, and avoid exposing raw technical errors. Keep error handling near the boundary that owns recovery while allowing shared error UI to remain consistent.

For accessibility, use meaningful text, status/alert semantics appropriate to urgency, keyboard-operable controls, visible focus, and deliberate focus movement after major transitions. Never rely on color, an icon, or a spinner alone.

### 4. Verify beyond the happy fixture

Use the narrowest effective external oracle for each risk:

- component tests for deterministic state rendering and event behavior
- network/fault simulation for delay, timeout, rejection, offline, malformed, partial, and reordered responses
- browser E2E for retry, reload, navigation, auth, focus, duplicate-action, and recovery workflows
- accessibility checks plus keyboard assertions for every recovery action
- fixtures for empty, extreme, stale, unauthorized, long, localized, and unexpected data

Check that recovery succeeds, not merely that an error appears. Assert no permanent spinner, no dead-end screen, no lost input without warning, no duplicate request, and no console error caused by the tested transition.

## Review output

Report:

- uncovered state boundaries and severity
- implemented states and their recovery actions
- verification performed and its limits
- remaining assumptions requiring product or human judgment
