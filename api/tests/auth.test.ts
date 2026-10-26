import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { createApi } from '../src/app'
import { account, session } from '../src/db/schema'
import { fixture, ORIGIN, PASSWORD } from './helpers'
import type { Fixture } from './helpers'

describe('authentication and HTTP contract', () => {
  let f: Fixture
  beforeEach(async () => {
    f = await fixture()
  })
  afterEach(async () => {
    await f.close()
  })

  test('serves health and JSON null for unauthenticated single-record reads', async () => {
    expect(await f.json('GET', '/api/health')).toEqual({ status: 'ok' })
    for (const path of [
      '/api/users/me',
      '/api/boards/missing',
      '/api/cards/missing',
    ]) {
      const response = await f.request('GET', path)
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toContain('application/json')
      expect(await response.json()).toBeNull()
    }
  })

  test('sign-up persists Better Auth profiles, password hashes, sessions, and ULID ids', async () => {
    const current = await f.json<{ id: string; name: string; email: string }>(
      'GET',
      '/api/users/me',
      f.alice,
    )
    expect(current).toMatchObject({
      id: f.alice.id,
      name: 'Alice',
      email: 'alice@example.com',
    })
    expect(current.id).toMatch(/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/)
    const credential = f.connection.db
      .select()
      .from(account)
      .where(eq(account.userId, current.id))
      .get()!
    expect(credential.providerId).toBe('credential')
    expect(credential.password).toBeString()
    expect(credential.password).not.toBe(PASSWORD)
    const sessions = f.connection.db
      .select()
      .from(session)
      .where(eq(session.userId, current.id))
      .all()
    expect(sessions).toHaveLength(1)
    expect(sessions[0]!.expiresAt.getTime()).toBeGreaterThan(Date.now())
  })

  test('supports email/password sign-in and revokes the cookie session at sign-out', async () => {
    const response = await f.request(
      'POST',
      '/api/auth/sign-in/email',
      undefined,
      { email: f.alice.email, password: PASSWORD },
    )
    expect(response.status).toBe(200)
    const loggedIn = {
      ...f.alice,
      cookie: response.headers
        .getSetCookie()
        .map((cookie) => cookie.split(';')[0])
        .join('; '),
    }
    expect(await f.json('GET', '/api/users/me', loggedIn)).toMatchObject({
      id: f.alice.id,
    })
    expect(
      (await f.request('POST', '/api/auth/sign-out', loggedIn, {})).status,
    ).toBe(200)
    expect(await f.json('GET', '/api/users/me', loggedIn)).toBeNull()
    expect(
      (await f.request('POST', '/api/boards', loggedIn, { name: 'Denied' }))
        .status,
    ).toBe(401)
  })

  test('rejects invalid passwords and forged or expired sessions', async () => {
    expect(
      (
        await f.request('POST', '/api/auth/sign-in/email', undefined, {
          email: f.alice.email,
          password: 'wrong-password',
        })
      ).status,
    ).toBe(401)
    expect(
      await f.json('GET', '/api/users/me', {
        ...f.alice,
        cookie: 'better-auth.session_token=forged',
      }),
    ).toBeNull()
    f.connection.db
      .update(session)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(session.userId, f.alice.id))
      .run()
    expect(await f.json('GET', '/api/users/me', f.alice)).toBeNull()
  })

  test('allows credentialed CORS from the configured origin and rejects cross-origin writes', async () => {
    const response = await f.request('GET', '/api/health')
    expect(response.headers.get('access-control-allow-origin')).toBe(ORIGIN)
    expect(response.headers.get('access-control-allow-credentials')).toBe(
      'true',
    )
    const denied = await f.request(
      'POST',
      '/api/boards',
      f.alice,
      { name: 'Denied' },
      { origin: 'https://untrusted.example' },
    )
    expect(denied.status).toBe(403)
    expect(await f.json('GET', '/api/boards', f.alice)).toEqual([])
    const preflight = await f.request(
      'OPTIONS',
      '/api/boards',
      undefined,
      undefined,
      {
        'access-control-request-method': 'PATCH',
        'access-control-request-headers': 'content-type',
      },
    )
    expect(preflight.status).toBeLessThan(300)
    expect(preflight.headers.get('access-control-allow-methods')).toContain(
      'PATCH',
    )
  })

  test('validates request bodies and rejects missing server secrets', async () => {
    expect(
      (await f.request('POST', '/api/boards', f.alice, { name: 42 })).status,
    ).toBe(422)
    expect((await f.request('GET', '/not-a-route')).status).toBe(404)
    expect(() => createApi({ secret: 'too-short' })).toThrow(
      'BETTER_AUTH_SECRET',
    )
  })
})
