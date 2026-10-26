import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { cards } from '../src/db/schema'
import { fixture } from './helpers'
import type { Fixture } from './helpers'

type Card = typeof cards.$inferSelect

describe('lists, cards, archive, and anchor ordering', () => {
  let f: Fixture
  beforeEach(async () => {
    f = await fixture()
  })
  afterEach(async () => {
    await f.close()
  })

  test('members create and rename lists and cards with sequential positions', async () => {
    const boardId = await f.board()
    await f.invite(boardId)
    const listId = await f.list(boardId, '  Backlog  ', f.bob)
    const cardId = await f.card(listId, '  First  ', f.bob)
    await f.card(listId, 'Second', f.bob)
    expect(
      await f.json('GET', `/api/boards/${boardId}/cards`, f.alice),
    ).toEqual([
      expect.objectContaining({
        id: cardId,
        title: 'First',
        position: 0,
        archived: false,
      }),
      expect.objectContaining({ title: 'Second', position: 1 }),
    ])
    await f.json('PATCH', `/api/lists/${listId}`, f.bob, { title: '  Doing  ' })
    await f.json('PATCH', `/api/cards/${cardId}`, f.bob, { title: 'Renamed' })
    expect(
      await f.json('GET', `/api/boards/${boardId}/lists`, f.alice),
    ).toEqual([expect.objectContaining({ title: 'Doing' })])
    expect(await f.json('GET', `/api/cards/${cardId}`, f.alice)).toMatchObject({
      title: 'Renamed',
    })
    expect(
      (
        await f.request('POST', `/api/boards/${boardId}/lists`, f.alice, {
          title: ' ',
        })
      ).status,
    ).toBe(400)
    expect(
      (
        await f.request('POST', `/api/lists/${listId}/cards`, f.alice, {
          title: ' ',
        })
      ).status,
    ).toBe(400)
    expect(
      (await f.request('PATCH', `/api/cards/${cardId}`, f.bob, { title: ' ' }))
        .status,
    ).toBe(400)
  })

  test('sets and clears descriptions and due dates with the original activity verbs', async () => {
    const boardId = await f.board()
    const cardId = await f.card(await f.list(boardId))
    await f.json('PUT', `/api/cards/${cardId}/description`, f.alice, {
      description: '## Details',
    })
    for (const dueDate of [123, 456, 456, null])
      await f.json('PUT', `/api/cards/${cardId}/due-date`, f.alice, { dueDate })
    expect(await f.json('GET', `/api/cards/${cardId}`, f.alice)).toMatchObject({
      description: '## Details',
      dueDate: null,
    })
    await f.json('PUT', `/api/cards/${cardId}/description`, f.alice, {})
    expect(await f.json('GET', `/api/cards/${cardId}`, f.alice)).toMatchObject({
      description: null,
    })
    const events = await f.json<
      { type: string; payload: Record<string, unknown> }[]
    >('GET', `/api/cards/${cardId}/activity`, f.alice)
    expect(
      events
        .filter((event) => event.type.startsWith('due_date_'))
        .map((event) => event.type),
    ).toEqual(['due_date_cleared', 'due_date_changed', 'due_date_set'])
    expect(events.every((event) => event.payload.cardId === cardId)).toBe(true)
    expect(
      (
        await f.request('PUT', `/api/cards/${cardId}/due-date`, f.alice, {
          dueDate: 'tomorrow',
        })
      ).status,
    ).toBe(422)
  })

  test('archives without deleting cards and restores at the end of the original list', async () => {
    const boardId = await f.board()
    const listId = await f.list(boardId)
    const a = await f.card(listId, 'A')
    await f.card(listId, 'B')
    await f.json('POST', `/api/cards/${a}/archive`, f.alice)
    expect(
      await f.json('GET', `/api/boards/${boardId}/cards`, f.alice),
    ).toHaveLength(1)
    expect(
      await f.json('GET', `/api/boards/${boardId}/archive`, f.alice),
    ).toEqual([expect.objectContaining({ id: a, archived: true })])
    expect(
      f.connection.db.select().from(cards).where(eq(cards.id, a)).get(),
    ).toBeDefined()
    await f.json('POST', `/api/cards/${a}/restore`, f.alice)
    expect(await f.json('GET', `/api/cards/${a}`, f.alice)).toMatchObject({
      archived: false,
      position: 2,
      listId,
    })
    await f.json('POST', `/api/cards/${a}/restore`, f.alice)
    expect(await f.json('GET', `/api/cards/${a}`, f.alice)).toMatchObject({
      position: 2,
    })
  })

  test('list deletion keeps card contents and links, uses a surviving list on restore, and fails safely with no lists', async () => {
    const boardId = await f.board()
    const original = await f.list(boardId)
    const cardId = await f.card(original)
    await f.json('PUT', `/api/cards/${cardId}/description`, f.alice, {
      description: 'Retain this',
    })
    await f.json('POST', `/api/cards/${cardId}/comments`, f.alice, {
      body: 'Retain me too',
    })
    await f.json('DELETE', `/api/lists/${original}`, f.alice)
    expect(await f.json('GET', `/api/cards/${cardId}`, f.alice)).toMatchObject({
      archived: true,
      listId: null,
      description: 'Retain this',
    })
    expect(
      await f.json('GET', `/api/cards/${cardId}/comments`, f.alice),
    ).toHaveLength(1)
    expect(
      (await f.request('POST', `/api/cards/${cardId}/restore`, f.alice)).status,
    ).toBe(409)
    const replacement = await f.list(boardId, 'Replacement')
    await f.json('POST', `/api/cards/${cardId}/restore`, f.alice)
    expect(await f.json('GET', `/api/cards/${cardId}`, f.alice)).toMatchObject({
      archived: false,
      listId: replacement,
      position: 0,
    })
  })

  test('bulk archive preserves the list and emits activity only when cards change', async () => {
    const boardId = await f.board()
    const listId = await f.list(boardId)
    await f.card(listId)
    await f.card(listId, 'Second')
    await f.json('POST', `/api/lists/${listId}/archive-cards`, f.alice)
    await f.json('POST', `/api/lists/${listId}/archive-cards`, f.alice)
    expect(
      await f.json('GET', `/api/boards/${boardId}/lists`, f.alice),
    ).toHaveLength(1)
    expect(
      await f.json('GET', `/api/boards/${boardId}/archive`, f.alice),
    ).toHaveLength(2)
    const events = await f.json<{ type: string; payload: unknown }[]>(
      'GET',
      `/api/boards/${boardId}/activity`,
      f.alice,
    )
    expect(events.filter((event) => event.type === 'card_archived')).toEqual([
      expect.objectContaining({
        payload: { listId, listTitle: 'Backlog', count: 2 },
      }),
    ])
  })

  test('reorders lists using current anchors, surviving anchors, and clamped legacy positions', async () => {
    const boardId = await f.board()
    const a = await f.list(boardId, 'A')
    const b = await f.list(boardId, 'B')
    const c = await f.list(boardId, 'C')
    await f.json('POST', `/api/lists/${c}/reorder`, f.alice, {
      previousId: a,
      nextId: b,
    })
    expect(
      await f.json('GET', `/api/boards/${boardId}/lists`, f.alice),
    ).toEqual([
      expect.objectContaining({ id: a, position: 0 }),
      expect.objectContaining({ id: c, position: 1 }),
      expect.objectContaining({ id: b, position: 2 }),
    ])
    await f.json('POST', `/api/lists/${b}/reorder`, f.alice, {
      previousId: 'removed',
      nextId: a,
    })
    await f.json('POST', `/api/lists/${a}/reorder`, f.alice, {
      newPosition: 999,
    })
    expect(
      (
        await f.json<{ id: string; position: number }[]>(
          'GET',
          `/api/boards/${boardId}/lists`,
          f.alice,
        )
      ).map((list) => list.id),
    ).toEqual([b, c, a])
    expect(
      (
        await f.request('POST', `/api/lists/${a}/reorder`, f.alice, {
          previousId: a,
        })
      ).status,
    ).toBe(400)
    expect(
      (await f.request('POST', `/api/lists/${a}/reorder`, f.eve, {})).status,
    ).toBe(403)
  })

  test('card anchor moves reindex both lists and log cross-list movement only', async () => {
    const boardId = await f.board()
    const source = await f.list(boardId, 'Source')
    const target = await f.list(boardId, 'Target')
    const a = await f.card(source, 'A')
    const b = await f.card(source, 'B')
    const x = await f.card(target, 'X')
    const y = await f.card(target, 'Y')
    await f.json('POST', `/api/cards/${a}/reorder`, f.alice, {
      targetListId: target,
      previousId: x,
      nextId: y,
    })
    const boardCards = await f.json<Card[]>(
      'GET',
      `/api/boards/${boardId}/cards`,
      f.alice,
    )
    expect(boardCards.filter((card) => card.listId === source)).toEqual([
      expect.objectContaining({ id: b, position: 0 }),
    ])
    expect(boardCards.filter((card) => card.listId === target)).toEqual([
      expect.objectContaining({ id: x, position: 0 }),
      expect.objectContaining({ id: a, position: 1 }),
      expect.objectContaining({ id: y, position: 2 }),
    ])
    await f.json('POST', `/api/cards/${y}/reorder`, f.alice, {
      targetListId: target,
      previousId: null,
      nextId: x,
    })
    expect(
      (await f.json<Card[]>('GET', `/api/boards/${boardId}/cards`, f.alice))
        .filter((card) => card.listId === target)
        .map((card) => card.id),
    ).toEqual([y, x, a])
    const events = await f.json<{ type: string; payload: unknown }[]>(
      'GET',
      `/api/boards/${boardId}/activity`,
      f.alice,
    )
    expect(events.filter((event) => event.type === 'card_moved')).toEqual([
      expect.objectContaining({
        payload: expect.objectContaining({
          sourceListId: source,
          targetListId: target,
          newPosition: 1,
        }),
      }),
    ])
  })

  test('concurrent anchor moves and missing anchors retain every card with consecutive unique positions', async () => {
    const boardId = await f.board()
    const listId = await f.list(boardId)
    const ids = await Promise.all(
      ['A', 'B', 'C', 'D'].map((title) => f.card(listId, title)),
    )
    await Promise.all([
      f.json('POST', `/api/cards/${ids[2]}/reorder`, f.alice, {
        targetListId: listId,
        previousId: ids[0],
        nextId: ids[1],
      }),
      f.json('POST', `/api/cards/${ids[3]}/reorder`, f.alice, {
        targetListId: listId,
        previousId: ids[0],
        nextId: ids[1],
      }),
    ])
    await f.json('POST', `/api/cards/${ids[0]}/reorder`, f.alice, {
      targetListId: listId,
      previousId: 'deleted',
      nextId: 'moved-away',
    })
    const rows = await f.json<Card[]>(
      'GET',
      `/api/boards/${boardId}/cards`,
      f.alice,
    )
    expect(rows.map((row) => row.position)).toEqual([0, 1, 2, 3])
    expect(new Set(rows.map((row) => row.id))).toEqual(new Set(ids))
    expect(rows.at(-1)!.id).toBe(ids[0]!)
  })

  test('moves to list end, rejects cross-board or archived moves, and preserves source data on rejection', async () => {
    const boardId = await f.board()
    const listId = await f.list(boardId)
    const target = await f.list(boardId, 'Target')
    const cardId = await f.card(listId)
    await f.card(target)
    await f.json('POST', `/api/cards/${cardId}/move`, f.alice, {
      targetListId: target,
    })
    expect(await f.json('GET', `/api/cards/${cardId}`, f.alice)).toMatchObject({
      listId: target,
      position: 1,
    })
    const other = await f.list(await f.board(f.alice, 'Other'))
    expect(
      (
        await f.request('POST', `/api/cards/${cardId}/reorder`, f.alice, {
          targetListId: other,
          newPosition: 0,
        })
      ).status,
    ).toBe(400)
    expect(await f.json('GET', `/api/cards/${cardId}`, f.alice)).toMatchObject({
      listId: target,
    })
    await f.json('POST', `/api/cards/${cardId}/archive`, f.alice)
    expect(
      (
        await f.request('POST', `/api/cards/${cardId}/move`, f.alice, {
          targetListId: listId,
        })
      ).status,
    ).toBe(409)
  })
})
