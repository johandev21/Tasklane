import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { activity, comments } from '../src/db/schema'
import { fixture } from './helpers'
import type { Fixture } from './helpers'

interface Page {
  page: {
    id: string
    body?: string
    type?: string
    author?: { name: string }
    actor?: { name: string }
  }[]
  isDone: boolean
  continueCursor: string
}

describe('comments and activity cursor pagination', () => {
  let f: Fixture
  beforeEach(async () => {
    f = await fixture()
  })
  afterEach(async () => {
    await f.close()
  })

  test('members comment chronologically with enriched authors, counts, and an activity snippet', async () => {
    const boardId = await f.board()
    await f.invite(boardId)
    const cardId = await f.card(await f.list(boardId))
    const first = await f.json<string>(
      'POST',
      `/api/cards/${cardId}/comments`,
      f.alice,
      { body: ' First ' },
    )
    const longText = 'A'.repeat(120)
    const second = await f.json<string>(
      'POST',
      `/api/cards/${cardId}/comments`,
      f.bob,
      { body: longText },
    )
    expect(await f.json('GET', `/api/cards/${cardId}/comments`, f.bob)).toEqual(
      [
        expect.objectContaining({
          id: first,
          body: 'First',
          author: expect.objectContaining({ name: 'Alice', isOwner: true }),
        }),
        expect.objectContaining({
          id: second,
          author: expect.objectContaining({ name: 'Bob', isOwner: false }),
        }),
      ],
    )
    expect(
      await f.json('GET', `/api/boards/${boardId}/comment-counts`, f.alice),
    ).toEqual([{ cardId, count: 2 }])
    const events = await f.json<
      { type: string; payload: Record<string, unknown> }[]
    >('GET', `/api/cards/${cardId}/activity`, f.alice)
    expect(events[0]).toMatchObject({
      type: 'comment_added',
      payload: {
        snippet: `${'A'.repeat(77)}...`,
        commentBody: longText,
        authorName: 'Bob',
      },
    })
  })

  test('only comment authors may edit or delete, including when the other user owns the board', async () => {
    const boardId = await f.board()
    await f.invite(boardId)
    const cardId = await f.card(await f.list(boardId))
    const commentId = await f.json<string>(
      'POST',
      `/api/cards/${cardId}/comments`,
      f.bob,
      { body: 'Original' },
    )
    expect(
      (
        await f.request('PATCH', `/api/comments/${commentId}`, f.alice, {
          body: 'Denied',
        })
      ).status,
    ).toBe(403)
    expect(
      (await f.request('DELETE', `/api/comments/${commentId}`, f.alice)).status,
    ).toBe(403)
    expect(
      (
        await f.request('PATCH', `/api/comments/${commentId}`, f.bob, {
          body: ' ',
        })
      ).status,
    ).toBe(400)
    expect(
      (
        await f.request('POST', `/api/cards/${cardId}/comments`, f.bob, {
          body: ' ',
        })
      ).status,
    ).toBe(400)
    await f.json('PATCH', `/api/comments/${commentId}`, f.bob, {
      body: ' Updated ',
    })
    expect(
      await f.json('GET', `/api/cards/${cardId}/comments`, f.alice),
    ).toEqual([expect.objectContaining({ body: 'Updated' })])
    await f.json('DELETE', `/api/comments/${commentId}`, f.bob)
    expect(
      await f.json('GET', `/api/boards/${boardId}/comment-counts`, f.alice),
    ).toEqual([])
  })

  test('paginates tied timestamps deterministically without duplication while newer comments arrive or the cursor row is deleted', async () => {
    const boardId = await f.board()
    const cardId = await f.card(await f.list(boardId))
    const ids: string[] = []
    for (let i = 0; i < 5; i++)
      ids.push(
        await f.json<string>('POST', `/api/cards/${cardId}/comments`, f.alice, {
          body: `Comment ${i}`,
        }),
      )
    f.connection.db
      .update(comments)
      .set({ createdAt: 1000 })
      .where(eq(comments.cardId, cardId))
      .run()
    const first = await f.json<Page>(
      'GET',
      `/api/cards/${cardId}/comments/page?limit=2`,
      f.alice,
    )
    expect(first.page.map((comment) => comment.id)).toEqual([ids[4]!, ids[3]!])
    expect(first.page[0]!.author?.name).toBe('Alice')
    expect(first.isDone).toBe(false)
    await f.json('DELETE', `/api/comments/${ids[3]}`, f.alice)
    await f.json('POST', `/api/cards/${cardId}/comments`, f.alice, {
      body: 'Newer',
    })
    const second = await f.json<Page>(
      'GET',
      `/api/cards/${cardId}/comments/page?limit=2&cursor=${first.continueCursor}`,
      f.alice,
    )
    expect(second.page.map((comment) => comment.id)).toEqual([ids[2]!, ids[1]!])
    const third = await f.json<Page>(
      'GET',
      `/api/cards/${cardId}/comments/page?limit=2&cursor=${second.continueCursor}`,
      f.alice,
    )
    expect(third.page.map((comment) => comment.id)).toEqual([ids[0]!])
    expect(third.isDone).toBe(true)
    expect(third.continueCursor).toBe('')
  })

  test('activity is newest-first, actor-enriched, board-scoped, and cursor-paginated', async () => {
    const boardId = await f.board()
    const other = await f.board(f.alice, 'Other')
    const cardId = await f.card(await f.list(boardId))
    await f.json('POST', `/api/cards/${cardId}/comments`, f.alice, {
      body: 'Fourth event',
    })
    f.connection.db
      .update(activity)
      .set({ createdAt: 1000 })
      .where(eq(activity.boardId, boardId))
      .run()
    const first = await f.json<Page>(
      'GET',
      `/api/boards/${boardId}/activity/page?limit=2`,
      f.alice,
    )
    expect(first.page.map((entry) => entry.type)).toEqual([
      'comment_added',
      'card_created',
    ])
    expect(first.page[0]!.actor?.name).toBe('Alice')
    const second = await f.json<Page>(
      'GET',
      `/api/boards/${boardId}/activity/page?limit=2&cursor=${first.continueCursor}`,
      f.alice,
    )
    expect(second.page.map((entry) => entry.type)).toEqual([
      'list_created',
      'board_created',
    ])
    expect(second.isDone).toBe(true)
    expect(
      await f.json('GET', `/api/boards/${other}/activity`, f.alice),
    ).toHaveLength(1)
  })

  test('rejects malformed, reused-across-scope cursors and unsafe page sizes', async () => {
    const boardId = await f.board()
    const cardId = await f.card(await f.list(boardId))
    for (let i = 0; i < 2; i++)
      await f.json('POST', `/api/cards/${cardId}/comments`, f.alice, {
        body: 'Test',
      })
    const first = await f.json<Page>(
      'GET',
      `/api/cards/${cardId}/comments/page?limit=1`,
      f.alice,
    )
    expect(
      (
        await f.request(
          'GET',
          `/api/boards/${boardId}/activity/page?cursor=${first.continueCursor}`,
          f.alice,
        )
      ).status,
    ).toBe(400)
    expect(
      (
        await f.request(
          'GET',
          `/api/cards/${cardId}/comments/page?cursor=not-json`,
          f.alice,
        )
      ).status,
    ).toBe(400)
    for (const limit of ['0', '101', '-1', '1.5', 'NaN'])
      expect(
        (
          await f.request(
            'GET',
            `/api/cards/${cardId}/comments/page?limit=${limit}`,
            f.alice,
          )
        ).status,
      ).toBe(422)
    expect(await f.json('GET', '/api/cards/missing/comments', f.alice)).toEqual(
      [],
    )
  })

  test('card activity stays attached by card id after rename and does not mix cards with equal titles', async () => {
    const boardId = await f.board()
    const listId = await f.list(boardId)
    const first = await f.card(listId, 'Same title')
    const second = await f.card(listId, 'Same title')
    await f.json('PATCH', `/api/cards/${first}`, f.alice, {
      title: 'New title',
    })
    await f.json('POST', `/api/cards/${second}/comments`, f.alice, {
      body: 'Other card',
    })
    const events = await f.json<{ payload: { cardId: string } }[]>(
      'GET',
      `/api/cards/${first}/activity`,
      f.alice,
    )
    expect(events).toHaveLength(1)
    expect(events.every((event) => event.payload.cardId === first)).toBe(true)
  })
})
