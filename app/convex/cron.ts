import { cronJobs } from 'convex/server'
import { api } from './_generated/api'
import { PRESENCE_SWEEP_INTERVAL_SECONDS } from './constants'

const crons = cronJobs()

crons.interval(
  'evict stale presence heartbeats',
  { seconds: PRESENCE_SWEEP_INTERVAL_SECONDS },
  api.presence.sweepStale,
)

export default crons
