import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

/**
 * Syncs the authenticated Clerk user to the internal Convex users cache table.
 */
export const upsertUser = mutation({
  args: {
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error(
        'Unauthenticated: cannot upsert user without valid session',
      )
    }

    const tokenIdentifier = identity.tokenIdentifier
    const email = args.email ?? identity.email ?? ''
    const name = args.name ?? identity.name ?? identity.nickname
    const imageUrl = args.imageUrl ?? identity.pictureUrl

    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_tokenIdentifier', (q) =>
        q.eq('tokenIdentifier', tokenIdentifier),
      )
      .first()

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        ...(name !== undefined && { name }),
        ...(email ? { email } : {}),
        ...(imageUrl !== undefined && { imageUrl }),
      })
      return existingUser._id
    }

    return await ctx.db.insert('users', {
      tokenIdentifier,
      name,
      email,
      imageUrl,
    })
  },
})

/**
 * Returns the currently authenticated user's cached profile.
 */
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return null
    }

    return await ctx.db
      .query('users')
      .withIndex('by_tokenIdentifier', (q) =>
        q.eq('tokenIdentifier', identity.tokenIdentifier),
      )
      .first()
  },
})

/**
 * Lookup a user by token identifier.
 */
export const getUserByToken = query({
  args: { tokenIdentifier: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('users')
      .withIndex('by_tokenIdentifier', (q) =>
        q.eq('tokenIdentifier', args.tokenIdentifier),
      )
      .first()
  },
})
