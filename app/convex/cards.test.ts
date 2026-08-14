import { describe, it, expect } from 'vitest'
import { convexTest } from 'convex-test'
import schema from './schema'
import { api } from './_generated/api'

describe('cards', () => {
  it('creates cards with sequential position and logs card_created activity', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Launch Board',
    })
    const listId = await asAlice.mutation(api.lists.create, {
      boardId,
      title: 'Backlog',
    })

    const card1Id = await asAlice.mutation(api.cards.create, {
      listId,
      title: 'Design tokens',
    })
    const card2Id = await asAlice.mutation(api.cards.create, {
      listId,
      title: 'Auth flow',
    })

    const cards = await asAlice.query(api.cards.listByBoard, { boardId })
    expect(cards).toHaveLength(2)
    expect(cards[0]._id).toBe(card1Id)
    expect(cards[0].title).toBe('Design tokens')
    expect(cards[0].position).toBe(0)
    expect(cards[0].archived).toBe(false)

    expect(cards[1]._id).toBe(card2Id)
    expect(cards[1].title).toBe('Auth flow')
    expect(cards[1].position).toBe(1)
    expect(cards[1].archived).toBe(false)

    // Verify activity row
    const activities = await t.run(async (ctx) => {
      return await ctx.db
        .query('activity')
        .withIndex('by_boardId', (q) => q.eq('boardId', boardId))
        .collect()
    })

    const cardActivities = activities.filter((a) => a.type === 'card_created')
    expect(cardActivities).toHaveLength(2)
    expect(cardActivities[0].payload.title).toBe('Design tokens')
    expect(cardActivities[1].payload.title).toBe('Auth flow')
  })

  it('renames a card', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Board',
    })
    const listId = await asAlice.mutation(api.lists.create, {
      boardId,
      title: 'Tasks',
    })
    const cardId = await asAlice.mutation(api.cards.create, {
      listId,
      title: 'Draft feature',
    })

    await asAlice.mutation(api.cards.rename, {
      cardId,
      title: 'Implement feature',
    })

    const cards = await asAlice.query(api.cards.listByBoard, { boardId })
    expect(cards[0].title).toBe('Implement feature')
  })

  it('archives a card and verifies it is excluded from active board queries without data deletion', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Board',
    })
    const listId = await asAlice.mutation(api.lists.create, {
      boardId,
      title: 'Tasks',
    })
    const cardId = await asAlice.mutation(api.cards.create, {
      listId,
      title: 'Temporary note',
    })

    await asAlice.mutation(api.cards.archive, { cardId })

    // Query active cards
    const activeCards = await asAlice.query(api.cards.listByBoard, { boardId })
    expect(activeCards).toHaveLength(0)

    // Direct DB check: row still exists with archived: true
    const cardDoc = await t.run(async (ctx) => ctx.db.get(cardId))
    expect(cardDoc).not.toBeNull()
    expect(cardDoc?.archived).toBe(true)

    // Verify activity row
    const activities = await t.run(async (ctx) => {
      return await ctx.db
        .query('activity')
        .withIndex('by_boardId', (q) => q.eq('boardId', boardId))
        .collect()
    })

    const archiveActivity = activities.find((a) => a.type === 'card_archived')
    expect(archiveActivity).toBeDefined()
    expect(archiveActivity?.payload.title).toBe('Temporary note')
  })

  it('rejects unauthorized users from card actions', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })
    const asBob = t.withIdentity({ tokenIdentifier: 'clerk|user_bob' })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Alice Private',
    })
    const listId = await asAlice.mutation(api.lists.create, {
      boardId,
      title: 'Private List',
    })

    await expect(
      asBob.mutation(api.cards.create, { listId, title: 'Intruder Card' }),
    ).rejects.toThrow('Unauthorized')
  })
})
