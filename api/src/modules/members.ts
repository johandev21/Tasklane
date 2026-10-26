import { and, eq, inArray } from 'drizzle-orm'
import { Elysia, t } from 'elysia'
import { assertBoardAccess, assertOwner, profile } from '../access'
import {
  boardMembers,
  cardAssignees,
  cards,
  presence,
  user as users,
} from '../db/schema'
import { ApiError } from '../errors'
import { recordActivity } from '../services'
import type { Services } from '../services'

export function membersModule(s: Services) {
  return new Elysia()
    .use(s.sessions)
    .get(
      '/api/boards/:boardId/members',
      ({ user, params }) => {
        if (!user) return []
        const { board } = assertBoardAccess(s.db, params.boardId, user.id)
        const ids = new Set([
          board.ownerId,
          ...s.db
            .select()
            .from(boardMembers)
            .where(eq(boardMembers.boardId, board.id))
            .all()
            .map((member) => member.userId),
        ])
        return [...ids]
          .map((id) => profile(s.db, id, board.ownerId))
          .sort(
            (a, b) =>
              Number(b.isOwner) - Number(a.isOwner) ||
              a.name.localeCompare(b.name),
          )
      },
      { session: true },
    )
    .post(
      '/api/boards/:boardId/members',
      ({ user, params, body }) =>
        s.mutate(
          params.boardId,
          user.id,
          ['boards', 'members', 'activity'],
          (tx, access) => {
            assertOwner(access)
            const email = body.email.trim().toLowerCase()
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
              throw new ApiError(400, 'Please provide a valid email address')
            const target = tx
              .select()
              .from(users)
              .where(eq(users.email, email))
              .get()
            if (!target)
              throw new ApiError(
                404,
                `User with email "${email}" was not found. They must sign in to Tasklane first.`,
              )
            if (target.id === access.board.ownerId)
              throw new ApiError(409, 'User is already the owner of this board')
            if (
              tx
                .select()
                .from(boardMembers)
                .where(
                  and(
                    eq(boardMembers.boardId, params.boardId),
                    eq(boardMembers.userId, target.id),
                  ),
                )
                .get()
            ) {
              throw new ApiError(409, 'User is already a member of this board')
            }
            const member = tx
              .insert(boardMembers)
              .values({ boardId: params.boardId, userId: target.id })
              .returning()
              .get()!
            recordActivity(tx, params.boardId, user.id, 'member_added', {
              memberId: target.id,
              memberName: target.name,
              memberEmail: target.email,
              memberImageUrl: target.image,
            })
            return member.id
          },
        ),
      { auth: true, body: t.Object({ email: t.String() }) },
    )
    .delete(
      '/api/boards/:boardId/members/:userId',
      ({ user, params }) => {
        const result = s.mutate(
          params.boardId,
          user.id,
          ['boards', 'members', 'assignees', 'presence', 'activity'],
          (tx, access) => {
            assertOwner(access)
            if (params.userId === access.board.ownerId)
              throw new ApiError(
                400,
                'Cannot remove board owner from the board',
              )
            const member = tx
              .delete(boardMembers)
              .where(
                and(
                  eq(boardMembers.boardId, params.boardId),
                  eq(boardMembers.userId, params.userId),
                ),
              )
              .returning()
              .get()
            if (member) {
              const boardCards = tx
                .select({ id: cards.id })
                .from(cards)
                .where(eq(cards.boardId, params.boardId))
              tx.delete(cardAssignees)
                .where(
                  and(
                    eq(cardAssignees.userId, params.userId),
                    inArray(cardAssignees.cardId, boardCards),
                  ),
                )
                .run()
              tx.delete(presence)
                .where(
                  and(
                    eq(presence.boardId, params.boardId),
                    eq(presence.userId, params.userId),
                  ),
                )
                .run()
              const target = profile(tx, params.userId)
              recordActivity(tx, params.boardId, user.id, 'member_removed', {
                memberId: params.userId,
                memberName: target.name,
                memberEmail: target.email,
                memberImageUrl: target.imageUrl,
              })
            }
            return { success: true }
          },
        )
        s.rooms.presenceChanged(params.boardId)
        return result
      },
      { auth: true },
    )
}
