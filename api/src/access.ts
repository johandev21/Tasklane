import { and, eq } from 'drizzle-orm'
import type { Executor } from './db'
import { boardMembers, boards, cards, lists, user } from './db/schema'
import { ApiError, required } from './errors'

export function hasBoardAccess(db: Executor, boardId: string, userId: string) {
  const board = db.select().from(boards).where(eq(boards.id, boardId)).get()
  return (
    !!board &&
    (board.ownerId === userId ||
      !!db
        .select({ id: boardMembers.id })
        .from(boardMembers)
        .where(
          and(
            eq(boardMembers.boardId, boardId),
            eq(boardMembers.userId, userId),
          ),
        )
        .get())
  )
}

export function assertBoardAccess(
  db: Executor,
  boardId: string,
  userId: string,
) {
  const board = required(
    db.select().from(boards).where(eq(boards.id, boardId)).get(),
    'Board',
  )
  const isOwner = board.ownerId === userId
  if (!isOwner && !hasBoardAccess(db, boardId, userId)) {
    throw new ApiError(403, 'User is not a member of this board')
  }
  return { board, isOwner, userId }
}

export type BoardAccess = ReturnType<typeof assertBoardAccess>

export function assertOwner(access: BoardAccess) {
  if (!access.isOwner)
    throw new ApiError(403, 'Only the board owner may perform this action')
}

export function getList(db: Executor, listId: string) {
  return required(
    db.select().from(lists).where(eq(lists.id, listId)).get(),
    'List',
  )
}

export function getCard(db: Executor, cardId: string) {
  return required(
    db.select().from(cards).where(eq(cards.id, cardId)).get(),
    'Card',
  )
}

export function profile(db: Executor, userId: string, ownerId?: string) {
  const record = db.select().from(user).where(eq(user.id, userId)).get()
  const isOwner = userId === ownerId
  return {
    userId,
    name: record?.name ?? (isOwner ? 'Board Owner' : 'Team Member'),
    email: record?.email ?? '',
    imageUrl: record?.image ?? null,
    isOwner,
  }
}
