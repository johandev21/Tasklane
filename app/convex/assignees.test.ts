import { describe, it, expect } from 'vitest'
import { convexTest } from 'convex-test'
import schema from './schema'
import { api } from './_generated/api'

describe('assignees', () => {
  it('allows assigning, unassigning, and toggling board members on cards', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })
    const asBob = t.withIdentity({ tokenIdentifier: 'clerk|user_bob' })

    await asAlice.mutation(api.users.upsertUser, {
      name: 'Alice W',
      email: 'alice@example.com',
      imageUrl: 'https://example.com/alice.png',
    })
    await asBob.mutation(api.users.upsertUser, {
      name: 'Bob B',
      email: 'bob@example.com',
      imageUrl: 'https://example.com/bob.png',
    })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Project Alpha',
    })

    // Add Bob as board member
    await t.run(async (ctx) => {
      await ctx.db.insert('boardMembers', {
        boardId,
        userId: 'clerk|user_bob',
      })
    })

    const listId = await asAlice.mutation(api.lists.create, {
      boardId,
      title: 'Backlog',
    })
    const cardId = await asAlice.mutation(api.cards.create, {
      listId,
      title: 'Setup Database',
    })

    // Alice assigns Bob to the card
    const assignId = await asAlice.mutation(api.assignees.addToCard, {
      cardId,
      userId: 'clerk|user_bob',
    })
    expect(assignId).toBeDefined()

    // Query card assignees
    let cardAssignees = await asAlice.query(api.assignees.listByCard, {
      cardId,
    })
    expect(cardAssignees).toHaveLength(1)
    expect(cardAssignees[0].userId).toBe('clerk|user_bob')
    expect(cardAssignees[0].user.name).toBe('Bob B')
    expect(cardAssignees[0].user.email).toBe('bob@example.com')

    // Alice also assigns herself (multi-assignee)
    await asAlice.mutation(api.assignees.addToCard, {
      cardId,
      userId: 'clerk|user_alice',
    })

    cardAssignees = await asAlice.query(api.assignees.listByCard, {
      cardId,
    })
    expect(cardAssignees).toHaveLength(2)

    // Bob unassigns himself from the card
    await asBob.mutation(api.assignees.removeFromCard, {
      cardId,
      userId: 'clerk|user_bob',
    })

    cardAssignees = await asAlice.query(api.assignees.listByCard, {
      cardId,
    })
    expect(cardAssignees).toHaveLength(1)
    expect(cardAssignees[0].userId).toBe('clerk|user_alice')

    // Toggle Bob back on
    const toggledOn = await asAlice.mutation(api.assignees.toggleOnCard, {
      cardId,
      userId: 'clerk|user_bob',
    })
    expect(toggledOn).toBe(true)

    cardAssignees = await asAlice.query(api.assignees.listByCard, {
      cardId,
    })
    expect(cardAssignees).toHaveLength(2)

    // Toggle Bob back off
    const toggledOff = await asAlice.mutation(api.assignees.toggleOnCard, {
      cardId,
      userId: 'clerk|user_bob',
    })
    expect(toggledOff).toBe(false)

    cardAssignees = await asAlice.query(api.assignees.listByCard, {
      cardId,
    })
    expect(cardAssignees).toHaveLength(1)
  })

  it('rejects assigning users who are not members of the board', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })
    const asEve = t.withIdentity({ tokenIdentifier: 'clerk|user_eve' })

    await asEve.mutation(api.users.upsertUser, {
      name: 'Eve Hacker',
      email: 'eve@example.com',
    })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Secret Project',
    })
    const listId = await asAlice.mutation(api.lists.create, {
      boardId,
      title: 'Confidential',
    })
    const cardId = await asAlice.mutation(api.cards.create, {
      listId,
      title: 'Top Secret Plan',
    })

    // Attempting to assign Eve (who is neither owner nor board member) must fail
    await expect(
      asAlice.mutation(api.assignees.addToCard, {
        cardId,
        userId: 'clerk|user_eve',
      }),
    ).rejects.toThrow(
      'Target user is not a member of this board: cannot assign non-member',
    )

    // Toggle must also fail for non-members
    await expect(
      asAlice.mutation(api.assignees.toggleOnCard, {
        cardId,
        userId: 'clerk|user_eve',
      }),
    ).rejects.toThrow(
      'Target user is not a member of this board: cannot assign non-member',
    )
  })

  it('writes activity audit records for assignee_added and assignee_removed', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })
    const asBob = t.withIdentity({ tokenIdentifier: 'clerk|user_bob' })

    await asAlice.mutation(api.users.upsertUser, {
      name: 'Alice Wonder',
      email: 'alice@example.com',
    })
    await asBob.mutation(api.users.upsertUser, {
      name: 'Bob Ross',
      email: 'bob@example.com',
      imageUrl: 'https://example.com/bob.png',
    })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Art Project',
    })
    await t.run(async (ctx) => {
      await ctx.db.insert('boardMembers', {
        boardId,
        userId: 'clerk|user_bob',
      })
    })

    const listId = await asAlice.mutation(api.lists.create, {
      boardId,
      title: 'Canvas',
    })
    const cardId = await asAlice.mutation(api.cards.create, {
      listId,
      title: 'Paint Trees',
    })

    // Assign Bob
    await asAlice.mutation(api.assignees.addToCard, {
      cardId,
      userId: 'clerk|user_bob',
    })

    // Remove Bob
    await asAlice.mutation(api.assignees.removeFromCard, {
      cardId,
      userId: 'clerk|user_bob',
    })

    const activities = await t.run(async (ctx) => {
      return await ctx.db
        .query('activity')
        .withIndex('by_boardId', (q) => q.eq('boardId', boardId))
        .collect()
    })

    const addedAct = activities.find((a) => a.type === 'assignee_added')
    expect(addedAct).toBeDefined()
    expect(addedAct?.actorId).toBe('clerk|user_alice')
    expect(addedAct?.payload.userId).toBe('clerk|user_bob')
    expect(addedAct?.payload.memberName).toBe('Bob Ross')
    expect(addedAct?.payload.memberEmail).toBe('bob@example.com')
    expect(addedAct?.payload.title).toBe('Paint Trees')

    const removedAct = activities.find((a) => a.type === 'assignee_removed')
    expect(removedAct).toBeDefined()
    expect(removedAct?.actorId).toBe('clerk|user_alice')
    expect(removedAct?.payload.userId).toBe('clerk|user_bob')
    expect(removedAct?.payload.memberName).toBe('Bob Ross')
    expect(removedAct?.payload.title).toBe('Paint Trees')
  })

  it('lists all board card assignees with listCardAssigneesForBoard query', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })

    await asAlice.mutation(api.users.upsertUser, {
      name: 'Alice W',
      email: 'alice@example.com',
    })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Sprint Board',
    })
    const listId = await asAlice.mutation(api.lists.create, {
      boardId,
      title: 'Tasks',
    })
    const card1 = await asAlice.mutation(api.cards.create, {
      listId,
      title: 'Card 1',
    })
    const card2 = await asAlice.mutation(api.cards.create, {
      listId,
      title: 'Card 2',
    })

    await asAlice.mutation(api.assignees.addToCard, {
      cardId: card1,
      userId: 'clerk|user_alice',
    })
    await asAlice.mutation(api.assignees.addToCard, {
      cardId: card2,
      userId: 'clerk|user_alice',
    })

    const boardAssignees = await asAlice.query(
      api.assignees.listCardAssigneesForBoard,
      { boardId },
    )
    expect(boardAssignees).toHaveLength(2)
    expect(boardAssignees.map((a) => a.cardId)).toContain(card1)
    expect(boardAssignees.map((a) => a.cardId)).toContain(card2)
    expect(boardAssignees[0].user.name).toBe('Alice W')
  })
})
