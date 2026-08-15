import { describe, it, expect } from 'vitest'
import { convexTest } from 'convex-test'
import schema from './schema'
import { api } from './_generated/api'

describe('presence', () => {
  it('upserts a single heartbeat row per member per board', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Active Board',
    })

    await asAlice.mutation(api.presence.heartbeat, { boardId })

    const afterFirst = await t.run(async (ctx) => {
      return await ctx.db
        .query('presence')
        .withIndex('by_boardId', (q) => q.eq('boardId', boardId))
        .collect()
    })
    expect(afterFirst).toHaveLength(1)
    const firstSeen = afterFirst[0].lastSeen

    // A second heartbeat must update in place, not duplicate
    await asAlice.mutation(api.presence.heartbeat, { boardId })

    const afterSecond = await t.run(async (ctx) => {
      return await ctx.db
        .query('presence')
        .withIndex('by_boardId', (q) => q.eq('boardId', boardId))
        .collect()
    })
    expect(afterSecond).toHaveLength(1)
    expect(afterSecond[0].userId).toBe('clerk|user_alice')
    expect(afterSecond[0].lastSeen).toBeGreaterThanOrEqual(firstSeen)
  })

  it('sweeps stale heartbeats and keeps fresh ones', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Sweep Board',
    })

    // Seed one stale and one fresh heartbeat directly
    await t.run(async (ctx) => {
      await ctx.db.insert('presence', {
        boardId,
        userId: 'clerk|user_alice',
        lastSeen: Date.now() - 60_000,
      })
      await ctx.db.insert('presence', {
        boardId,
        userId: 'clerk|user_bob',
        lastSeen: Date.now(),
      })
    })

    const deleted = await asAlice.mutation(api.presence.sweepStale, {})
    expect(deleted).toBe(1)

    const remaining = await t.run(async (ctx) => {
      return await ctx.db
        .query('presence')
        .withIndex('by_boardId', (q) => q.eq('boardId', boardId))
        .collect()
    })
    expect(remaining).toHaveLength(1)
    expect(remaining[0].userId).toBe('clerk|user_bob')
  })

  it('lists only viewers whose heartbeat is within the active threshold', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })

    await asAlice.mutation(api.users.upsertUser, {
      name: 'Alice Wonderland',
      email: 'alice@example.com',
      imageUrl: 'https://example.com/alice.jpg',
    })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Viewers Board',
    })

    // Alice is active (fresh heartbeat), Bob's heartbeat is stale
    await asAlice.mutation(api.presence.heartbeat, { boardId })
    await t.run(async (ctx) => {
      await ctx.db.insert('presence', {
        boardId,
        userId: 'clerk|user_bob',
        lastSeen: Date.now() - 60_000,
      })
    })

    const viewers = await asAlice.query(api.presence.list, { boardId })
    expect(viewers).toHaveLength(1)
    expect(viewers[0]).toEqual({
      userId: 'clerk|user_alice',
      name: 'Alice Wonderland',
      email: 'alice@example.com',
      imageUrl: 'https://example.com/alice.jpg',
    })
  })

  it('denies non-members from heartbeating or listing presence', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })
    const asCharlie = t.withIdentity({ tokenIdentifier: 'clerk|user_charlie' })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Private Board',
    })

    await expect(
      asCharlie.mutation(api.presence.heartbeat, { boardId }),
    ).rejects.toThrow('Unauthorized: user is not a member of this board')

    await expect(
      asCharlie.query(api.presence.list, { boardId }),
    ).rejects.toThrow('Unauthorized: user is not a member of this board')
  })

  it('allows board members to heartbeat and appear in the strip', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })
    const asBob = t.withIdentity({ tokenIdentifier: 'clerk|user_bob' })

    await asAlice.mutation(api.users.upsertUser, {
      name: 'Alice',
      email: 'alice@example.com',
    })
    await asBob.mutation(api.users.upsertUser, {
      name: 'Bob',
      email: 'bob@example.com',
    })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Collab Board',
    })
    await asAlice.mutation(api.members.inviteByEmail, {
      boardId,
      email: 'bob@example.com',
    })

    // Both members are viewing
    await asAlice.mutation(api.presence.heartbeat, { boardId })
    await asBob.mutation(api.presence.heartbeat, { boardId })

    const viewers = await asAlice.query(api.presence.list, { boardId })
    expect(viewers).toHaveLength(2)
    expect(viewers.map((v) => v.userId).sort()).toEqual([
      'clerk|user_alice',
      'clerk|user_bob',
    ])
  })
})
