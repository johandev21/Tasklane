import type { Doc } from '../../../convex/_generated/dataModel'

export type BoardDoc = Doc<'boards'> & { isOwner: boolean }
export type ListDoc = Doc<'lists'>
export type CardDoc = Doc<'cards'>
export type LabelDoc = Doc<'labels'>
export type CardLabelDoc = Doc<'cardLabels'>

export interface EnrichedCardLabel {
  _id: CardLabelDoc['_id']
  cardId: CardDoc['_id']
  labelId: LabelDoc['_id']
  label: LabelDoc
}

export interface EnrichedActivityDoc extends Doc<'activity'> {
  actor?: {
    tokenIdentifier: string
    name: string
    email: string
    imageUrl?: string
  }
}
