import type { Id } from '../../../convex/_generated/dataModel'

export interface BoardListSummary {
  name: string
  cardsCount: number
}

export interface BoardSummary {
  _id: Id<'boards'>
  _creationTime: number
  name: string
  ownerId: string
  isOwner: boolean
  memberCount: number
  listsCount: number
  cardsCount?: number
  lists?: BoardListSummary[]
}
