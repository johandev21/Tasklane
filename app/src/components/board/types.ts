import type { Doc } from '../../../convex/_generated/dataModel'

export type BoardDoc = Doc<'boards'> & { isOwner: boolean }
export type ListDoc = Doc<'lists'>
export type CardDoc = Doc<'cards'>

export interface EnrichedActivityDoc extends Doc<'activity'> {
  actor?: {
    tokenIdentifier: string
    name: string
    email: string
    imageUrl?: string
  }
}
