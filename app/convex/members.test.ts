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
})
