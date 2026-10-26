import { expect } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApi } from '../src/app'

export const ORIGIN = 'http://localhost:3000'
export const PASSWORD = 'Strong-password-123!'
export interface TestUser {
  id: string
  name: string
  email: string
  cookie: string
}

export async function fixture() {
  const directory = mkdtempSync(join(tmpdir(), 'tasklane-api-'))
  const runtime = createApi({
    databaseURL: join(directory, 'test.sqlite'),
    secret: 'test-secret-with-at-least-32-characters',
    baseURL: ORIGIN,
    webOrigins: [ORIGIN],
  })
  async function request(
    method: string,
    path: string,
    actor?: TestUser,
    body?: unknown,
    extraHeaders?: RequestInit['headers'],
  ) {
    const headers = new Headers(extraHeaders)
    headers.set('origin', headers.get('origin') ?? ORIGIN)
    if (actor) headers.set('cookie', actor.cookie)
    if (body !== undefined) headers.set('content-type', 'application/json')
    return runtime.app.handle(
      new Request(`${ORIGIN}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    )
  }
  async function json<T>(
    method: string,
    path: string,
    actor?: TestUser,
    body?: unknown,
  ): Promise<T> {
    const response = await request(method, path, actor, body)
    if (response.status !== 200)
      throw new Error(
        `${method} ${path}: ${response.status} ${await response.text()}`,
      )
    return response.json() as Promise<T>
  }
  async function register(name: string) {
    const email = `${name.toLowerCase()}@example.com`
    const response = await request(
      'POST',
      '/api/auth/sign-up/email',
      undefined,
      { name, email, password: PASSWORD },
    )
    expect(response.status).toBe(200)
    const result = (await response.json()) as { user: { id: string } }
    const cookie = response.headers
      .getSetCookie()
      .map((entry) => entry.split(';')[0])
      .join('; ')
    expect(cookie).toContain('better-auth.session_token=')
    return { id: result.user.id, name, email, cookie }
  }
  const alice = await register('Alice')
  const bob = await register('Bob')
  const eve = await register('Eve')
  async function board(actor = alice, name = 'Roadmap') {
    return json<string>('POST', '/api/boards', actor, { name })
  }
  async function list(boardId: string, title = 'Backlog', actor = alice) {
    return json<string>('POST', `/api/boards/${boardId}/lists`, actor, {
      title,
    })
  }
  async function card(listId: string, title = 'Build the API', actor = alice) {
    return json<string>('POST', `/api/lists/${listId}/cards`, actor, { title })
  }
  async function invite(boardId: string, actor = bob) {
    return json<string>('POST', `/api/boards/${boardId}/members`, alice, {
      email: actor.email,
    })
  }
  async function close() {
    if (runtime.app.server) await runtime.app.stop(true)
    runtime.connection.close()
    rmSync(directory, { recursive: true, force: true })
  }
  return {
    ...runtime,
    directory,
    request,
    json,
    alice,
    bob,
    eve,
    board,
    list,
    card,
    invite,
    close,
  }
}

export type Fixture = Awaited<ReturnType<typeof fixture>>
