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

  it('updates card description and logs description_changed activity', async () => {
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
      title: 'Card With Description',
    })

    await asAlice.mutation(api.cards.updateDescription, {
      cardId,
      description: '### Acceptance Criteria\n- [x] Done\n- [ ] Pending',
    })

    const card = await asAlice.query(api.cards.get, { cardId })
    expect(card?.description).toBe(
      '### Acceptance Criteria\n- [x] Done\n- [ ] Pending',
    )

    // Verify activity row
    const activities = await t.run(async (ctx) => {
      return await ctx.db
        .query('activity')
        .withIndex('by_boardId', (q) => q.eq('boardId', boardId))
        .collect()
    })

    const descActivity = activities.find(
      (a) => a.type === 'description_changed',
    )
    expect(descActivity).toBeDefined()
    expect(descActivity?.payload.cardId).toBe(cardId)
    expect(descActivity?.payload.title).toBe('Card With Description')
  })

  it('sets, updates, and clears due date and logs corresponding activity events', async () => {
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
      title: 'Time Sensitive Task',
    })

    const date1 = Date.now() + 86400000 // tomorrow
    const date2 = Date.now() + 172800000 // day after tomorrow
    const pastDate = Date.now() - 3600000 // 1 hour ago (overdue)

    // 1. Set due date
    await asAlice.mutation(api.cards.updateDueDate, {
      cardId,
      dueDate: date1,
    })

    let card = await asAlice.query(api.cards.get, { cardId })
    expect(card?.dueDate).toBe(date1)

    // 2. Change due date
    await asAlice.mutation(api.cards.updateDueDate, {
      cardId,
      dueDate: date2,
    })

    card = await asAlice.query(api.cards.get, { cardId })
    expect(card?.dueDate).toBe(date2)

    // 3. Set overdue date and verify overdue derivation logic
    await asAlice.mutation(api.cards.updateDueDate, {
      cardId,
      dueDate: pastDate,
    })

    card = await asAlice.query(api.cards.get, { cardId })
    expect(card?.dueDate).toBe(pastDate)
    const isOverdue = card?.dueDate ? card.dueDate < Date.now() : false
    expect(isOverdue).toBe(true)

    // 4. Clear due date
    await asAlice.mutation(api.cards.updateDueDate, {
      cardId,
      dueDate: undefined,
    })

    card = await asAlice.query(api.cards.get, { cardId })
    expect(card?.dueDate).toBeUndefined()

    // Verify activity sequence
    const activities = await t.run(async (ctx) => {
      return await ctx.db
        .query('activity')
        .withIndex('by_boardId', (q) => q.eq('boardId', boardId))
        .collect()
    })

    const setActivity = activities.find((a) => a.type === 'due_date_set')
    expect(setActivity).toBeDefined()
    expect(setActivity?.payload.dueDate).toBe(date1)

    const changeActivities = activities.filter(
      (a) => a.type === 'due_date_changed',
    )
    expect(changeActivities).toHaveLength(2)

    const clearActivity = activities.find((a) => a.type === 'due_date_cleared')
    expect(clearActivity).toBeDefined()
    expect(clearActivity?.payload.cardId).toBe(cardId)
  })

  it('restores an archived card, places it at the end of the list, and logs card_restored activity', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Board',
    })
    const listId = await asAlice.mutation(api.lists.create, {
      boardId,
      title: 'Tasks',
    })
    const card1Id = await asAlice.mutation(api.cards.create, {
      listId,
      title: 'First Card',
    })
    const card2Id = await asAlice.mutation(api.cards.create, {
      listId,
      title: 'Second Card',
    })

    // Archive card 1
    await asAlice.mutation(api.cards.archive, { cardId: card1Id })

    // Check archived list
    const archivedCards = await asAlice.query(api.cards.listArchivedByBoard, {
      boardId,
    })
    expect(archivedCards).toHaveLength(1)
    expect(archivedCards[0]._id).toBe(card1Id)

    // Active cards only contain card 2
    let activeCards = await asAlice.query(api.cards.listByBoard, { boardId })
    expect(activeCards).toHaveLength(1)
    expect(activeCards[0]._id).toBe(card2Id)

    // Restore card 1
    await asAlice.mutation(api.cards.restore, { cardId: card1Id })

    // Active cards now contain both, with restored card positioned after card 2
    activeCards = await asAlice.query(api.cards.listByBoard, { boardId })
    expect(activeCards).toHaveLength(2)
    const restoredCard = activeCards.find((c) => c._id === card1Id)
    expect(restoredCard?.archived).toBe(false)
    expect(restoredCard?.position).toBe(2) // next after card 2's position 1

    // Verify activity row
    const activities = await t.run(async (ctx) => {
      return await ctx.db
        .query('activity')
        .withIndex('by_boardId', (q) => q.eq('boardId', boardId))
        .collect()
    })

    const restoreActivity = activities.find((a) => a.type === 'card_restored')
    expect(restoreActivity).toBeDefined()
    expect(restoreActivity?.payload.title).toBe('First Card')
  })

  it('moves a card to a different list and logs card_moved activity', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Board',
    })
    const list1Id = await asAlice.mutation(api.lists.create, {
      boardId,
      title: 'Todo',
    })
    const list2Id = await asAlice.mutation(api.lists.create, {
      boardId,
      title: 'Done',
    })

    const cardId = await asAlice.mutation(api.cards.create, {
      listId: list1Id,
      title: 'Move Me',
    })

    await asAlice.mutation(api.cards.moveToList, {
      cardId,
      targetListId: list2Id,
    })

    const card = await asAlice.query(api.cards.get, { cardId })
    expect(card?.listId).toBe(list2Id)
    expect(card?.position).toBe(0)

    // Verify activity row
    const activities = await t.run(async (ctx) => {
      return await ctx.db
        .query('activity')
        .withIndex('by_boardId', (q) => q.eq('boardId', boardId))
        .collect()
    })

    const moveActivity = activities.find((a) => a.type === 'card_moved')
    expect(moveActivity).toBeDefined()
    expect(moveActivity?.payload.cardId).toBe(cardId)
    expect(moveActivity?.payload.sourceListId).toBe(list1Id)
    expect(moveActivity?.payload.sourceListTitle).toBe('Todo')
    expect(moveActivity?.payload.targetListId).toBe(list2Id)
    expect(moveActivity?.payload.targetListTitle).toBe('Done')
  })

  it('reorders cards within the same list with continuous 0..n-1 reindexing without logging card_moved', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Reorder Board',
    })
    const listId = await asAlice.mutation(api.lists.create, {
      boardId,
      title: 'Sprint Backlog',
    })

    const c0 = await asAlice.mutation(api.cards.create, {
      listId,
      title: 'Card 0',
    })
    const c1 = await asAlice.mutation(api.cards.create, {
      listId,
      title: 'Card 1',
    })
    const c2 = await asAlice.mutation(api.cards.create, {
      listId,
      title: 'Card 2',
    })
    const c3 = await asAlice.mutation(api.cards.create, {
      listId,
      title: 'Card 3',
    })

    // Move Card 3 to index 0: expected order [c3, c0, c1, c2]
    await asAlice.mutation(api.cards.reorder, {
      cardId: c3,
      targetListId: listId,
      newPosition: 0,
    })

    let cards = await asAlice.query(api.cards.listByBoard, { boardId })
    expect(cards.map((c) => c._id)).toEqual([c3, c0, c1, c2])
    expect(cards.map((c) => c.position)).toEqual([0, 1, 2, 3])

    // Move Card 0 (currently index 1) to end (index 3): expected order [c3, c1, c2, c0]
    await asAlice.mutation(api.cards.reorder, {
      cardId: c0,
      targetListId: listId,
      newPosition: 3,
    })

    cards = await asAlice.query(api.cards.listByBoard, { boardId })
    expect(cards.map((c) => c._id)).toEqual([c3, c1, c2, c0])
    expect(cards.map((c) => c.position)).toEqual([0, 1, 2, 3])

    // Verify NO card_moved activity was logged for intra-list reordering
    const activities = await t.run(async (ctx) => {
      return await ctx.db
        .query('activity')
        .withIndex('by_boardId', (q) => q.eq('boardId', boardId))
        .collect()
    })
    const cardMovedActivities = activities.filter(
      (a) => a.type === 'card_moved',
    )
    expect(cardMovedActivities).toHaveLength(0)
  })

  it('moves and inserts a card into another list at a specific position and reindexes both lists', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Cross List Board',
    })
    const listAId = await asAlice.mutation(api.lists.create, {
      boardId,
      title: 'In Progress',
    })
    const listBId = await asAlice.mutation(api.lists.create, {
      boardId,
      title: 'Review',
    })

    const a0 = await asAlice.mutation(api.cards.create, {
      listId: listAId,
      title: 'A0',
    })
    const a1 = await asAlice.mutation(api.cards.create, {
      listId: listAId,
      title: 'A1',
    })
    const a2 = await asAlice.mutation(api.cards.create, {
      listId: listAId,
      title: 'A2',
    })

    const b0 = await asAlice.mutation(api.cards.create, {
      listId: listBId,
      title: 'B0',
    })
    const b1 = await asAlice.mutation(api.cards.create, {
      listId: listBId,
      title: 'B1',
    })

    // Move A1 from List A into List B at position 1 (between B0 and B1)
    await asAlice.mutation(api.cards.reorder, {
      cardId: a1,
      targetListId: listBId,
      newPosition: 1,
    })

    const boardCards = await asAlice.query(api.cards.listByBoard, { boardId })
    const listACards = boardCards.filter((c) => c.listId === listAId)
    const listBCards = boardCards.filter((c) => c.listId === listBId)

    // List A should now have [A0, A2] with positions [0, 1]
    expect(listACards.map((c) => c._id)).toEqual([a0, a2])
    expect(listACards.map((c) => c.position)).toEqual([0, 1])

    // List B should now have [B0, A1, B1] with positions [0, 1, 2]
    expect(listBCards.map((c) => c._id)).toEqual([b0, a1, b1])
    expect(listBCards.map((c) => c.position)).toEqual([0, 1, 2])

    // Verify activity row recorded
    const activities = await t.run(async (ctx) => {
      return await ctx.db
        .query('activity')
        .withIndex('by_boardId', (q) => q.eq('boardId', boardId))
        .collect()
    })
    const moveActivity = activities.find((a) => a.type === 'card_moved')
    expect(moveActivity).toBeDefined()
    expect(moveActivity?.payload.cardId).toBe(a1)
    expect(moveActivity?.payload.sourceListTitle).toBe('In Progress')
    expect(moveActivity?.payload.targetListTitle).toBe('Review')
    expect(moveActivity?.payload.newPosition).toBe(1)
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
    const cardId = await asAlice.mutation(api.cards.create, {
      listId,
      title: 'Private Card',
    })

    await expect(
      asBob.mutation(api.cards.create, { listId, title: 'Intruder Card' }),
    ).rejects.toThrow('Unauthorized')

    await expect(
      asBob.mutation(api.cards.updateDescription, {
        cardId,
        description: 'Hacked',
      }),
    ).rejects.toThrow('Unauthorized')

    await expect(
      asBob.mutation(api.cards.updateDueDate, {
        cardId,
        dueDate: Date.now(),
      }),
    ).rejects.toThrow('Unauthorized')

    await expect(
      asBob.mutation(api.cards.reorder, {
        cardId,
        targetListId: listId,
        newPosition: 0,
      }),
    ).rejects.toThrow('Unauthorized')

    await expect(asBob.mutation(api.cards.archive, { cardId })).rejects.toThrow(
      'Unauthorized',
    )

    await expect(asBob.mutation(api.cards.restore, { cardId })).rejects.toThrow(
      'Unauthorized',
    )
  })
})
