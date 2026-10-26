import { and, desc, eq, inArray, or } from 'drizzle-orm'
import { Elysia, t } from 'elysia'
import { assertBoardAccess, assertOwner } from '../access'
import { activity, boardMembers, boards, cards, lists } from '../db/schema'
import { nonempty } from '../errors'
import { recordActivity } from '../services'
import type { Services } from '../services'

export function boardsModule(s: Services) {
  return new Elysia({ prefix: '/api/boards' })
    .use(s.sessions)
    .get(
      '/',
      ({ user }) => {
        if (!user) return []
        const memberships = s.db
          .select({ boardId: boardMembers.boardId })
          .from(boardMembers)
          .where(eq(boardMembers.userId, user.id))
        return s.db
          .select()
          .from(boards)
          .where(
            or(eq(boards.ownerId, user.id), inArray(boards.id, memberships)),
          )
          .orderBy(desc(boards.createdAt), desc(boards.id))
          .all()
          .map((board) => {
            const members = s.db
              .select()
              .from(boardMembers)
              .where(eq(boardMembers.boardId, board.id))
              .all()
            const boardLists = s.db
              .select()
              .from(lists)
              .where(eq(lists.boardId, board.id))
              .orderBy(lists.position)
              .all()
            const activeCards = s.db
              .select()
              .from(cards)
              .where(
                and(eq(cards.boardId, board.id), eq(cards.archived, false)),
              )
              .all()
            return {
              ...board,
              isOwner: board.ownerId === user.id,
              memberCount: members.length + 1,
              listsCount: boardLists.length,
              cardsCount: activeCards.length,
              lists: boardLists.map((list) => ({
                name: list.title,
                cardsCount: activeCards.filter(
                  (card) => card.listId === list.id,
                ).length,
              })),
            }
          })
      },
      { session: true },
    )
    .get(
      '/:boardId',
      ({ user, params }) => {
        if (!user) return null
        const board = s.db
          .select()
          .from(boards)
          .where(eq(boards.id, params.boardId))
          .get()
        if (!board) return null
        const { isOwner } = assertBoardAccess(s.db, board.id, user.id)
        return { ...board, isOwner }
      },
      { session: true },
    )
    .post(
      '/',
      ({ user, body }) => {
        const name = nonempty(body.name, 'Board name')
        const board = s.db.transaction(
          (tx) => {
            const board = tx
              .insert(boards)
              .values({ name, ownerId: user.id })
              .returning()
              .get()!
            tx.insert(activity)
              .values({
                boardId: board.id,
                actorId: user.id,
                type: 'board_created',
                payload: { boardName: name },
              })
              .run()
            return board
          },
          { behavior: 'immediate' },
        )
        s.rooms.changed(board.id, ['boards', 'activity'])
        return board.id
      },
      { auth: true, body: t.Object({ name: t.String() }) },
    )
    .patch(
      '/:boardId',
      ({ user, params, body }) =>
        s.mutate(
          params.boardId,
          user.id,
          ['boards', 'activity'],
          (tx, access) => {
            assertOwner(access)
            const name = nonempty(body.name, 'Board name')
            tx.update(boards)
              .set({ name })
              .where(eq(boards.id, params.boardId))
              .run()
            recordActivity(tx, params.boardId, user.id, 'board_renamed', {
              oldName: access.board.name,
              newName: name,
            })
            return { success: true }
          },
        ),
      { auth: true, body: t.Object({ name: t.String() }) },
    )
    .delete(
      '/:boardId',
      ({ user, params }) => {
        s.db.transaction(
          (tx) => {
            assertOwner(assertBoardAccess(tx, params.boardId, user.id))
            tx.delete(boards).where(eq(boards.id, params.boardId)).run()
          },
          { behavior: 'immediate' },
        )
        s.rooms.deleted(params.boardId)
        return { success: true }
      },
      { auth: true },
    )
}
