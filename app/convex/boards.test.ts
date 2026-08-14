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
})
