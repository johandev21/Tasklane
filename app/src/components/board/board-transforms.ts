import type { Id } from '../../../convex/_generated/dataModel'
import type {
  BoardMemberUser,
  CardDoc,
  EnrichedActivityDoc,
  EnrichedComment,
  LabelDoc,
  ListDoc,
} from './types.ts'

/**
 * Reorders lists and returns an updated, re-indexed list array.
 */
export function reorderLists(
  currentLists: ListDoc[],
  listId: Id<'lists'>,
  newPosition: number,
): ListDoc[] {
  const currentIndex = currentLists.findIndex((l) => l._id === listId)
  if (currentIndex === -1) return currentLists

  const updated = [...currentLists].sort((a, b) => a.position - b.position)
  const [moved] = updated.splice(currentIndex, 1)
  const targetIndex = Math.max(0, Math.min(newPosition, updated.length))
  updated.splice(targetIndex, 0, moved)

  return updated.map((item, idx) => ({
    ...item,
    position: idx,
  }))
}

/**
 * Reorders a card within its current list and returns the complete sorted card array.
 */
export function reorderCardsWithinList(
  currentCards: CardDoc[],
  cardId: Id<'cards'>,
  listId: Id<'lists'>,
  newPosition: number,
): CardDoc[] {
  const listCards = currentCards
    .filter((c) => c.listId === listId && !c.archived)
    .sort((a, b) => a.position - b.position)

  const currentIndex = listCards.findIndex((c) => c._id === cardId)
  if (currentIndex === -1) return currentCards

  const [moved] = listCards.splice(currentIndex, 1)
  const targetIndex = Math.max(0, Math.min(newPosition, listCards.length))
  listCards.splice(targetIndex, 0, moved)

  const updatedListCards = listCards.map((c, idx) => ({
    ...c,
    position: idx,
  }))

  const otherCards = currentCards.filter(
    (c) => c.listId !== listId || c.archived,
  )

  return [...otherCards, ...updatedListCards].sort(
    (a, b) => a.position - b.position,
  )
}

/**
 * Moves a card from one list to another at a specified position and returns the full card array.
 */
export function moveCardBetweenLists(
  currentCards: CardDoc[],
  cardId: Id<'cards'>,
  targetListId: Id<'lists'>,
  newPosition: number,
): CardDoc[] {
  const card = currentCards.find((c) => c._id === cardId)
  if (!card) return currentCards

  const sourceListId = card.listId

  const sourceCards = currentCards
    .filter((c) => c.listId === sourceListId && c._id !== cardId && !c.archived)
    .sort((a, b) => a.position - b.position)
    .map((c, idx) => ({ ...c, position: idx }))

  const targetCards = currentCards
    .filter((c) => c.listId === targetListId && c._id !== cardId && !c.archived)
    .sort((a, b) => a.position - b.position)

  const targetIndex = Math.max(0, Math.min(newPosition, targetCards.length))
  targetCards.splice(targetIndex, 0, {
    ...card,
    listId: targetListId,
  })

  const updatedTargetCards = targetCards.map((c, idx) => ({
    ...c,
    listId: targetListId,
    position: idx,
  }))

  const otherCards = currentCards.filter(
    (c) =>
      (c.listId !== sourceListId && c.listId !== targetListId) || c.archived,
  )

  return [...otherCards, ...sourceCards, ...updatedTargetCards].sort(
    (a, b) => a.position - b.position,
  )
}

/**
 * Moves a card to the end of a target list (e.g. from modal/dialog selector).
 */
