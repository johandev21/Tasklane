import { describe, it, expect } from 'vitest'
import { convexTest } from 'convex-test'
import schema from './schema'
import { api } from './_generated/api'

describe('boards', () => {
  it('rejects unauthenticated board creation', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    await expect(
      t.mutation(api.boards.create, { name: 'Alpha Board' }),
    ).rejects.toThrow('Unauthenticated')
  })

  it('rejects empty or whitespace-only board names', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({
      tokenIdentifier: 'clerk|user_alice',
      name: 'Alice',
    })

    await expect(
      asAlice.mutation(api.boards.create, { name: '   ' }),
    ).rejects.toThrow('Board name cannot be empty')
  })

  it('creates a board, sets ownerId, and writes activity row', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({
      tokenIdentifier: 'clerk|user_alice',
      name: 'Alice',
    })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Project Roadmap',
    })

    expect(boardId).toBeDefined()

    // Query board via get
    const board = await asAlice.query(api.boards.get, { boardId })
    expect(board).not.toBeNull()
    expect(board?.name).toBe('Project Roadmap')
    expect(board?.ownerId).toBe('clerk|user_alice')
    expect(board?.isOwner).toBe(true)

    // Check activity table row
    const activities = await t.run(async (ctx) => {
      return await ctx.db
        .query('activity')
        .withIndex('by_boardId', (q) => q.eq('boardId', boardId))
        .collect()
    })

    expect(activities).toHaveLength(1)
    expect(activities[0].type).toBe('board_created')
    expect(activities[0].actorId).toBe('clerk|user_alice')
    expect(activities[0].payload.boardName).toBe('Project Roadmap')
  })

  it('returns only owned and member boards in list query', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })
    const asBob = t.withIdentity({ tokenIdentifier: 'clerk|user_bob' })
    const asCharlie = t.withIdentity({ tokenIdentifier: 'clerk|user_charlie' })

    // Alice creates two boards
    const aliceBoard1 = await asAlice.mutation(api.boards.create, {
      name: 'Alice Board 1',
    })
    const aliceBoard2 = await asAlice.mutation(api.boards.create, {
      name: 'Alice Board 2',
    })

    // Bob creates one board
    const bobBoard = await asBob.mutation(api.boards.create, {
      name: 'Bob Board',
    })

    // Add Bob to Alice Board 1
    await t.run(async (ctx) => {
      await ctx.db.insert('boardMembers', {
        boardId: aliceBoard1,
        userId: 'clerk|user_bob',
      })
    })

    // Alice's list: should see Alice Board 1 and Alice Board 2, but NOT Bob Board
    const aliceBoards = await asAlice.query(api.boards.list, {})
    expect(aliceBoards).toHaveLength(2)
    const aliceBoardIds = aliceBoards.map((b) => b._id)
    expect(aliceBoardIds).toContain(aliceBoard1)
    expect(aliceBoardIds).toContain(aliceBoard2)
    expect(aliceBoardIds).not.toContain(bobBoard)

    // Bob's list: should see Bob Board (owned) and Alice Board 1 (member), but NOT Alice Board 2
    const bobBoards = await asBob.query(api.boards.list, {})
    expect(bobBoards).toHaveLength(2)
    const bobBoardIds = bobBoards.map((b) => b._id)
    expect(bobBoardIds).toContain(bobBoard)
    expect(bobBoardIds).toContain(aliceBoard1)
    expect(bobBoardIds).not.toContain(aliceBoard2)

    const bobOwned = bobBoards.find((b) => b._id === bobBoard)
    expect(bobOwned?.isOwner).toBe(true)

    const bobMember = bobBoards.find((b) => b._id === aliceBoard1)
    expect(bobMember?.isOwner).toBe(false)

    // Charlie's list: should see zero boards
    const charlieBoards = await asCharlie.query(api.boards.list, {})
    expect(charlieBoards).toHaveLength(0)
  })

  it('enforces permissions in get query', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })
    const asBob = t.withIdentity({ tokenIdentifier: 'clerk|user_bob' })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Confidential Board',
    })

    // Alice can get
    const aliceView = await asAlice.query(api.boards.get, { boardId })
    expect(aliceView?.name).toBe('Confidential Board')

    // Bob (not a member) is rejected
    await expect(asBob.query(api.boards.get, { boardId })).rejects.toThrow(
      'Unauthorized: user is not a member of this board',
    )
  })

  it('allows the owner to rename a board and records board_renamed activity', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Original Name',
    })

    await asAlice.mutation(api.boards.rename, {
      boardId,
      name: '  Renamed Board  ',
    })

    const board = await asAlice.query(api.boards.get, { boardId })
    expect(board?.name).toBe('Renamed Board')

    const activities = await t.run(async (ctx) => {
      return await ctx.db
        .query('activity')
        .withIndex('by_boardId', (q) => q.eq('boardId', boardId))
        .collect()
    })
    const renameActivity = activities.find((a) => a.type === 'board_renamed')
    expect(renameActivity).toBeDefined()
    expect(renameActivity?.actorId).toBe('clerk|user_alice')
    expect(renameActivity?.payload.oldName).toBe('Original Name')
    expect(renameActivity?.payload.newName).toBe('Renamed Board')
  })

  it('rejects empty or whitespace-only rename', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Valid Name',
    })

    await expect(
      asAlice.mutation(api.boards.rename, {
        boardId,
        name: '   ',
      }),
    ).rejects.toThrow('Board name cannot be empty')
  })

  it('denies non-owner members from renaming a board', async () => {
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
      name: 'Owner Board',
    })
    await asAlice.mutation(api.members.inviteByEmail, {
      boardId,
      email: 'bob@example.com',
    })

    await expect(
      asBob.mutation(api.boards.rename, {
        boardId,
        name: 'Bob Override',
      }),
    ).rejects.toThrow('Unauthorized: only the board owner can rename the board')

    // Name is unchanged
    const board = await asAlice.query(api.boards.get, { boardId })
    expect(board?.name).toBe('Owner Board')
  })

  it('rejects unauthenticated rename', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Secret Board',
    })

    await expect(
      t.mutation(api.boards.rename, {
        boardId,
        name: 'Hijacked',
      }),
    ).rejects.toThrow('Unauthenticated')
  })

  it('permanently deletes a board and cascades all related rows', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })
    const asBob = t.withIdentity({ tokenIdentifier: 'clerk|user_bob' })

    await asAlice.mutation(api.users.upsertUser, {
      name: 'Alice Owner',
      email: 'alice@example.com',
    })
    await asBob.mutation(api.users.upsertUser, {
      name: 'Bob Member',
      email: 'bob@example.com',
    })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Board To Delete',
    })
    await asAlice.mutation(api.members.inviteByEmail, {
      boardId,
      email: 'bob@example.com',
    })

    const listId = await asAlice.mutation(api.lists.create, {
      boardId,
      title: 'Backlog',
    })
    const cardId = await asAlice.mutation(api.cards.create, {
      listId,
      title: 'Task card',
    })
    const labelId = await asAlice.mutation(api.labels.create, {
      boardId,
      name: 'High',
      color: 'red',
    })
    await asAlice.mutation(api.labels.toggleOnCard, {
      cardId,
      labelId,
    })
    await asAlice.mutation(api.assignees.addToCard, {
      cardId,
      userId: 'clerk|user_bob',
    })
    await asAlice.mutation(api.comments.add, {
      cardId,
      body: 'First comment',
    })
    // Seed a presence entry for the board
    await t.run(async (ctx) => {
      await ctx.db.insert('presence', {
        boardId,
        userId: 'clerk|user_bob',
        lastSeen: Date.now(),
      })
    })

    // Sanity check rows exist before deletion
    const rowsBefore = await t.run(async (ctx) => {
      const count = async (table: string, index: string, key: string) =>
        (
          await ctx.db
            .query(table as 'lists')
            .withIndex(index as 'by_boardId', (q: any) => q.eq('boardId', key))
            .collect()
        ).length
      return {
        lists: await count('lists', 'by_boardId', boardId),
        labels: await count('labels', 'by_boardId', boardId),
        boardMembers: await count('boardMembers', 'by_boardId', boardId),
        activity: await count('activity', 'by_boardId', boardId),
        presence: await count('presence', 'by_boardId', boardId),
      }
    })
    expect(rowsBefore.lists).toBe(1)
    expect(rowsBefore.labels).toBe(1)
    expect(rowsBefore.boardMembers).toBe(1)
    expect(rowsBefore.activity).toBeGreaterThan(0)
    expect(rowsBefore.presence).toBe(1)

    // Owner deletes the board
    await asAlice.mutation(api.boards.remove, { boardId })

    // Board is gone
    const board = await asAlice.query(api.boards.get, { boardId })
    expect(board).toBeNull()

    // All related rows are gone
    const rowsAfter = await t.run(async (ctx) => {
      const remaining = async (table: string, index: string, key: string) =>
        (
          await ctx.db
            .query(table as 'lists')
            .withIndex(index as 'by_boardId', (q: any) => q.eq('boardId', key))
            .collect()
        ).length
      return {
        lists: await remaining('lists', 'by_boardId', boardId),
        cards: (
          await ctx.db
            .query('cards')
            .withIndex('by_boardId', (q: any) => q.eq('boardId', boardId))
            .collect()
        ).length,
        cardLabels: (
          await ctx.db
            .query('cardLabels')
            .withIndex('by_cardId', (q: any) => q.eq('cardId', cardId))
            .collect()
        ).length,
        cardAssignees: (
          await ctx.db
            .query('cardAssignees')
            .withIndex('by_cardId', (q: any) => q.eq('cardId', cardId))
            .collect()
        ).length,
        comments: (
          await ctx.db
            .query('comments')
            .withIndex('by_cardId', (q: any) => q.eq('cardId', cardId))
            .collect()
        ).length,
        labels: await remaining('labels', 'by_boardId', boardId),
        boardMembers: await remaining('boardMembers', 'by_boardId', boardId),
        activity: await remaining('activity', 'by_boardId', boardId),
        presence: await remaining('presence', 'by_boardId', boardId),
      }
    })
    expect(rowsAfter).toEqual({
      lists: 0,
      cards: 0,
      cardLabels: 0,
      cardAssignees: 0,
      comments: 0,
      labels: 0,
      boardMembers: 0,
      activity: 0,
      presence: 0,
    })

    // Bob no longer sees the board
    const bobBoards = await asBob.query(api.boards.list, {})
    expect(bobBoards).toHaveLength(0)
  })

  it('denies non-owner members from deleting a board', async () => {
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
      name: 'Protected Board',
    })
    await asAlice.mutation(api.members.inviteByEmail, {
      boardId,
      email: 'bob@example.com',
    })

    await expect(
      asBob.mutation(api.boards.remove, { boardId }),
    ).rejects.toThrow('Unauthorized: only the board owner can delete the board')

    // Board still exists
    const board = await asAlice.query(api.boards.get, { boardId })
    expect(board?.name).toBe('Protected Board')
  })

  it('rejects unauthenticated board deletion', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Lonely Board',
    })

    await expect(t.mutation(api.boards.remove, { boardId })).rejects.toThrow(
      'Unauthenticated',
    )
  })
})
