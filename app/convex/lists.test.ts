import { describe, it, expect } from 'vitest'
import { convexTest } from 'convex-test'
import schema from './schema'
import { api } from './_generated/api'

describe('lists', () => {
  it('rejects unauthenticated list operations', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))

    // Alice creates a board
    const asAlice = t.withIdentity({
      tokenIdentifier: 'clerk|user_alice',
      name: 'Alice',
    })
    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Sprint Board',
    })

    // Unauthenticated user attempts to create list
    await expect(
      t.mutation(api.lists.create, { boardId, title: 'To Do' }),
    ).rejects.toThrow('Unauthenticated')
  })

  it('rejects non-members from mutating or viewing lists', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })
    const asBob = t.withIdentity({ tokenIdentifier: 'clerk|user_bob' })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Private Board',
    })

    await expect(
      asBob.mutation(api.lists.create, { boardId, title: 'Bob List' }),
    ).rejects.toThrow('Unauthorized')

    await expect(asBob.query(api.lists.list, { boardId })).rejects.toThrow(
      'Unauthorized',
    )
  })

  it('creates lists with sequential position and logs list_created activity', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Roadmap',
    })

    const list1Id = await asAlice.mutation(api.lists.create, {
      boardId,
      title: 'Backlog',
    })
    const list2Id = await asAlice.mutation(api.lists.create, {
      boardId,
      title: 'In Progress',
    })

    const lists = await asAlice.query(api.lists.list, { boardId })
    expect(lists).toHaveLength(2)
    expect(lists[0]._id).toBe(list1Id)
    expect(lists[0].title).toBe('Backlog')
    expect(lists[0].position).toBe(0)

    expect(lists[1]._id).toBe(list2Id)
    expect(lists[1].title).toBe('In Progress')
    expect(lists[1].position).toBe(1)

    // Verify activity row
    const activities = await t.run(async (ctx) => {
      return await ctx.db
        .query('activity')
        .withIndex('by_boardId', (q) => q.eq('boardId', boardId))
        .collect()
    })

    const listCreatedActivities = activities.filter(
      (a) => a.type === 'list_created',
    )
    expect(listCreatedActivities).toHaveLength(2)
    expect(listCreatedActivities[0].payload.title).toBe('Backlog')
    expect(listCreatedActivities[1].payload.title).toBe('In Progress')
  })

  it('renames a list and logs list_renamed activity', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Sprint 1',
    })
    const listId = await asAlice.mutation(api.lists.create, {
      boardId,
      title: 'Doing',
    })

    await asAlice.mutation(api.lists.rename, {
      listId,
      title: 'In Progress',
    })

    const lists = await asAlice.query(api.lists.list, { boardId })
    expect(lists[0].title).toBe('In Progress')

    const activities = await t.run(async (ctx) => {
      return await ctx.db
        .query('activity')
        .withIndex('by_boardId', (q) => q.eq('boardId', boardId))
        .collect()
    })

    const renameActivity = activities.find((a) => a.type === 'list_renamed')
    expect(renameActivity).toBeDefined()
    expect(renameActivity?.payload.oldTitle).toBe('Doing')
    expect(renameActivity?.payload.newTitle).toBe('In Progress')
  })

  it('deleting a list archives its cards without data loss and writes list_deleted activity', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Product Board',
    })
    const listId = await asAlice.mutation(api.lists.create, {
      boardId,
      title: 'QA Testing',
    })

    // Create 2 cards in this list
    const card1Id = await asAlice.mutation(api.cards.create, {
      listId,
      title: 'Verify auth tokens',
    })
    const card2Id = await asAlice.mutation(api.cards.create, {
      listId,
      title: 'Check mobile layout',
    })

    // Delete the list
    await asAlice.mutation(api.lists.remove, { listId })

    // List should no longer be returned
    const lists = await asAlice.query(api.lists.list, { boardId })
    expect(lists.find((l) => l._id === listId)).toBeUndefined()

    // Active cards query should return 0 cards for the board
    const activeCards = await asAlice.query(api.cards.listByBoard, { boardId })
    expect(activeCards).toHaveLength(0)

    // Verify in direct db that the cards STILL EXIST and have archived: true (no data loss)
    const card1Doc = await t.run(async (ctx) => ctx.db.get(card1Id))
    const card2Doc = await t.run(async (ctx) => ctx.db.get(card2Id))

    expect(card1Doc).not.toBeNull()
    expect(card1Doc?.archived).toBe(true)
    expect(card1Doc?.title).toBe('Verify auth tokens')

    expect(card2Doc).not.toBeNull()
    expect(card2Doc?.archived).toBe(true)
    expect(card2Doc?.title).toBe('Check mobile layout')

    // Verify activity row
    const activities = await t.run(async (ctx) => {
      return await ctx.db
        .query('activity')
        .withIndex('by_boardId', (q) => q.eq('boardId', boardId))
        .collect()
    })

    const deleteActivity = activities.find((a) => a.type === 'list_deleted')
    expect(deleteActivity).toBeDefined()
    expect(deleteActivity?.payload.title).toBe('QA Testing')
    expect(deleteActivity?.payload.archivedCardsCount).toBe(2)
  })
})
