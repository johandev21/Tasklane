import { describe, it, expect } from 'vitest'
import { convexTest } from 'convex-test'
import schema from './schema'
import { api } from './_generated/api'

describe('users', () => {
  it('rejects unauthenticated user upsert', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    await expect(t.mutation(api.users.upsertUser, {})).rejects.toThrow(
      'Unauthenticated',
    )
  })

  it('upserts and queries authenticated user', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({
      tokenIdentifier: 'clerk|user_alice',
      name: 'Alice Smith',
      email: 'alice@example.com',
      pictureUrl: 'https://example.com/alice.png',
    })

    const userId = await asAlice.mutation(api.users.upsertUser, {
      name: 'Alice Smith',
      email: 'alice@example.com',
      imageUrl: 'https://example.com/alice.png',
    })

    expect(userId).toBeDefined()

    const current = await asAlice.query(api.users.currentUser, {})
    expect(current).not.toBeNull()
    expect(current?.name).toBe('Alice Smith')
    expect(current?.email).toBe('alice@example.com')
    expect(current?.tokenIdentifier).toBe('clerk|user_alice')
  })
})
