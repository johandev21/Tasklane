import { describe, it, expect } from 'vitest'
import { convexTest } from 'convex-test'
import schema from './schema'
import { api } from './_generated/api'

describe('comments', () => {
  it('allows board members to add comments and lists them in chronological order with enriched author profile', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })
    const asBob = t.withIdentity({ tokenIdentifier: 'clerk|user_bob' })

    await asAlice.mutation(api.users.upsertUser, {
      name: 'Alice Wonderland',
      email: 'alice@example.com',
      imageUrl: 'https://example.com/alice.png',
    })
    await asBob.mutation(api.users.upsertUser, {
      name: 'Bob Builder',
      email: 'bob@example.com',
      imageUrl: 'https://example.com/bob.png',
    })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Sprint 1',
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
      title: 'In Progress',
    })
    const cardId = await asAlice.mutation(api.cards.create, {
      listId,
      title: 'Implement Auth',
    })

    // Alice adds first comment
    const comment1Id = await asAlice.mutation(api.comments.add, {
      cardId,
      body: 'First comment from Alice',
    })
    expect(comment1Id).toBeDefined()

    // Bob adds second comment
    const comment2Id = await asBob.mutation(api.comments.add, {
      cardId,
      body: 'Second comment from Bob',
    })
    expect(comment2Id).toBeDefined()

    // Query comments on the card
    const comments = await asAlice.query(api.comments.listByCard, {
      cardId,
    })

    expect(comments).toHaveLength(2)
    // Verify chronological ordering
    expect(comments[0]._id).toBe(comment1Id)
    expect(comments[0].body).toBe('First comment from Alice')
    expect(comments[0].author.name).toBe('Alice Wonderland')
    expect(comments[0].author.email).toBe('alice@example.com')
    expect(comments[0].author.imageUrl).toBe('https://example.com/alice.png')
    expect(comments[0].author.isOwner).toBe(true)

    expect(comments[1]._id).toBe(comment2Id)
    expect(comments[1].body).toBe('Second comment from Bob')
    expect(comments[1].author.name).toBe('Bob Builder')
    expect(comments[1].author.email).toBe('bob@example.com')
    expect(comments[1].author.imageUrl).toBe('https://example.com/bob.png')
    expect(comments[1].author.isOwner).toBe(false)
  })

  it('enforces author-only editing and rejects other board members', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })
    const asBob = t.withIdentity({ tokenIdentifier: 'clerk|user_bob' })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Project Beta',
    })
    await t.run(async (ctx) => {
      await ctx.db.insert('boardMembers', {
        boardId,
        userId: 'clerk|user_bob',
      })
    })

    const listId = await asAlice.mutation(api.lists.create, {
      boardId,
      title: 'To Do',
    })
    const cardId = await asAlice.mutation(api.cards.create, {
      listId,
      title: 'Design UI',
    })

    const bobCommentId = await asBob.mutation(api.comments.add, {
      cardId,
      body: 'Initial note from Bob',
    })

    // Alice (even though board owner) cannot edit Bob's comment
    await expect(
      asAlice.mutation(api.comments.update, {
        commentId: bobCommentId,
        body: 'Alice trying to change Bob note',
      }),
    ).rejects.toThrow(
      'Unauthorized: only the comment author can edit this comment',
    )

    // Bob can edit his own comment
    await asBob.mutation(api.comments.update, {
      commentId: bobCommentId,
      body: 'Updated note from Bob',
    })

    const comments = await asBob.query(api.comments.listByCard, { cardId })
    expect(comments[0].body).toBe('Updated note from Bob')
  })

  it('enforces author-only deletion and rejects other board members', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })
    const asBob = t.withIdentity({ tokenIdentifier: 'clerk|user_bob' })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Project Gamma',
    })
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
      title: 'Refactor Code',
    })

    const bobCommentId = await asBob.mutation(api.comments.add, {
      cardId,
      body: 'Bob suggestion',
    })

    // Alice cannot delete Bob's comment
    await expect(
      asAlice.mutation(api.comments.remove, {
        commentId: bobCommentId,
      }),
    ).rejects.toThrow(
      'Unauthorized: only the comment author can delete this comment',
    )

    // Bob can delete his own comment
    await asBob.mutation(api.comments.remove, {
      commentId: bobCommentId,
    })

    const comments = await asAlice.query(api.comments.listByCard, { cardId })
    expect(comments).toHaveLength(0)
  })

  it('rejects non-members from adding or viewing comments', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })
    const asEve = t.withIdentity({ tokenIdentifier: 'clerk|user_eve' })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Confidential Board',
    })
    const listId = await asAlice.mutation(api.lists.create, {
      boardId,
      title: 'Private List',
    })
    const cardId = await asAlice.mutation(api.cards.create, {
      listId,
      title: 'Secret Task',
    })

    // Eve (non-member) cannot add comment
    await expect(
      asEve.mutation(api.comments.add, {
        cardId,
        body: 'Eve intruding',
      }),
    ).rejects.toThrow('Unauthorized: user is not a member of this board')

    // Eve cannot view comments
    await expect(
      asEve.query(api.comments.listByCard, { cardId }),
    ).rejects.toThrow('Unauthorized: user is not a member of this board')
  })

  it('validates non-empty comment body on add and update', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Validation Test',
    })
    const listId = await asAlice.mutation(api.lists.create, {
      boardId,
      title: 'Tasks',
    })
    const cardId = await asAlice.mutation(api.cards.create, {
      listId,
      title: 'Card 1',
    })

    // Empty body on add
    await expect(
      asAlice.mutation(api.comments.add, {
        cardId,
        body: '   ',
      }),
    ).rejects.toThrow('Comment body cannot be empty')

    const commentId = await asAlice.mutation(api.comments.add, {
      cardId,
      body: 'Valid comment',
    })

    // Empty body on update
    await expect(
      asAlice.mutation(api.comments.update, {
        commentId,
        body: '',
      }),
    ).rejects.toThrow('Comment body cannot be empty')
  })

  it('writes activity audit records for comment_added with snippet', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })

    await asAlice.mutation(api.users.upsertUser, {
      name: 'Alice W',
      email: 'alice@example.com',
    })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Audit Board',
    })
    const listId = await asAlice.mutation(api.lists.create, {
      boardId,
      title: 'Sprint',
    })
    const cardId = await asAlice.mutation(api.cards.create, {
      listId,
      title: 'Setup Redis',
    })

    const commentText =
      'This is a long comment to verify snippet truncating behavior in the activity log payload when exceeding maximum length.'
    await asAlice.mutation(api.comments.add, {
      cardId,
      body: commentText,
    })

    const activities = await t.run(async (ctx) => {
      return await ctx.db
        .query('activity')
        .withIndex('by_boardId', (q) => q.eq('boardId', boardId))
        .collect()
    })

    const commentAct = activities.find((a) => a.type === 'comment_added')
    expect(commentAct).toBeDefined()
    expect(commentAct?.actorId).toBe('clerk|user_alice')
    expect(commentAct?.payload.cardId).toBe(cardId)
    expect(commentAct?.payload.title).toBe('Setup Redis')
    expect(commentAct?.payload.authorName).toBe('Alice W')
    expect(commentAct?.payload.authorEmail).toBe('alice@example.com')
    expect(commentAct?.payload.commentBody).toBe(commentText)
    expect(commentAct?.payload.snippet.endsWith('...')).toBe(true)
  })

  it('returns board card comment counts with listCommentsCountForBoard query', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Count Test Board',
    })
    const listId = await asAlice.mutation(api.lists.create, {
      boardId,
      title: 'Column',
    })
    const card1 = await asAlice.mutation(api.cards.create, {
      listId,
      title: 'Card One',
    })
    const card2 = await asAlice.mutation(api.cards.create, {
      listId,
      title: 'Card Two',
    })
    const card3 = await asAlice.mutation(api.cards.create, {
      listId,
      title: 'Card Three',
    })

    // Add 2 comments to card1, 1 comment to card2, 0 to card3
    await asAlice.mutation(api.comments.add, {
      cardId: card1,
      body: 'Comment 1 on Card 1',
    })
    await asAlice.mutation(api.comments.add, {
      cardId: card1,
      body: 'Comment 2 on Card 1',
    })
    await asAlice.mutation(api.comments.add, {
      cardId: card2,
      body: 'Comment 1 on Card 2',
    })

    const counts = await asAlice.query(api.comments.listCommentsCountForBoard, {
      boardId,
    })

    expect(counts).toHaveLength(2)
    const card1Count = counts.find((c) => c.cardId === card1)?.count
    const card2Count = counts.find((c) => c.cardId === card2)?.count
    const card3Count = counts.find((c) => c.cardId === card3)

    expect(card1Count).toBe(2)
    expect(card2Count).toBe(1)
    expect(card3Count).toBeUndefined()
  })

  it('paginates comments in reverse chronological order with enrichment', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })

    await asAlice.mutation(api.users.upsertUser, {
      name: 'Alice Wonderland',
      email: 'alice@example.com',
      imageUrl: 'https://example.com/alice.png',
    })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Pagination Board',
    })
    const listId = await asAlice.mutation(api.lists.create, {
      boardId,
      title: 'Backlog',
    })
    const cardId = await asAlice.mutation(api.cards.create, {
      listId,
      title: 'Paginated Card',
    })

    // Add 5 comments
    const ids: string[] = []
    for (let i = 1; i <= 5; i++) {
      const id = await asAlice.mutation(api.comments.add, {
        cardId,
        body: `Comment ${i}`,
      })
      ids.push(id)
    }

    // Page 1: 2 items
    const page1 = await asAlice.query(api.comments.listByCardPaginated, {
      cardId,
      paginationOpts: { numItems: 2, cursor: null },
    })

    expect(page1.page).toHaveLength(2)
    expect(page1.isDone).toBe(false)
    expect(page1.page[0]._id).toBe(ids[4]) // Newest first
    expect(page1.page[0].body).toBe('Comment 5')
    expect(page1.page[0].author.name).toBe('Alice Wonderland')
    expect(page1.page[1]._id).toBe(ids[3])
    expect(page1.page[1].body).toBe('Comment 4')

    // Page 2: next 2 items
    const page2 = await asAlice.query(api.comments.listByCardPaginated, {
      cardId,
      paginationOpts: { numItems: 2, cursor: page1.continueCursor },
    })

    expect(page2.page).toHaveLength(2)
    expect(page2.isDone).toBe(false)
    expect(page2.page[0]._id).toBe(ids[2])
    expect(page2.page[1]._id).toBe(ids[1])

    // Page 3: last 1 item
    const page3 = await asAlice.query(api.comments.listByCardPaginated, {
      cardId,
      paginationOpts: { numItems: 2, cursor: page2.continueCursor },
    })

    expect(page3.page).toHaveLength(1)
    expect(page3.isDone).toBe(true)
    expect(page3.page[0]._id).toBe(ids[0])
    expect(page3.page[0].body).toBe('Comment 1')
  })
})
