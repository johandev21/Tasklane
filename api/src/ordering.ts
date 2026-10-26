import { t } from 'elysia'
import { ApiError } from './errors'

export const orderingFields = {
  previousId: t.Optional(t.Nullable(t.String({ minLength: 1 }))),
  nextId: t.Optional(t.Nullable(t.String({ minLength: 1 }))),
  newPosition: t.Optional(t.Integer()),
}

export interface Move {
  previousId?: string | null
  nextId?: string | null
  newPosition?: number
}

// Resolve against the current sequence, preferring the surviving next anchor.
export function insertAtAnchor<T extends { id: string }>(
  items: T[],
  moved: T,
  move: Move,
) {
  if (
    move.previousId === moved.id ||
    move.nextId === moved.id ||
    (move.previousId && move.previousId === move.nextId)
  ) {
    throw new ApiError(
      400,
      'Move anchors must refer to distinct neighboring items',
    )
  }
  const ordered = items.filter((item) => item.id !== moved.id)
  const previous = ordered.findIndex((item) => item.id === move.previousId)
  const next = ordered.findIndex((item) => item.id === move.nextId)
  let position: number
  if (next >= 0) position = next
  else if (previous >= 0) position = previous + 1
  else if (move.previousId === null && move.nextId != null) position = 0
  else if (
    move.newPosition !== undefined &&
    move.previousId === undefined &&
    move.nextId === undefined
  ) {
    if (!Number.isInteger(move.newPosition))
      throw new ApiError(400, 'Position must be an integer')
    position = Math.max(0, Math.min(move.newPosition, ordered.length))
  } else position = ordered.length
  ordered.splice(position, 0, moved)
  return ordered
}
