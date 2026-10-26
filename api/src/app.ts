import { cors } from '@elysiajs/cors'
import { Elysia } from 'elysia'
import { createAuth } from './auth'
import { PRESENCE_SWEEP_INTERVAL_MS } from './constants'
import { createDatabase } from './db'
import type { Connection } from './db'
import { ApiError, assertTrustedOrigin } from './errors'
import { activityModule } from './modules/activity'
import { assigneesModule } from './modules/assignees'
import { boardsModule } from './modules/boards'
import { cardsModule } from './modules/cards'
import { commentsModule } from './modules/comments'
import { labelsModule } from './modules/labels'
import { listsModule } from './modules/lists'
import { membersModule } from './modules/members'
import { presenceModule } from './modules/presence'
import { socketModule } from './modules/socket'
import { sweepPresence } from './presence-store'
import { createServices } from './services'

export interface ApiOptions {
  connection?: Connection
  databaseURL?: string
  secret?: string
  baseURL?: string
  webOrigins?: string[]
}

export function createApi(options: ApiOptions = {}) {
  const secret = options.secret ?? process.env.BETTER_AUTH_SECRET ?? ''
  if (secret.length < 32)
    throw new Error('BETTER_AUTH_SECRET must contain at least 32 characters')
  const baseURL =
    options.baseURL ?? process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'
  const webOrigins =
    options.webOrigins ??
    (process.env.WEB_ORIGIN ?? 'http://localhost:3000')
      .split(',')
      .map((origin) => origin.trim())
  const origins = [...new Set([...webOrigins, new URL(baseURL).origin])]
  const connection = options.connection ?? createDatabase(options.databaseURL)
  const auth = createAuth(connection.db, {
    secret,
    baseURL,
    trustedOrigins: origins,
  })
  const services = createServices(connection, auth, origins)
  let sweepTimer: ReturnType<typeof setInterval> | undefined
  function sweep(now = Date.now()) {
    const boards = new Set(
      sweepPresence(connection.db, now).map((entry) => entry.boardId),
    )
    for (const boardId of services.rooms.prune()) boards.add(boardId)
    for (const boardId of boards) services.rooms.presenceChanged(boardId)
    return boards.size
  }
  const app = new Elysia()
    .use(
      cors({
        origin: origins,
        credentials: true,
        methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      }),
    )
    .mapResponse({ as: 'global' }, ({ response }) => {
      if (response === null || typeof response === 'string')
        return Response.json(response)
    })
    .onError(({ error, code, set }) => {
      if (error instanceof ApiError) {
        set.status = error.status
        return { error: error.message }
      }
      if (code === 'VALIDATION' || code === 'PARSE') {
        set.status = 422
        return { error: 'Invalid request' }
      }
      if (code === 'NOT_FOUND') {
        set.status = 404
        return { error: 'Route not found' }
      }
      set.status = 500
      console.error(error)
      return { error: 'Internal server error' }
    })
    .onRequest(({ request }) => {
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method))
        assertTrustedOrigin(request, origins)
    })
    .get('/api/health', () => ({ status: 'ok' as const }))
    .mount(auth.handler)
    .use(services.sessions)
    .get('/api/users/me', ({ user }) => user, { session: true })
    .use(boardsModule(services))
    .use(listsModule(services))
    .use(cardsModule(services))
    .use(labelsModule(services))
    .use(membersModule(services))
    .use(assigneesModule(services))
    .use(commentsModule(services))
    .use(activityModule(services))
    .use(presenceModule(services))
    .use(socketModule(services))
    .onStart(() => {
      sweepTimer = setInterval(() => sweep(), PRESENCE_SWEEP_INTERVAL_MS)
      sweepTimer.unref()
    })
    .onStop(() => {
      clearInterval(sweepTimer)
      services.rooms.close()
    })

  services.rooms.publish = (topic, payload) =>
    app.server?.publish(topic, payload)

  return { app, auth, connection, services, sweep }
}
