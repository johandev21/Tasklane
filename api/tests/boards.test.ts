import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import * as schema from '../src/db/schema'
import { fixture } from './helpers'
import type { Fixture } from './helpers'

describe('boards and access rules', () => {
  let f: Fixture
  beforeEach(async () => {
    f = await fixture()
  })
  afterEach(async () => {
    await f.close()
  })

  test('creates trimmed boards with owner and initial activity; dashboard counts include only active cards', async () => {
    const boardId = await f.board(f.alice, '  Roadmap  ')
    const listId = await f.list(boardId)
    const cardId = await f.card(listId)
    await f.card(listId, 'Second card')
    await f.json('POST', `/api/cards/${cardId}/archive`, f.alice)
    await f.invite(boardId)
    expect(
      await f.json('GET', `/api/boards/${boardId}`, f.alice),
    ).toMatchObject({
      id: boardId,
      name: 'Roadmap',
      ownerId: f.alice.id,
      isOwner: true,
    })
    expect(await f.json('GET', '/api/boards', f.bob)).toEqual([
      expect.objectContaining({
        id: boardId,
        isOwner: false,
        memberCount: 2,
        listsCount: 1,
        cardsCount: 1,
        lists: [{ name: 'Backlog', cardsCount: 1 }],
      }),
    ])
    expect(await f.json('GET', '/api/boards', f.eve)).toEqual([])
    const rows = f.connection.db
      .select()
      .from(schema.activity)
      .where(eq(schema.activity.boardId, boardId))
      .all()
    expect(rows[0]).toMatchObject({
      type: 'board_created',
      actorId: f.alice.id,
      payload: { boardName: 'Roadmap' },
    })
  })

  test('all unauthenticated board-scoped reads return empty data instead of authorization errors', async () => {
    const boardId = await f.board()
    const listId = await f.list(boardId)
    const cardId = await f.card(listId)
    for (const path of [
      '/api/boards',
      ...[
        'lists',
        'cards',
        'archive',
        'labels',
        'card-labels',
        'members',
        'assignees',
        'comment-counts',
        'activity',
        'presence',
      ].map((name) => `/api/boards/${boardId}/${name}`),
      ...['labels', 'assignees', 'comments', 'activity'].map(
        (name) => `/api/cards/${cardId}/${name}`,
      ),
    ]) {
      expect(await f.json('GET', path)).toEqual([])
    }
    for (const path of [
      `/api/boards/${boardId}/activity/page`,
      `/api/cards/${cardId}/comments/page`,
    ]) {
      expect(await f.json('GET', path)).toEqual({
        page: [],
        isDone: true,
        continueCursor: '',
      })
    }
  })

  test('all domain writes require a session', async () => {
    const boardId = await f.board()
    const listId = await f.list(boardId)
    const cardId = await f.card(listId)
    const cases: [string, string, unknown?][] = [
      ['POST', '/api/boards', { name: 'Denied' }],
      ['PATCH', `/api/boards/${boardId}`, { name: 'Denied' }],
      ['DELETE', `/api/boards/${boardId}`],
      ['POST', `/api/boards/${boardId}/lists`, { title: 'Denied' }],
      ['PATCH', `/api/lists/${listId}`, { title: 'Denied' }],
      ['DELETE', `/api/lists/${listId}`],
      ['POST', `/api/lists/${listId}/archive-cards`],
      ['POST', `/api/lists/${listId}/reorder`, {}],
      ['POST', `/api/lists/${listId}/cards`, { title: 'Denied' }],
      ['PATCH', `/api/cards/${cardId}`, { title: 'Denied' }],
      ['PUT', `/api/cards/${cardId}/description`, { description: 'Denied' }],
      ['PUT', `/api/cards/${cardId}/due-date`, { dueDate: 123 }],
      ['POST', `/api/cards/${cardId}/archive`],
      ['POST', `/api/cards/${cardId}/restore`],
      ['POST', `/api/cards/${cardId}/move`, { targetListId: listId }],
      ['POST', `/api/cards/${cardId}/reorder`, { targetListId: listId }],
      [
        'POST',
        `/api/boards/${boardId}/labels`,
        { name: 'Denied', color: 'red' },
      ],
      ['PATCH', '/api/labels/missing', { name: 'Denied' }],
      ['DELETE', '/api/labels/missing'],
      ['PUT', `/api/cards/${cardId}/labels/missing`],
      ['DELETE', `/api/cards/${cardId}/labels/missing`],
      ['POST', `/api/cards/${cardId}/labels/missing/toggle`],
      ['POST', `/api/boards/${boardId}/members`, { email: f.bob.email }],
      ['DELETE', `/api/boards/${boardId}/members/${f.bob.id}`],
      ['PUT', `/api/cards/${cardId}/assignees/${f.bob.id}`],
      ['DELETE', `/api/cards/${cardId}/assignees/${f.bob.id}`],
      ['POST', `/api/cards/${cardId}/assignees/${f.bob.id}/toggle`],
      ['POST', `/api/cards/${cardId}/comments`, { body: 'Denied' }],
      ['PATCH', '/api/comments/missing', { body: 'Denied' }],
      ['DELETE', '/api/comments/missing'],
      ['POST', `/api/boards/${boardId}/presence`],
      ['DELETE', `/api/boards/${boardId}/presence`],
    ]
    for (const [method, path, body] of cases)
      expect((await f.request(method, path, undefined, body)).status).toBe(401)
  })

  test('non-members cannot read or mutate nested resources', async () => {
    const boardId = await f.board()
    const listId = await f.list(boardId)
    const cardId = await f.card(listId)
    for (const path of [
      `/api/boards/${boardId}`,
      ...[
        'lists',
        'cards',
        'labels',
        'members',
        'assignees',
        'activity',
        'presence',
        'comment-counts',
      ].map((name) => `/api/boards/${boardId}/${name}`),
      `/api/cards/${cardId}`,
      ...['comments', 'labels', 'assignees', 'activity'].map(
        (name) => `/api/cards/${cardId}/${name}`,
      ),
    ])
      expect((await f.request('GET', path, f.eve)).status).toBe(403)
    expect(
      (
        await f.request('POST', `/api/boards/${boardId}/lists`, f.eve, {
          title: 'Denied',
        })
      ).status,
    ).toBe(403)
    expect(
      (
        await f.request('PATCH', `/api/cards/${cardId}`, f.eve, {
          title: 'Denied',
        })
      ).status,
    ).toBe(403)
  })

  test('only owners rename or delete boards; owner changes create activity', async () => {
    const boardId = await f.board()
    await f.invite(boardId)
    expect(
      (
        await f.request('PATCH', `/api/boards/${boardId}`, f.bob, {
          name: 'Denied',
        })
      ).status,
    ).toBe(403)
    expect(
      (await f.request('DELETE', `/api/boards/${boardId}`, f.bob)).status,
    ).toBe(403)
    await f.json('PATCH', `/api/boards/${boardId}`, f.alice, {
      name: '  New name  ',
    })
    expect(await f.json('GET', `/api/boards/${boardId}`, f.bob)).toMatchObject({
      name: 'New name',
      isOwner: false,
    })
    const activity = await f.json<{ type: string; payload: unknown }[]>(
      'GET',
      `/api/boards/${boardId}/activity`,
      f.alice,
    )
    expect(activity[0]).toMatchObject({
      type: 'board_renamed',
      payload: { oldName: 'Roadmap', newName: 'New name' },
    })
    expect(
      (
        await f.request('PATCH', `/api/boards/${boardId}`, f.alice, {
          name: '  ',
        })
      ).status,
    ).toBe(400)
    expect(
      (await f.request('POST', '/api/boards', f.alice, { name: '' })).status,
    ).toBe(400)
  })

  test('board deletion cascades domain rows while retaining users and unrelated boards', async () => {
    const boardId = await f.board()
    const otherBoardId = await f.board(f.alice, 'Keep')
    await f.invite(boardId)
    const listId = await f.list(boardId)
    const cardId = await f.card(listId)
    const labelId = await f.json<string>(
      'POST',
      `/api/boards/${boardId}/labels`,
      f.alice,
      { name: 'Bug', color: 'red' },
    )
    await f.json('PUT', `/api/cards/${cardId}/labels/${labelId}`, f.alice)
    await f.json('PUT', `/api/cards/${cardId}/assignees/${f.bob.id}`, f.alice)
    await f.json('POST', `/api/cards/${cardId}/comments`, f.bob, {
      body: 'Keep my comment while archived',
    })
    await f.json('POST', `/api/boards/${boardId}/presence`, f.bob)
    await f.json('DELETE', `/api/lists/${listId}`, f.alice)
    await f.json('DELETE', `/api/boards/${boardId}`, f.alice)
    for (const table of [
      schema.lists,
      schema.cards,
      schema.cardLabels,
      schema.cardAssignees,
      schema.comments,
      schema.labels,
      schema.boardMembers,
      schema.presence,
    ]) {
      expect(f.connection.db.select().from(table).all()).toEqual([])
    }
    expect(
      f.connection.db
        .select()
        .from(schema.activity)
        .where(eq(schema.activity.boardId, boardId))
        .all(),
    ).toEqual([])
    expect(f.connection.db.select().from(schema.user).all()).toHaveLength(3)
    expect(await f.json('GET', `/api/boards/${boardId}`, f.alice)).toBeNull()
    expect(
      await f.json('GET', `/api/boards/${otherBoardId}`, f.alice),
    ).toMatchObject({ name: 'Keep' })
    expect(await f.json('GET', '/api/boards', f.bob)).toEqual([])
  })

  test('database errors roll back domain writes and activity; no invalidation is published', async () => {
    const boardId = await f.board()
    const events: string[] = []
    f.services.rooms.publish = (_topic, message) => events.push(message)
    f.connection.sqlite.exec(
      "CREATE TRIGGER fail_activity BEFORE INSERT ON activity BEGIN SELECT RAISE(ABORT, 'test failure'); END",
    )
    const logger = spyOn(console, 'error').mockImplementation(() => undefined)
    try {
      const response = await f.request(
        'PATCH',
        `/api/boards/${boardId}`,
        f.alice,
        { name: 'Rolled back' },
      )
      expect(response.status).toBe(500)
      expect(await response.json()).toEqual({ error: 'Internal server error' })
      expect(logger).toHaveBeenCalledTimes(1)
    } finally {
      logger.mockRestore()
    }
    expect(
      await f.json('GET', `/api/boards/${boardId}`, f.alice),
    ).toMatchObject({ name: 'Roadmap' })
    expect(events).toEqual([])
  })
})
