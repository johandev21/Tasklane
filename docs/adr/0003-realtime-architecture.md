# Realtime architecture: Convex reactive queries, optimistic mutations, anchor-based ordering

All Board-scoped reads are live Convex queries: a client subscribes once and Convex pushes the new result whenever the underlying data changes, so every Member viewing a Board sees edits as they happen without any socket code in our app. Board creation and Member management are Convex mutations guarded by Clerk-authenticated identity (ADR 0002). Card and List writes use Convex's optimistic mutation semantics: useMutation applies the change immediately and reconciles to the server's committed version on rejection.

Card and List ordering uses anchor-based moves over plain integer positions: a client states its intent as "move X between P and N", and the server resolves the anchor against its own view, reindexes 0..n-1, and commits; the reactive query then delivers the new order to every subscriber. This keeps the list consistent under concurrent drags without fractional positions or absolute-index races.

Presence (the active-member strip) is modeled as a `presence` table of recent heartbeats rather than socket join/leave events: Members upsert a row on activity and a background sweep evicts stale entries, so "who is viewing this Board" is derived from a live Convex query like any other data.
