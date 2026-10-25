import { describe, it, expect } from 'vitest'
import { convexTest } from 'convex-test'
import schema from './schema'
import { api } from './_generated/api'

describe('members', () => {
  it('lists board owner and members enriched from users table cache', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })
    const asBob = t.withIdentity({ tokenIdentifier: 'clerk|user_bob' })

    // Upsert cached user profiles
    await asAlice.mutation(api.users.upsertUser, {
      name: 'Alice Wonderland',
      email: 'alice@example.com',
      imageUrl: 'https://example.com/alice.jpg',
    })
    await asBob.mutation(api.users.upsertUser, {
      name: 'Bob Builder',
      email: 'bob@example.com',
      imageUrl: 'https://example.com/bob.jpg',
    })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Engineering Board',
    })

    // Add Bob as board member
    await t.run(async (ctx) => {
      await ctx.db.insert('boardMembers', {
        boardId,
        userId: 'clerk|user_bob',
      })
    })

    const members = await asAlice.query(api.members.listByBoard, { boardId })
    expect(members).toHaveLength(2)

    // Alice is Owner and first
    expect(members[0].userId).toBe('clerk|user_alice')
    expect(members[0].name).toBe('Alice Wonderland')
    expect(members[0].email).toBe('alice@example.com')
    expect(members[0].imageUrl).toBe('https://example.com/alice.jpg')
    expect(members[0].isOwner).toBe(true)

    // Bob is Member
    expect(members[1].userId).toBe('clerk|user_bob')
    expect(members[1].name).toBe('Bob Builder')
    expect(members[1].email).toBe('bob@example.com')
    expect(members[1].imageUrl).toBe('https://example.com/bob.jpg')
    expect(members[1].isOwner).toBe(false)
  })

  it('provides graceful fallbacks when user profile cache is missing', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Fallback Board',
    })

    // Add member without users profile cache
    await t.run(async (ctx) => {
      await ctx.db.insert('boardMembers', {
        boardId,
        userId: 'clerk|user_unknown',
      })
    })

    const members = await asAlice.query(api.members.listByBoard, { boardId })
    expect(members).toHaveLength(2)

    const unknownMember = members.find((m) => m.userId === 'clerk|user_unknown')
    expect(unknownMember).toBeDefined()
    expect(unknownMember?.name).toBe('Team Member')
    expect(unknownMember?.isOwner).toBe(false)
  })

  it('denies access to non-members attempting to list board members', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })
    const asCharlie = t.withIdentity({ tokenIdentifier: 'clerk|user_charlie' })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Private Board',
    })

    await expect(
      asCharlie.query(api.members.listByBoard, { boardId }),
    ).rejects.toThrow('Unauthorized: user is not a member of this board')
  })

  it('invites a member by email, grants access, and records member_added activity', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })
    const asBob = t.withIdentity({ tokenIdentifier: 'clerk|user_bob' })

    await asAlice.mutation(api.users.upsertUser, {
      name: 'Alice Owner',
      email: 'alice@example.com',
    })
    await asBob.mutation(api.users.upsertUser, {
      name: 'Bob Colleague',
      email: 'bob@example.com',
      imageUrl: 'https://example.com/bob.png',
    })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Collab Board',
    })

    // Before invitation, Bob has no boards
    const bobBoardsBefore = await asBob.query(api.boards.list, {})
    expect(bobBoardsBefore).toHaveLength(0)

    // Alice invites Bob by email (case-insensitive)
    const membershipId = await asAlice.mutation(api.members.inviteByEmail, {
      boardId,
      email: '  BOB@EXAMPLE.COM  ',
    })
    expect(membershipId).toBeDefined()

    // Bob now sees the board in his boards list
    const bobBoardsAfter = await asBob.query(api.boards.list, {})
    expect(bobBoardsAfter).toHaveLength(1)
    expect(bobBoardsAfter[0]._id).toBe(boardId)
    expect(bobBoardsAfter[0].isOwner).toBe(false)

    // Bob can list members
    const members = await asBob.query(api.members.listByBoard, { boardId })
    expect(members).toHaveLength(2)
    expect(members.map((m) => m.email)).toContain('bob@example.com')

    // Verify activity record
    const activities = await t.run(async (ctx) => {
      return await ctx.db
        .query('activity')
        .withIndex('by_boardId', (q) => q.eq('boardId', boardId))
        .collect()
    })
    const inviteActivity = activities.find((a) => a.type === 'member_added')
    expect(inviteActivity).toBeDefined()
    expect(inviteActivity?.actorId).toBe('clerk|user_alice')
    expect(inviteActivity?.payload.memberId).toBe('clerk|user_bob')
    expect(inviteActivity?.payload.memberName).toBe('Bob Colleague')
    expect(inviteActivity?.payload.memberEmail).toBe('bob@example.com')
    expect(inviteActivity?.payload.memberImageUrl).toBe(
      'https://example.com/bob.png',
    )
  })

  it('rejects invite with clear error when email does not exist', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Solo Board',
    })

    await expect(
      asAlice.mutation(api.members.inviteByEmail, {
        boardId,
        email: 'nonexistent@example.com',
      }),
    ).rejects.toThrow(
      'User with email "nonexistent@example.com" was not found. They must sign in to Tasklane first.',
    )
  })

  it('rejects inviting board owner or already existing members', async () => {
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
      name: 'Test Board',
    })

    // Inviting self (the owner) throws
    await expect(
      asAlice.mutation(api.members.inviteByEmail, {
        boardId,
        email: 'alice@example.com',
      }),
    ).rejects.toThrow('User is already the owner of this board')

    // Invite Bob
    await asAlice.mutation(api.members.inviteByEmail, {
      boardId,
      email: 'bob@example.com',
    })

    // Inviting Bob again throws
    await expect(
      asAlice.mutation(api.members.inviteByEmail, {
        boardId,
        email: 'bob@example.com',
      }),
    ).rejects.toThrow('User is already a member of this board')
  })

  it('enforces owner-only permissions for inviting members', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })
    const asBob = t.withIdentity({ tokenIdentifier: 'clerk|user_bob' })
    const asCharlie = t.withIdentity({ tokenIdentifier: 'clerk|user_charlie' })

    await asAlice.mutation(api.users.upsertUser, {
      name: 'Alice',
      email: 'alice@example.com',
    })
    await asBob.mutation(api.users.upsertUser, {
      name: 'Bob',
      email: 'bob@example.com',
    })
    await asCharlie.mutation(api.users.upsertUser, {
      name: 'Charlie',
      email: 'charlie@example.com',
    })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Restricted Board',
    })

    await asAlice.mutation(api.members.inviteByEmail, {
      boardId,
      email: 'bob@example.com',
    })

    // Bob (a regular member) cannot invite Charlie
    await expect(
      asBob.mutation(api.members.inviteByEmail, {
        boardId,
        email: 'charlie@example.com',
      }),
    ).rejects.toThrow('Unauthorized: only the board owner can invite members')
  })

  it('removes member, revokes board access, cascades card unassignment, and logs activity', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })
    const asBob = t.withIdentity({ tokenIdentifier: 'clerk|user_bob' })

    await asAlice.mutation(api.users.upsertUser, {
      name: 'Alice Owner',
      email: 'alice@example.com',
    })
    await asBob.mutation(api.users.upsertUser, {
      name: 'Bob Builder',
      email: 'bob@example.com',
    })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Active Project',
    })

    await asAlice.mutation(api.members.inviteByEmail, {
      boardId,
      email: 'bob@example.com',
    })

    // Create a list and card, assign Bob to it
    const listId = await asAlice.mutation(api.lists.create, {
      boardId,
      title: 'In Progress',
    })
    const cardId = await asAlice.mutation(api.cards.create, {
      listId,
      title: 'Feature implementation',
    })
    await asAlice.mutation(api.assignees.addToCard, {
      cardId,
      userId: 'clerk|user_bob',
    })

    // Verify Bob is assigned
    const assigneesBefore = await asAlice.query(api.assignees.listByCard, {
      cardId,
    })
    expect(assigneesBefore).toHaveLength(1)
    expect(assigneesBefore[0].userId).toBe('clerk|user_bob')

    // Alice removes Bob from the board
    await asAlice.mutation(api.members.remove, {
      boardId,
      userId: 'clerk|user_bob',
    })

    // Members list now only contains Alice
    const membersAfter = await asAlice.query(api.members.listByBoard, {
      boardId,
    })
    expect(membersAfter).toHaveLength(1)
    expect(membersAfter[0].userId).toBe('clerk|user_alice')

    // Card assignees were cascaded and Bob is unassigned
    const assigneesAfter = await asAlice.query(api.assignees.listByCard, {
      cardId,
    })
    expect(assigneesAfter).toHaveLength(0)

    // Bob can no longer access the board
    await expect(
      asBob.query(api.members.listByBoard, { boardId }),
    ).rejects.toThrow('Unauthorized: user is not a member of this board')

    // Bob's boards list is empty
    const bobBoards = await asBob.query(api.boards.list, {})
    expect(bobBoards).toHaveLength(0)

    // Verify member_removed activity log
    const activities = await t.run(async (ctx) => {
      return await ctx.db
        .query('activity')
        .withIndex('by_boardId', (q) => q.eq('boardId', boardId))
        .collect()
    })
    const removeActivity = activities.find((a) => a.type === 'member_removed')
    expect(removeActivity).toBeDefined()
    expect(removeActivity?.actorId).toBe('clerk|user_alice')
    expect(removeActivity?.payload.memberId).toBe('clerk|user_bob')
    expect(removeActivity?.payload.memberName).toBe('Bob Builder')
  })

  it('enforces owner-only permission on member removal and prevents owner removal', async () => {
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
      name: 'Security Test Board',
    })

    await asAlice.mutation(api.members.inviteByEmail, {
      boardId,
      email: 'bob@example.com',
    })

    // Non-owner cannot remove members
    await expect(
      asBob.mutation(api.members.remove, {
        boardId,
        userId: 'clerk|user_bob',
      }),
    ).rejects.toThrow('Unauthorized: only the board owner can remove members')

    // Owner cannot remove themselves
    await expect(
      asAlice.mutation(api.members.remove, {
        boardId,
        userId: 'clerk|user_alice',
      }),
    ).rejects.toThrow('Cannot remove board owner from the board')
  })
})
