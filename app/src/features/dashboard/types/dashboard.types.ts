import type { Doc } from '../../../../convex/_generated/dataModel'

export type BoardSummary = Doc<'boards'> & {
  listsCount: number
  cardsCount: number
  memberCount: number
  isOwner: boolean
}

export type BoardFilterMode = 'all' | 'owned' | 'shared'
