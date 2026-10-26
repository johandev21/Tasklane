import { createApi } from './app'

export { createApi } from './app'
export type { ApiOptions } from './app'
export type { BoardEvent, QueryKey } from './realtime'

const runtime = createApi()
export const app = runtime.app
export type App = typeof app

if (import.meta.main) {
  const port = Number(process.env.PORT ?? 3001)
  if (!Number.isInteger(port) || port < 0 || port > 65535)
    throw new Error('PORT must be an integer between 0 and 65535')
  app.listen({ port, hostname: process.env.HOST ?? '127.0.0.1' })
  console.log(`Tasklane API listening at ${app.server?.url}`)
  const shutdown = async () => {
    await app.stop(true)
    runtime.connection.close()
  }
  process.once('SIGINT', () => void shutdown())
  process.once('SIGTERM', () => void shutdown())
}
