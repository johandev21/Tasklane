import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { Elysia } from 'elysia'
import type { DatabaseClient } from './db'
import * as schema from './db/schema'
import { ApiError, assertTrustedOrigin } from './errors'
import { newId } from './ids'

export interface AuthConfig {
  secret: string
  baseURL: string
  trustedOrigins: string[]
}

export function createAuth(db: DatabaseClient, config: AuthConfig) {
  if (config.secret.length < 32)
    throw new Error('BETTER_AUTH_SECRET must contain at least 32 characters')
  return betterAuth({
    appName: 'Tasklane',
    secret: config.secret,
    baseURL: config.baseURL,
    basePath: '/api/auth',
    trustedOrigins: config.trustedOrigins,
    database: drizzleAdapter(db, { provider: 'sqlite', schema }),
    emailAndPassword: { enabled: true },
    advanced: { database: { generateId: () => newId() } },
  })
}

export type Auth = ReturnType<typeof createAuth>

export function sessionPlugin(auth: Auth, origins: string[]) {
  return new Elysia({ name: 'session' }).macro({
    session: {
      async resolve({ request }) {
        const result = await auth.api.getSession({ headers: request.headers })
        return { user: result?.user ?? null, session: result?.session ?? null }
      },
    },
    auth: {
      async resolve({ request }) {
        assertTrustedOrigin(request, origins)
        const result = await auth.api.getSession({ headers: request.headers })
        if (!result) throw new ApiError(401, 'Authentication required')
        return result
      },
    },
  })
}