export function moveCardToListEnd(
  currentCards: CardDoc[],
  cardId: Id<'cards'>,
  targetListId: Id<'lists'>,
): CardDoc[] {
  const card = currentCards.find((c) => c._id === cardId)
  if (!card || card.listId === targetListId) return currentCards

  const sourceListId = card.listId
  const sourceCards = currentCards
    .filter((c) => c.listId === sourceListId && c._id !== cardId && !c.archived)
    .sort((a, b) => a.position - b.position)
    .map((c, idx) => ({ ...c, position: idx }))

  const targetCards = currentCards
    .filter((c) => c.listId === targetListId && c._id !== cardId && !c.archived)
    .sort((a, b) => a.position - b.position)

  const updatedTargetCards = [
    ...targetCards,
    { ...card, listId: targetListId, position: targetCards.length },
  ]

  const otherCards = currentCards.filter(
    (c) =>
      (c.listId !== sourceListId && c.listId !== targetListId) || c.archived,
  )

  return [...otherCards, ...sourceCards, ...updatedTargetCards].sort(
    (a, b) => a.position - b.position,
  )
}

/**
 * Removes an archived card from the active board cards list.
 */
export function removeArchivedCard(
  currentCards: CardDoc[],
  cardId: Id<'cards'>,
): CardDoc[] {
  return currentCards.filter((c) => c._id !== cardId)
}

/**
 * Groups card labels by cardId.
 */
export function groupCardLabelsByCard(
  cardLabelsList?: Array<{ cardId: string; label: LabelDoc }>,
): Record<string, LabelDoc[] | undefined> {
  const map: Record<string, LabelDoc[] | undefined> = {}
  for (const item of cardLabelsList ?? []) {
    const existing = map[item.cardId]
    if (existing) {
      existing.push(item.label)
    } else {
      map[item.cardId] = [item.label]
    }
  }
  return map
}

/**
 * Groups card assignees by cardId.
 */
export function groupCardAssigneesByCard(
  cardAssigneesList?: Array<{ cardId: string; user: BoardMemberUser }>,
): Record<string, BoardMemberUser[] | undefined> {
  const map: Record<string, BoardMemberUser[] | undefined> = {}
  for (const item of cardAssigneesList ?? []) {
    const existing = map[item.cardId]
    if (existing) {
      existing.push(item.user)
    } else {
      map[item.cardId] = [item.user]
    }
  }
  return map
}

/**
 * Groups comment counts by cardId.
 */
export function groupCardCommentCountsByCard(
  cardCommentsCountList?: Array<{ cardId: string; count: number }>,
): Record<string, number | undefined> {
  const map: Record<string, number | undefined> = {}
  for (const item of cardCommentsCountList ?? []) {
    map[item.cardId] = item.count
  }
  return map
}

export type FeedItem =
  | { kind: 'comment'; data: EnrichedComment; timestamp: number }
  | { kind: 'activity'; data: EnrichedActivityDoc; timestamp: number }

/**
 * Filters card activities and merges with comments into a unified, reverse-chronological feed.
 */
export function getCardFeedItems(
  comments: EnrichedComment[],
  activities: EnrichedActivityDoc[],
  cardId: Id<'cards'> | string,
  cardTitle: string,
  showDetails: boolean,
): FeedItem[] {
  const cardActivities = activities.filter((act) => {
    const payloadCardId = act.payload.cardId
    const payloadTitle = act.payload.title
    return (
      payloadCardId === cardId || (!payloadCardId && payloadTitle === cardTitle)
    )
  })

  const items: FeedItem[] = [
    ...comments.map((c): FeedItem => ({
      kind: 'comment',
      data: c,
      timestamp: c._creationTime,
    })),
    ...(showDetails
      ? cardActivities.map((a): FeedItem => ({
          kind: 'activity',
          data: a,
          timestamp: a._creationTime,
        }))
      : []),
  ]

  return items.sort((a, b) => b.timestamp - a.timestamp)
}

/**
 * Formats relative timestamp in human-readable notation.
 */
export function formatRelativeTime(
  timestamp: number,
  fallback = 'just now',
): string {
  try {
    const diffMs = Date.now() - timestamp
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return fallback
    if (diffMins === 1) return '1 minute ago'
    if (diffMins < 60) return `${diffMins} minutes ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours === 1) return '1 hour ago'
    if (diffHours < 24) return `${diffHours} hours ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays === 1) return 'yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return fallback
  }
}

