import type {
  activity,
  boardMembers,
  boards,
  cardAssignees,
  cardLabels,
  cards,
  comments,
  labels,
  lists,
  user,
} from '@tasklane/api/schema'

export type Board = typeof boards.$inferSelect & { isOwner: boolean }
export type AuthUser = typeof user.$inferSelect
export type BoardSummary = Board & {
  memberCount: number
  listsCount: number
  cardsCount: number
  lists: Array<{ name: string; cardsCount: number }>
}
export type List = typeof lists.$inferSelect
export type Card = Omit<
  typeof cards.$inferSelect,
  'description' | 'dueDate'
> & {
  description?: string
  dueDate?: number
}
export type Label = typeof labels.$inferSelect
export type CardLabel = typeof cardLabels.$inferSelect
export type CardAssignee = typeof cardAssignees.$inferSelect
export type Comment = typeof comments.$inferSelect

export interface Member {
  userId: string
  name: string
  email: string
  imageUrl?: string
  isOwner: boolean
}

export type PresenceViewer = Omit<Member, 'isOwner'>
export type EnrichedCardLabel = CardLabel & { label: Label }
export type EnrichedCardAssignee = CardAssignee & { user: Member }
export type EnrichedComment = Comment & { author: Member }
export type EnrichedActivity = Omit<typeof activity.$inferSelect, 'type'> & {
  type: string
  actor?: Pick<Member, 'userId' | 'name' | 'email' | 'imageUrl'>
}
export interface CardCommentCount {
  cardId: string
  count: number
}

export interface Page<T> {
  page: T[]
  isDone: boolean
  continueCursor: string
}

export type BoardMember = typeof boardMembers.$inferSelect
