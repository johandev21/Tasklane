import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { and, eq } from 'drizzle-orm'
import { LABEL_COLORS } from '../src/constants'
import {
  boardMembers,
  cardAssignees,
  cardLabels,
  comments,
  presence,
  user,
} from '../src/db/schema'
import { fixture } from './helpers'
import type { Fixture } from './helpers'

describe('labels, members, and assignees', () => {
  let f: Fixture
  beforeEach(async () => {
    f = await fixture()
  })
  afterEach(async () => {
    await f.close()
  })

  test('owner-only palettes validate names/colors and enforce the 8-label limit', async () => {
    const boardId = await f.board()
    await f.invite(boardId)
    expect(
      (
        await f.request('POST', `/api/boards/${boardId}/labels`, f.alice, {
          name: ' ',
          color: 'red',
        })
      ).status,
    ).toBe(400)
    expect(
      (
        await f.request('POST', `/api/boards/${boardId}/labels`, f.alice, {
          name: 'Invalid',
          color: 'neon',
        })
      ).status,
    ).toBe(422)
    for (const color of LABEL_COLORS)
      await f.json('POST', `/api/boards/${boardId}/labels`, f.alice, {
        name: color,
        color,
      })
    const palette = await f.json<{ id: string }[]>(
      'GET',
      `/api/boards/${boardId}/labels`,
      f.bob,
    )
    expect(palette).toHaveLength(8)
    expect(
      (
        await f.request('POST', `/api/boards/${boardId}/labels`, f.alice, {
          name: 'Ninth',
          color: 'red',
        })
      ).status,
    ).toBe(409)
    expect(
      (
        await f.request('POST', `/api/boards/${boardId}/labels`, f.bob, {
          name: 'Denied',
          color: 'red',
        })
      ).status,
    ).toBe(403)
    expect(
      (
        await f.request('PATCH', `/api/labels/${palette[0]!.id}`, f.bob, {
          name: 'Denied',
        })
      ).status,
    ).toBe(403)
    expect(
      (await f.request('DELETE', `/api/labels/${palette[0]!.id}`, f.bob))
        .status,
    ).toBe(403)
  })

  test('members attach/toggle labels idempotently; palette edits propagate and deletion cascades', async () => {
    const boardId = await f.board()
    await f.invite(boardId)
    const cardId = await f.card(await f.list(boardId))
    const labelId = await f.json<string>(
      'POST',
      `/api/boards/${boardId}/labels`,
      f.alice,
      { name: 'Bug', color: 'red' },
    )
    const attached = await f.json(
      'PUT',
      `/api/cards/${cardId}/labels/${labelId}`,
      f.bob,
    )
    expect(
      await f.json('PUT', `/api/cards/${cardId}/labels/${labelId}`, f.bob),
    ).toEqual(attached)
    expect(f.connection.db.select().from(cardLabels).all()).toHaveLength(1)
    await f.json('PATCH', `/api/labels/${labelId}`, f.alice, {
      name: 'Defect',
      color: 'orange',
    })
    expect(await f.json('GET', `/api/cards/${cardId}/labels`, f.bob)).toEqual([
      expect.objectContaining({ name: 'Defect', color: 'orange' }),
    ])
    expect(
      await f.json('GET', `/api/boards/${boardId}/card-labels`, f.bob),
    ).toEqual([
      expect.objectContaining({
        cardId,
        labelId,
        label: expect.objectContaining({ name: 'Defect' }),
      }),
    ])
    expect(
      await f.json(
        'POST',
        `/api/cards/${cardId}/labels/${labelId}/toggle`,
        f.bob,
      ),
    ).toMatchObject({ attached: false })
    expect(
      await f.json(
        'POST',
        `/api/cards/${cardId}/labels/${labelId}/toggle`,
        f.bob,
      ),
    ).toMatchObject({ attached: true })
    await f.json('DELETE', `/api/labels/${labelId}`, f.alice)
    expect(f.connection.db.select().from(cardLabels).all()).toEqual([])
  })

  test('rejects labels from other boards and records label attach/remove activity', async () => {
    const boardId = await f.board()
    const otherBoard = await f.board(f.alice, 'Other')
    const cardId = await f.card(await f.list(boardId))
    const foreignLabel = await f.json<string>(
      'POST',
      `/api/boards/${otherBoard}/labels`,
      f.alice,
      { name: 'Foreign', color: 'blue' },
    )
    expect(
      (
        await f.request(
          'PUT',
          `/api/cards/${cardId}/labels/${foreignLabel}`,
          f.alice,
        )
      ).status,
    ).toBe(400)
    expect(
      (
        await f.request(
          'DELETE',
          `/api/cards/${cardId}/labels/${foreignLabel}`,
          f.alice,
        )
      ).status,
    ).toBe(400)
    const labelId = await f.json<string>(
      'POST',
      `/api/boards/${boardId}/labels`,
      f.alice,
      { name: 'Bug', color: 'red' },
    )
    await f.json('PUT', `/api/cards/${cardId}/labels/${labelId}`, f.alice)
    await f.json('DELETE', `/api/cards/${cardId}/labels/${labelId}`, f.alice)
    await f.json('DELETE', `/api/cards/${cardId}/labels/${labelId}`, f.alice)
    const events = await f.json<{ type: string }[]>(
      'GET',
      `/api/cards/${cardId}/activity`,
      f.alice,
    )
    expect(events.map((event) => event.type)).toEqual([
      'label_removed',
      'label_added',
      'card_created',
    ])
  })

  test('invites registered users by normalized email, enriches owner-first members, rejects duplicates', async () => {
    const boardId = await f.board()
    f.connection.db
      .update(user)
      .set({ image: 'https://example.com/bob.png' })
      .where(eq(user.id, f.bob.id))
      .run()
    await f.json('POST', `/api/boards/${boardId}/members`, f.alice, {
      email: ' BOB@EXAMPLE.COM ',
    })
    expect(
      await f.json('GET', `/api/boards/${boardId}/members`, f.bob),
    ).toEqual([
      expect.objectContaining({
        userId: f.alice.id,
        isOwner: true,
        name: 'Alice',
      }),
      expect.objectContaining({
        userId: f.bob.id,
        isOwner: false,
        imageUrl: 'https://example.com/bob.png',
      }),
    ])
    for (const email of [f.alice.email, f.bob.email])
      expect(
        (
          await f.request('POST', `/api/boards/${boardId}/members`, f.alice, {
            email,
          })
        ).status,
      ).toBe(409)
    expect(
      (
        await f.request('POST', `/api/boards/${boardId}/members`, f.alice, {
          email: 'unknown@example.com',
        })
      ).status,
    ).toBe(404)
    expect(
      (
        await f.request('POST', `/api/boards/${boardId}/members`, f.alice, {
          email: 'invalid',
        })
      ).status,
    ).toBe(400)
    expect(
      (
        await f.request('POST', `/api/boards/${boardId}/members`, f.bob, {
          email: f.eve.email,
        })
      ).status,
    ).toBe(403)
  })

  test('members assign owners and other members, with idempotent add/remove and toggle activity', async () => {
    const boardId = await f.board()
    await f.invite(boardId)
    const cardId = await f.card(await f.list(boardId))
    const first = await f.json(
      'PUT',
      `/api/cards/${cardId}/assignees/${f.bob.id}`,
      f.alice,
    )
    expect(
      await f.json(
        'PUT',
        `/api/cards/${cardId}/assignees/${f.bob.id}`,
        f.alice,
      ),
    ).toEqual(first)
    await f.json('PUT', `/api/cards/${cardId}/assignees/${f.alice.id}`, f.bob)
    expect(
      await f.json('GET', `/api/cards/${cardId}/assignees`, f.bob),
    ).toHaveLength(2)
    expect(
      await f.json('GET', `/api/boards/${boardId}/assignees`, f.alice),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          cardId,
          user: expect.objectContaining({ userId: f.bob.id, name: 'Bob' }),
        }),
      ]),
    )
    expect(
      (
        await f.request(
          'PUT',
          `/api/cards/${cardId}/assignees/${f.eve.id}`,
          f.alice,
        )
      ).status,
    ).toBe(400)
    expect(
      (
        await f.request(
          'POST',
          `/api/cards/${cardId}/assignees/${f.eve.id}/toggle`,
          f.alice,
        )
      ).status,
    ).toBe(400)
    expect(
      await f.json(
        'POST',
        `/api/cards/${cardId}/assignees/${f.bob.id}/toggle`,
        f.bob,
      ),
    ).toMatchObject({ assigned: false })
    expect(
      await f.json(
        'POST',
        `/api/cards/${cardId}/assignees/${f.bob.id}/toggle`,
        f.bob,
      ),
    ).toMatchObject({ assigned: true })
    await f.json('DELETE', `/api/cards/${cardId}/assignees/${f.bob.id}`, f.bob)
    expect(f.connection.db.select().from(cardAssignees).all()).toHaveLength(1)
    const events = await f.json<{ type: string }[]>(
      'GET',
      `/api/cards/${cardId}/activity`,
      f.alice,
    )
    expect(
      events.filter((event) => event.type === 'assignee_added'),
    ).toHaveLength(3)
    expect(
      events.filter((event) => event.type === 'assignee_removed'),
    ).toHaveLength(2)
  })

  test('removing a member revokes access and cleans only this board assignments and presence, preserving comments', async () => {
    const boardId = await f.board()
    const other = await f.board(f.alice, 'Other')
    await f.invite(boardId)
    await f.invite(other)
    const cardId = await f.card(await f.list(boardId))
    const otherCard = await f.card(await f.list(other))
    for (const id of [cardId, otherCard])
      await f.json('PUT', `/api/cards/${id}/assignees/${f.bob.id}`, f.alice)
    await f.json('POST', `/api/cards/${cardId}/comments`, f.bob, {
      body: 'Keep my history',
    })
    await f.json('POST', `/api/boards/${boardId}/presence`, f.bob)
    expect(
      (
        await f.request(
          'DELETE',
          `/api/boards/${boardId}/members/${f.bob.id}`,
          f.bob,
        )
      ).status,
    ).toBe(403)
    expect(
      (
        await f.request(
          'DELETE',
          `/api/boards/${boardId}/members/${f.alice.id}`,
          f.alice,
        )
      ).status,
    ).toBe(400)
    await f.json(
      'DELETE',
      `/api/boards/${boardId}/members/${f.bob.id}`,
      f.alice,
    )
    expect(
      (await f.request('GET', `/api/boards/${boardId}`, f.bob)).status,
    ).toBe(403)
    expect(f.connection.db.select().from(cardAssignees).all()).toEqual([
      expect.objectContaining({ cardId: otherCard }),
    ])
    expect(f.connection.db.select().from(comments).all()).toHaveLength(1)
    expect(
      f.connection.db
        .select()
        .from(presence)
        .where(eq(presence.boardId, boardId))
        .all(),
    ).toEqual([])
    expect(
      f.connection.db
        .select()
        .from(boardMembers)
        .where(
          and(
            eq(boardMembers.boardId, other),
            eq(boardMembers.userId, f.bob.id),
          ),
        )
        .all(),
    ).toHaveLength(1)
  })
})
