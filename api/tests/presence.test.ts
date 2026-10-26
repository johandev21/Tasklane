import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { and, eq } from 'drizzle-orm'
import {
  PRESENCE_ACTIVE_THRESHOLD_MS,
  PRESENCE_SWEEP_INTERVAL_MS,
} from '../src/constants'
import { presence } from '../src/db/schema'
import { fixture } from './helpers'
import type { Fixture } from './helpers'

describe('presence heartbeat and sweep', () => {
  let f: Fixture
  beforeEach(async () => {
    f = await fixture()
  })
  afterEach(async () => {
    await f.close()
  })

  test('upserts one row per board/member and publishes member-only viewer snapshots', async () => {
    const boardId = await f.board()
    await f.invite(boardId)
    const events: { topic: string; payload: unknown }[] = []
    f.services.rooms.publish = (topic, payload) =>
      events.push({ topic, payload: JSON.parse(payload) })
    await f.json('POST', `/api/boards/${boardId}/presence`, f.alice)
    await f.json('POST', `/api/boards/${boardId}/presence`, f.alice)
    await f.json('POST', `/api/boards/${boardId}/presence`, f.bob)
    expect(f.connection.db.select().from(presence).all()).toHaveLength(2)
    expect(
      await f.json('GET', `/api/boards/${boardId}/presence`, f.alice),
    ).toEqual([
      expect.objectContaining({ userId: f.alice.id, name: 'Alice' }),
      expect.objectContaining({ userId: f.bob.id, name: 'Bob' }),
    ])
    expect(events.at(-1)).toMatchObject({
      topic: `board:${boardId}`,
      payload: { type: 'presence.changed', boardId },
    })
    expect(
      (await f.request('POST', `/api/boards/${boardId}/presence`, f.eve))
        .status,
    ).toBe(403)
    expect(
      (await f.request('GET', `/api/boards/${boardId}/presence`, f.eve)).status,
    ).toBe(403)
    await f.json('DELETE', `/api/boards/${boardId}/presence`, f.bob)
    expect(
      await f.json('GET', `/api/boards/${boardId}/presence`, f.alice),
    ).toHaveLength(1)
  })

  test('filters stale and non-member heartbeats and sweeps without removing fresh entries', async () => {
    const boardId = await f.board()
    await f.invite(boardId)
    await f.json('POST', `/api/boards/${boardId}/presence`, f.alice)
    await f.json('POST', `/api/boards/${boardId}/presence`, f.bob)
    f.connection.db
      .update(presence)
      .set({ lastSeen: Date.now() - 60_000 })
      .where(and(eq(presence.boardId, boardId), eq(presence.userId, f.bob.id)))
      .run()
    f.connection.db
      .insert(presence)
      .values({ boardId, userId: f.eve.id, lastSeen: Date.now() })
      .run()
    expect(
      await f.json('GET', `/api/boards/${boardId}/presence`, f.alice),
    ).toEqual([expect.objectContaining({ userId: f.alice.id })])
    f.sweep()
    expect(
      f.connection.db
        .select()
        .from(presence)
        .all()
        .some((row) => row.userId === f.bob.id),
    ).toBe(false)
    expect(
      await f.json('GET', `/api/boards/${boardId}/presence`, f.alice),
    ).toHaveLength(1)
    expect(PRESENCE_ACTIVE_THRESHOLD_MS).toBe(30_000)
    expect(PRESENCE_SWEEP_INTERVAL_MS).toBe(60_000)
  })
})
