import type { Doc } from '../../../convex/_generated/dataModel'

export type BoardDoc = Doc<'boards'> & { isOwner: boolean }
export type ListDoc = Doc<'lists'>
export type CardDoc = Doc<'cards'>
export type LabelDoc = Doc<'labels'>
export type CardLabelDoc = Doc<'cardLabels'>
export type CardAssigneeDoc = Doc<'cardAssignees'>

export interface BoardMemberUser {
  userId: string
  name: string
  email: string
  imageUrl?: string
  isOwner: boolean
}

export interface PresenceViewer {
  userId: string
  name: string
  email: string
  imageUrl?: string
}

export interface EnrichedCardAssignee {
  _id: CardAssigneeDoc['_id']
  cardId: CardDoc['_id']
  userId: string
  user: BoardMemberUser
}

export interface EnrichedCardLabel {
  _id: CardLabelDoc['_id']
  cardId: CardDoc['_id']
  labelId: LabelDoc['_id']
  label: LabelDoc
}

export type CommentDoc = Doc<'comments'>

export interface EnrichedComment {
  _id: CommentDoc['_id']
  _creationTime: number
  cardId: CardDoc['_id']
  authorId: string
  body: string
  author: BoardMemberUser
}

export interface CardCommentCount {
  cardId: CardDoc['_id']
  count: number
}

export interface EnrichedActivityDoc extends Doc<'activity'> {
  actor?: {
    tokenIdentifier: string
    name: string
    email: string
    imageUrl?: string
  }
}
