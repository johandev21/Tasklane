import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { assertBoardAccess } from './auth_helpers'

/**
 * Returns all active members of a board (including the board owner),
 * enriched with cached user profile details from the users table.
 */
export const listByBoard = query({
  args: {
    boardId: v.id('boards'),
  },
  handler: async (ctx, args) => {
    const { board } = await assertBoardAccess(ctx, args.boardId)

    const memberships = await ctx.db
      .query('boardMembers')
      .withIndex('by_boardId', (q) => q.eq('boardId', args.boardId))
      .collect()

    const memberUserIds = new Set<string>()
    // Owner is always a member
    memberUserIds.add(board.ownerId)
    for (const membership of memberships) {
      memberUserIds.add(membership.userId)
    }

    const members = await Promise.all(
      Array.from(memberUserIds).map(async (userId) => {
        const isOwner = userId === board.ownerId
        const user = await ctx.db
          .query('users')
          .withIndex('by_tokenIdentifier', (q) =>
            q.eq('tokenIdentifier', userId),
          )
          .first()

        return {
          userId,
          name: user?.name ?? (isOwner ? 'Board Owner' : 'Team Member'),
          email: user?.email ?? '',
          imageUrl: user?.imageUrl,
          isOwner,
        }
      }),
    )

    // Sort: owner first, then alphabetically by name
    return members.sort((a, b) => {
      if (a.isOwner) return -1
      if (b.isOwner) return 1
      return a.name.localeCompare(b.name)
    })
  },
})

export const list = listByBoard

/**
 * Invites a user to a board by their email address.
 * Only the board owner can invite members.
 */
export const inviteByEmail = mutation({
  args: {
    boardId: v.id('boards'),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const {
      userId: actorId,
      board,
      isOwner,
    } = await assertBoardAccess(ctx, args.boardId)

    if (!isOwner) {
      throw new Error('Unauthorized: only the board owner can invite members')
    }

    const trimmedEmail = args.email.trim().toLowerCase()
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      throw new Error('Please provide a valid email address')
    }

    // Look up target user by email in cached users table
    const targetUser = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', trimmedEmail))
      .first()

    if (!targetUser) {
      throw new Error(
        `User with email "${args.email.trim()}" was not found. They must sign in to Tasklane first.`,
      )
    }

    // Check if target user is already the owner
    if (targetUser.tokenIdentifier === board.ownerId) {
      throw new Error('User is already the owner of this board')
    }

    // Check if target user is already a member
    const existingMembership = await ctx.db
      .query('boardMembers')
      .withIndex('by_board_and_user', (q) =>
        q.eq('boardId', args.boardId).eq('userId', targetUser.tokenIdentifier),
      )
      .first()

    if (existingMembership) {
      throw new Error('User is already a member of this board')
    }

    const membershipId = await ctx.db.insert('boardMembers', {
      boardId: args.boardId,
      userId: targetUser.tokenIdentifier,
    })

    // Record activity audit log
    await ctx.db.insert('activity', {
      boardId: args.boardId,
      actorId,
      type: 'member_added',
      payload: {
        memberId: targetUser.tokenIdentifier,
        memberName: targetUser.name ?? 'Team Member',
        memberEmail: targetUser.email,
        memberImageUrl: targetUser.imageUrl,
      },
    })

    return membershipId
  },
})

/**
 * Removes a member from a board and cascades cleanup of any active card assignees on this board.
 * Only the board owner can remove members, and the owner cannot be removed.
 */
export const remove = mutation({
  args: {
    boardId: v.id('boards'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const {
      userId: actorId,
      board,
      isOwner,
    } = await assertBoardAccess(ctx, args.boardId)

    if (!isOwner) {
      throw new Error('Unauthorized: only the board owner can remove members')
    }

    if (args.userId === board.ownerId) {
      throw new Error('Cannot remove board owner from the board')
    }

    const membership = await ctx.db
      .query('boardMembers')
      .withIndex('by_board_and_user', (q) =>
        q.eq('boardId', args.boardId).eq('userId', args.userId),
      )
      .first()

    if (membership) {
      await ctx.db.delete(membership._id)

      // Cascade cleanup of card assignments for this user on this board
      const cards = await ctx.db
        .query('cards')
        .withIndex('by_boardId', (q) => q.eq('boardId', args.boardId))
        .collect()

      const boardCardIds = new Set(cards.map((c) => c._id))

      const userAssignees = await ctx.db
        .query('cardAssignees')
        .withIndex('by_userId', (q) => q.eq('userId', args.userId))
        .collect()

      for (const assignee of userAssignees) {
        if (boardCardIds.has(assignee.cardId)) {
          await ctx.db.delete(assignee._id)
        }
      }

      // Fetch user profile for activity log payload
      const targetUser = await ctx.db
        .query('users')
        .withIndex('by_tokenIdentifier', (q) =>
          q.eq('tokenIdentifier', args.userId),
        )
        .first()

      await ctx.db.insert('activity', {
        boardId: args.boardId,
        actorId,
        type: 'member_removed',
        payload: {
          memberId: args.userId,
          memberName: targetUser?.name ?? 'Team Member',
          memberEmail: targetUser?.email ?? '',
          memberImageUrl: targetUser?.imageUrl,
        },
      })
    }
  },
})

export const removeMember = remove
