import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import type { BoardEvent } from '../src/realtime'
import { fixture, ORIGIN } from './helpers'
import type { Fixture, TestUser } from './helpers'

async function connect(
  f: Fixture,
  boardId: string,
  actor?: TestUser,
  origin = ORIGIN,
) {
  const socket = new WebSocket(
    `ws://127.0.0.1:${f.app.server!.port}/ws/boards/${boardId}`,
    {
      headers: { origin, ...(actor ? { cookie: actor.cookie } : {}) },
    },
  )
  const messages: BoardEvent[] = []
  const waiters = new Set<() => void>()
  socket.addEventListener('message', (event) => {
    messages.push(JSON.parse(String(event.data)) as BoardEvent)
    for (const notify of waiters) notify()
  })
  const closed = new Promise<CloseEvent>((resolve) =>
    socket.addEventListener('close', resolve, { once: true }),
  )
  const opened = new Promise<boolean>((resolve) => {
    socket.addEventListener('open', () => resolve(true), { once: true })
    socket.addEventListener('error', () => resolve(false), { once: true })
  })
  async function next(match: (event: BoardEvent) => boolean) {
    return new Promise<BoardEvent>((resolve, reject) => {
      const timeout = setTimeout(() => {
        waiters.delete(check)
        reject(new Error('Timed out waiting for board event'))
      }, 2000)
      function check() {
        const index = messages.findIndex(match)
        if (index < 0) return
        const event = messages.splice(index, 1)[0]!
        clearTimeout(timeout)
        waiters.delete(check)
        resolve(event)
      }
      waiters.add(check)
      check()
    })
  }
  return { socket, messages, opened, closed, next }
}

describe('authenticated WebSocket board rooms', () => {
  let f: Fixture
  beforeEach(async () => {
    f = await fixture()
    f.app.listen({ hostname: '127.0.0.1', port: 0 })
  })
  afterEach(async () => {
    await f.close()
  })

  test('rejects unauthenticated, non-member, nonexistent-board, and foreign-origin upgrades', async () => {
    const boardId = await f.board()
    for (const [id, actor, origin] of [
      [boardId, undefined, ORIGIN],
      [boardId, f.eve, ORIGIN],
      ['missing', f.alice, ORIGIN],
      [boardId, f.alice, 'https://untrusted.example'],
    ] as const) {
      const client = await connect(f, id, actor, origin)
      expect(await client.opened).toBe(false)
      await client.closed
    }
  })

  test('joins presence on open, broadcasts committed mutations to both board members, and isolates other boards', async () => {
    const boardId = await f.board()
    await f.invite(boardId)
    const other = await f.board(f.eve, 'Other')
    const alice = await connect(f, boardId, f.alice)
    const bob = await connect(f, boardId, f.bob)
    const eve = await connect(f, other, f.eve)
    expect(await alice.opened).toBe(true)
    expect(await bob.opened).toBe(true)
    expect(await eve.opened).toBe(true)
    const snapshot = await alice.next(
      (event) =>
        event.type === 'presence.changed' && event.viewers.length === 2,
    )
    expect(snapshot).toMatchObject({ type: 'presence.changed', boardId })
    const listId = await f.list(boardId)
    for (const client of [alice, bob]) {
      const event = await client.next(
        (event) =>
          event.type === 'board.changed' && event.keys.includes('lists'),
      )
      expect(event).toMatchObject({
        type: 'board.changed',
        boardId,
        keys: expect.arrayContaining(['lists', 'activity']),
      })
      expect(
        await f.json('GET', `/api/boards/${boardId}/lists`, f.bob),
      ).toEqual([expect.objectContaining({ id: listId })])
    }
    expect(eve.messages.every((event) => event.boardId === other)).toBe(true)
  })

  test('retains presence while another tab remains and removes it on the final close', async () => {
    const boardId = await f.board()
    const first = await connect(f, boardId, f.alice)
    const second = await connect(f, boardId, f.alice)
    await Promise.all([first.opened, second.opened])
    await second.next((event) => event.type === 'presence.changed')
    first.socket.close(1000)
    await first.closed
    expect(
      await f.json('GET', `/api/boards/${boardId}/presence`, f.alice),
    ).toHaveLength(1)
    second.socket.close(1000)
    await second.closed
    expect(
      await f.json('GET', `/api/boards/${boardId}/presence`, f.alice),
    ).toEqual([])
  })

  test('accepts only heartbeat messages and refreshes authorized presence', async () => {
    const boardId = await f.board()
    const client = await connect(f, boardId, f.alice)
    expect(await client.opened).toBe(true)
    await client.next((event) => event.type === 'presence.changed')
    client.socket.send(JSON.stringify({ type: 'heartbeat' }))
    expect(
      await client.next((event) => event.type === 'presence.changed'),
    ).toMatchObject({ boardId })
    expect(
      await f.json('GET', `/api/boards/${boardId}/presence`, f.alice),
    ).toHaveLength(1)
  })

  test('evicts removed members before publishing later changes and clears their presence', async () => {
    const boardId = await f.board()
    await f.invite(boardId)
    const alice = await connect(f, boardId, f.alice)
    const bob = await connect(f, boardId, f.bob)
    await Promise.all([alice.opened, bob.opened])
    await bob.next(
      (event) =>
        event.type === 'presence.changed' && event.viewers.length === 2,
    )
    await f.json(
      'DELETE',
      `/api/boards/${boardId}/members/${f.bob.id}`,
      f.alice,
    )
    expect((await bob.closed).code).toBe(1008)
    await f.list(boardId)
    await alice.next(
      (event) => event.type === 'board.changed' && event.keys.includes('lists'),
    )
    expect(bob.messages.some((event) => event.type === 'board.changed')).toBe(
      false,
    )
    expect(
      await f.json('GET', `/api/boards/${boardId}/presence`, f.alice),
    ).toEqual([expect.objectContaining({ userId: f.alice.id })])
  })

  test('revoked sessions are evicted before broadcasting and on the periodic authorization sweep', async () => {
    const boardId = await f.board()
    await f.invite(boardId)
    const bob = await connect(f, boardId, f.bob)
    expect(await bob.opened).toBe(true)
    await bob.next((event) => event.type === 'presence.changed')
    await f.json('POST', '/api/auth/sign-out', f.bob, {})
    await f.list(boardId)
    expect((await bob.closed).code).toBe(1008)
    expect(bob.messages.some((event) => event.type === 'board.changed')).toBe(
      false,
    )
    const alice = await connect(f, boardId, f.alice)
    expect(await alice.opened).toBe(true)
    await f.json('POST', '/api/auth/sign-out', f.alice, {})
    f.sweep()
    expect((await alice.closed).code).toBe(1008)
  })

  test('board deletion notifies current viewers and closes the room', async () => {
    const boardId = await f.board()
    const client = await connect(f, boardId, f.alice)
    expect(await client.opened).toBe(true)
    await f.json('DELETE', `/api/boards/${boardId}`, f.alice)
    expect(
      await client.next((event) => event.type === 'board.changed'),
    ).toMatchObject({ boardId, keys: ['boards'] })
    expect((await client.closed).code).toBe(1008)
  })
})
