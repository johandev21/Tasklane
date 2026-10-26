export const LABEL_COLORS = [
  'red',
  'orange',
  'yellow',
  'green',
  'teal',
  'blue',
  'purple',
  'pink',
] as const

export const ACTIVITY_TYPES = [
  'board_created',
  'list_created',
  'list_renamed',
  'list_deleted',
  'card_created',
  'card_moved',
  'card_archived',
  'card_restored',
  'description_changed',
  'label_added',
  'label_removed',
  'due_date_set',
  'due_date_changed',
  'due_date_cleared',
  'assignee_added',
  'assignee_removed',
  'comment_added',
  'member_added',
  'member_removed',
  'board_renamed',
] as const

export type ActivityType = (typeof ACTIVITY_TYPES)[number]
export const PRESENCE_ACTIVE_THRESHOLD_MS = 30_000
export const PRESENCE_SWEEP_INTERVAL_MS = 60_000
