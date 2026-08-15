import { describe, it, expect } from 'vitest'
import { convexTest } from 'convex-test'
import schema from './schema'
import { api } from './_generated/api'

describe('activity', () => {
  it('returns activity entries newest-first for a board', async () => {
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

    // board_created
    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Roadmap',
    })
    // member_added
    await asAlice.mutation(api.members.inviteByEmail, {
      boardId,
      email: 'bob@example.com',
    })
    // list_created
    const listId = await asBob.mutation(api.lists.create, {
      boardId,
      title: 'Backlog',
    })
    // card_created
    const cardId = await asBob.mutation(api.cards.create, {
      listId,
      title: 'Design tokens',
    })
    // comment_added (most recent)
    await asBob.mutation(api.comments.add, {
      cardId,
      body: 'Let us start here',
    })

    const activities = await asBob.query(api.activity.list, { boardId })

    // All five events present, newest first
    const types = activities.map((a) => a.type)
    expect(types).toEqual([
      'comment_added',
      'card_created',
      'list_created',
      'member_added',
      'board_created',
    ])

    // Strictly non-increasing creation time
    for (let i = 1; i < activities.length; i++) {
      expect(activities[i - 1]._creationTime).toBeGreaterThanOrEqual(
        activities[i]._creationTime,
      )
    }
  })

  it('enriches activity entries with actor profile cache details', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })

    await asAlice.mutation(api.users.upsertUser, {
      name: 'Alice Wonderland',
      email: 'alice@example.com',
      imageUrl: 'https://example.com/alice.jpg',
    })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Collab Board',
    })
    const listId = await asAlice.mutation(api.lists.create, {
      boardId,
      title: 'In Progress',
    })
    await asAlice.mutation(api.cards.create, {
      listId,
      title: 'Build the feed',
    })

    const activities = await asAlice.query(api.activity.list, { boardId })

    const listCreated = activities.find((a) => a.type === 'list_created')
    expect(listCreated?.actor).toEqual({
      tokenIdentifier: 'clerk|user_alice',
      name: 'Alice Wonderland',
      email: 'alice@example.com',
      imageUrl: 'https://example.com/alice.jpg',
    })
  })

  it('provides graceful fallbacks when actor profile cache is missing', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })

    // No users profile row for Alice
    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Profileless Board',
    })

    const activities = await asAlice.query(api.activity.list, { boardId })
    const created = activities.find((a) => a.type === 'board_created')
    expect(created?.actor.name).toBe('Team Member')
    expect(created?.actor.email).toBe('')
  })

  it('scopes activity strictly to board members', async () => {
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

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Members Only',
    })
    await asAlice.mutation(api.members.inviteByEmail, {
      boardId,
      email: 'bob@example.com',
    })

    // Member can read the feed
    const bobFeed = await asBob.query(api.activity.list, { boardId })
    expect(bobFeed.length).toBeGreaterThan(0)

    // Non-member is rejected
    await expect(
      asCharlie.query(api.activity.list, { boardId }),
    ).rejects.toThrow('Unauthorized: user is not a member of this board')
  })

  it('does not leak activity across boards', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })

    const boardA = await asAlice.mutation(api.boards.create, {
      name: 'Board A',
    })
    const boardB = await asAlice.mutation(api.boards.create, {
      name: 'Board B',
    })

    // More activity on board A than board B
    const listIdA = await asAlice.mutation(api.lists.create, {
      boardId: boardA,
      title: 'Todo',
    })
    await asAlice.mutation(api.cards.create, {
      listId: listIdA,
      title: 'A task',
    })

    const feedA = await asAlice.query(api.activity.list, { boardId: boardA })
    const feedB = await asAlice.query(api.activity.list, { boardId: boardB })

    expect(feedA.some((a) => a.type === 'card_created')).toBe(true)
    expect(feedB.every((a) => a.type === 'board_created')).toBe(true)
    expect(feedB).toHaveLength(1)
  })
})
