export interface Member {
  id: string
  name: string
  email: string
  avatarUrl: string
  initials: string
  color: string
  isOnline?: boolean
}

export type LabelColorId =
  'red' | 'orange' | 'amber' | 'emerald' | 'sky' | 'indigo' | 'rose' | 'slate'

export interface Label {
  id: string
  name: string
  color: LabelColorId
}

export interface CardComment {
  id: string
  memberId: string
  text: string
  createdAt: string
  updatedAt?: string
}

export interface CardItem {
  id: string
  listId: string
  title: string
  description?: string
  labels: Label[]
  assigneeIds: string[]
  dueDate?: string // ISO string
  isOverdue?: boolean
  comments: CardComment[]
  isArchived?: boolean
  createdAt: string
  updatedAt: string
}

export interface ListItem {
  id: string
  boardId: string
  title: string
  order: number
  cardIds: string[]
}

export type ActivityVerb =
  | 'list_created'
  | 'list_renamed'
  | 'list_deleted'
  | 'card_created'
  | 'card_moved'
  | 'card_archived'
  | 'card_restored'
  | 'description_changed'
  | 'label_added'
  | 'label_removed'
  | 'due_date_changed'
  | 'assignee_added'
  | 'assignee_removed'
  | 'comment_added'
  | 'member_added'
  | 'member_removed'
  | 'board_renamed'

export interface ActivityItem {
  id: string
  actorId: string
  type: ActivityVerb
  targetTitle: string
  details?: string
  createdAt: string
}

export interface BoardData {
  id: string
  title: string
  ownerId: string
  members: Member[]
  labels: Label[] // Palette of max 8 labels
  lists: ListItem[]
  cards: Record<string, CardItem | undefined>
  archivedCardIds: string[]
  activity: ActivityItem[]
}