/**
 * Formats a board activity event into readable text.
 */
export function formatActivityMessage(act: EnrichedActivityDoc): string {
  const payload = act.payload
  switch (act.type) {
    case 'board_created':
      return `created board "${payload.boardName ?? 'this board'}"`
    case 'board_renamed':
      return `renamed board "${payload.oldName ?? ''}" to "${payload.newName ?? ''}"`
    case 'list_created':
      return `added list "${payload.title ?? 'New List'}"`
    case 'list_renamed':
      return `renamed list "${payload.oldTitle ?? ''}" to "${payload.newTitle ?? ''}"`
    case 'list_deleted':
      return `deleted list "${payload.title ?? ''}" and archived ${payload.archivedCardsCount ?? 0} cards`
    case 'card_created':
      return `added card "${payload.title ?? 'New Card'}" to ${payload.listTitle ?? 'list'}`
    case 'card_archived':
      return `archived card "${payload.title ?? ''}"`
    case 'card_restored':
      return `restored card "${payload.title ?? ''}"`
    case 'description_changed':
      return `updated description for "${payload.title ?? 'card'}"`
    case 'due_date_set':
      return `set due date on "${payload.title ?? 'card'}"`
    case 'due_date_changed':
      return `changed due date on "${payload.title ?? 'card'}"`
    case 'due_date_cleared':
      return `removed due date from "${payload.title ?? 'card'}"`
    case 'label_added':
      return `added label "${payload.labelName ?? 'Label'}" to "${payload.title ?? 'card'}"`
    case 'label_removed':
      return `removed label "${payload.labelName ?? 'Label'}" from "${payload.title ?? 'card'}"`
    case 'assignee_added':
      return `assigned ${payload.memberName ?? 'a member'} to "${payload.title ?? 'card'}"`
    case 'assignee_removed':
      return `unassigned ${payload.memberName ?? 'a member'} from "${payload.title ?? 'card'}"`
    case 'member_added':
      return `added ${payload.memberName ?? payload.memberEmail ?? 'a member'} to the board`
    case 'member_removed':
      return `removed ${payload.memberName ?? payload.memberEmail ?? 'a member'} from the board`
    case 'comment_added':
      return `commented on "${payload.title ?? 'card'}": "${payload.snippet ?? payload.commentBody ?? ''}"`
    case 'card_moved':
      return `moved card "${payload.title ?? 'Card'}"${
        payload.sourceListTitle && payload.targetListTitle
          ? ` from ${payload.sourceListTitle} to ${payload.targetListTitle}`
          : ''
      }`
    default:
      return act.type.replace(/_/g, ' ')
  }
}

/**
 * Formats a card activity event into readable text.
 */
export function formatCardActivityMessage(act: EnrichedActivityDoc): string {
  const p = act.payload
  switch (act.type) {
    case 'card_created':
      return 'created this card'
    case 'card_renamed':
      return `renamed this card from "${p.oldTitle ?? ''}" to "${p.newTitle ?? ''}"`
    case 'card_moved':
      return `moved this card${p.fromList ? ` from ${p.fromList}` : ''}${p.toList ? ` to ${p.toList}` : ''}`
    case 'card_archived':
      return 'archived this card'
    case 'card_restored':
      return 'restored this card'
    case 'card_label_added':
      return `added label "${p.labelName ?? 'a label'}"`
    case 'card_label_removed':
      return `removed label "${p.labelName ?? 'a label'}"`
    case 'card_assignee_added':
      return 'assigned a member to this card'
    case 'card_assignee_removed':
      return 'unassigned a member from this card'
    case 'card_due_date_updated':
      return p.dueDate
        ? `set due date to ${new Date(p.dueDate).toLocaleDateString()}`
        : 'removed due date'
    case 'card_description_updated':
      return 'updated card description'
    default:
      return 'updated this card'
  }
}

/**
 * Extracts initials from user or member name.
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0 || !parts[0]) return '?'
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
