import { treaty } from '@elysiajs/eden'
import type { App } from '@tasklane/api'
import type {
  BoardSummary,
  Board,
  List,
  Card,
  Label,
  EnrichedCardLabel,
  Member,
  EnrichedCardAssignee,
  CardCommentCount,
  Page,
  EnrichedComment,
  EnrichedActivity,
  PresenceViewer,
} from './types'

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

function getClient() {
  const origin =
    typeof window === 'undefined'
      ? 'http://localhost:3000'
      : window.location.origin
  return treaty<App>(origin, { fetch: { credentials: 'include' } })
}

async function unwrap<T>(operation: Promise<unknown>): Promise<T> {
  const result = await operation
  if (!result || typeof result !== 'object' || !('data' in result)) {
    throw new ApiError(502, 'The server returned an unexpected response.')
  }
  const response = result as {
    data: unknown
    error: { status: number; value: unknown } | null
  }
  if (response.error) {
    const value = response.error.value
    const message =
      value && typeof value === 'object' && 'error' in value
        ? String(value.error)
        : 'Unable to complete your request. Please try again.'
    throw new ApiError(response.error.status, message)
  }
  return response.data as T
}

const withSignal = (signal?: AbortSignal) =>
  signal ? { fetch: { credentials: 'include' as const, signal } } : undefined
const board = (boardId: string) => getClient().api.boards({ boardId })
const card = (cardId: string) => getClient().api.cards({ cardId })
const list = (listId: string) => getClient().api.lists({ listId })

export const api = {
  boards: {
    list: (signal?: AbortSignal) =>
      unwrap<BoardSummary[]>(getClient().api.boards.get(withSignal(signal))),
    get: (boardId: string, signal?: AbortSignal) =>
      unwrap<Board | null>(board(boardId).get(withSignal(signal))),
    create: ({ name }: { name: string }) =>
      unwrap<string>(getClient().api.boards.post({ name })),
    rename: ({ boardId, name }: { boardId: string; name: string }) =>
      unwrap<{ success: true }>(board(boardId).patch({ name })),
    remove: ({ boardId }: { boardId: string }) =>
      unwrap<{ success: true }>(board(boardId).delete()),
  },
  lists: {
    list: (boardId: string, signal?: AbortSignal) =>
      unwrap<List[]>(board(boardId).lists.get(withSignal(signal))),
    create: ({ boardId, title }: { boardId: string; title: string }) =>
      unwrap<string>(board(boardId).lists.post({ title })),
    rename: ({ listId, title }: { listId: string; title: string }) =>
      unwrap<{ success: true }>(list(listId).patch({ title })),
    reorder: ({
      listId,
      newPosition,
    }: {
      listId: string
      newPosition: number
    }) => unwrap<{ success: true }>(list(listId).reorder.post({ newPosition })),
    remove: ({ listId }: { listId: string }) =>
      unwrap<{ success: true }>(list(listId).delete()),
    archiveAllCards: ({ listId }: { listId: string }) =>
      unwrap<{ success: true }>(list(listId)['archive-cards'].post()),
  },
  cards: {
    listByBoard: (boardId: string, signal?: AbortSignal) =>
      unwrap<Card[]>(board(boardId).cards.get(withSignal(signal))),
    listArchivedByBoard: (boardId: string, signal?: AbortSignal) =>
      unwrap<Card[]>(board(boardId).archive.get(withSignal(signal))),
    create: ({ listId, title }: { listId: string; title: string }) =>
      unwrap<string>(list(listId).cards.post({ title })),
    rename: ({ cardId, title }: { cardId: string; title: string }) =>
      unwrap<{ success: true }>(card(cardId).patch({ title })),
    reorder: ({
      cardId,
      targetListId,
      newPosition,
    }: {
      cardId: string
      targetListId: string
      newPosition: number
    }) =>
      unwrap<{ success: true }>(
        card(cardId).reorder.post({ targetListId, newPosition }),
      ),
    moveToList: ({
      cardId,
      targetListId,
    }: {
      cardId: string
      targetListId: string
    }) => unwrap<{ success: true }>(card(cardId).move.post({ targetListId })),
    updateDescription: ({
      cardId,
      description,
    }: {
      cardId: string
      description?: string
    }) =>
      unwrap<{ success: true }>(
        card(cardId).description.put({ description: description ?? null }),
      ),
    updateDueDate: ({
      cardId,
      dueDate,
    }: {
      cardId: string
      dueDate?: number
    }) =>
      unwrap<{ success: true }>(
        card(cardId)['due-date'].put({ dueDate: dueDate ?? null }),
      ),
    archive: ({ cardId }: { cardId: string }) =>
      unwrap<{ success: true }>(card(cardId).archive.post()),
    restore: ({ cardId }: { cardId: string }) =>
      unwrap<{ success: true }>(card(cardId).restore.post()),
  },
  labels: {
    listByBoard: (boardId: string, signal?: AbortSignal) =>
      unwrap<Label[]>(board(boardId).labels.get(withSignal(signal))),
    listCardLabelsForBoard: (boardId: string, signal?: AbortSignal) =>
      unwrap<EnrichedCardLabel[]>(
        board(boardId)['card-labels'].get(withSignal(signal)),
      ),
    create: ({
      boardId,
      name,
      color,
    }: {
      boardId: string
      name: string
      color: Label['color']
    }) => unwrap<string>(board(boardId).labels.post({ name, color })),
    update: ({
      labelId,
      name,
      color,
    }: {
      labelId: string
      name?: string
      color?: Label['color']
    }) =>
      unwrap<{ success: true }>(
        getClient().api.labels({ labelId }).patch({ name, color }),
      ),
    remove: ({ labelId }: { labelId: string }) =>
      unwrap<{ success: true }>(getClient().api.labels({ labelId }).delete()),
    toggleOnCard: ({ cardId, labelId }: { cardId: string; labelId: string }) =>
      unwrap<{ attached: boolean; id: string | null }>(
        card(cardId).labels({ labelId }).toggle.post(),
      ),
  },
  members: {
    listByBoard: (boardId: string, signal?: AbortSignal) =>
      unwrap<Member[]>(board(boardId).members.get(withSignal(signal))),
    inviteByEmail: ({ boardId, email }: { boardId: string; email: string }) =>
      unwrap<string>(board(boardId).members.post({ email })),
    remove: ({ boardId, userId }: { boardId: string; userId: string }) =>
      unwrap<{ success: true }>(board(boardId).members({ userId }).delete()),
  },
  assignees: {
    listCardAssigneesForBoard: (boardId: string, signal?: AbortSignal) =>
      unwrap<EnrichedCardAssignee[]>(
        board(boardId).assignees.get(withSignal(signal)),
      ),
    toggleOnCard: ({ cardId, userId }: { cardId: string; userId: string }) =>
      unwrap<{ assigned: boolean; id: string | null }>(
        card(cardId).assignees({ userId }).toggle.post(),
      ),
  },
  comments: {
    listCommentsCountForBoard: (boardId: string, signal?: AbortSignal) =>
      unwrap<CardCommentCount[]>(
        board(boardId)['comment-counts'].get(withSignal(signal)),
      ),
    listByCardPaginated: (
      cardId: string,
      cursor?: string,
      signal?: AbortSignal,
    ) =>
      unwrap<Page<EnrichedComment>>(
        card(cardId).comments.page.get({
          query: { limit: 15, ...(cursor ? { cursor } : {}) },
          ...withSignal(signal),
        }),
      ),
    add: ({ cardId, body }: { cardId: string; body: string }) =>
      unwrap<string>(card(cardId).comments.post({ body })),
    update: ({ commentId, body }: { commentId: string; body: string }) =>
      unwrap<{ success: true }>(
        getClient().api.comments({ commentId }).patch({ body }),
      ),
    remove: ({ commentId }: { commentId: string }) =>
      unwrap<{ success: true }>(
        getClient().api.comments({ commentId }).delete(),
      ),
  },
  activity: {
    listPaginated: (boardId: string, cursor?: string, signal?: AbortSignal) =>
      unwrap<Page<EnrichedActivity>>(
        board(boardId).activity.page.get({
          query: { limit: 25, ...(cursor ? { cursor } : {}) },
          ...withSignal(signal),
        }),
      ),
    listByCard: (cardId: string, signal?: AbortSignal) =>
      unwrap<EnrichedActivity[]>(card(cardId).activity.get(withSignal(signal))),
  },
  presence: {
    list: (boardId: string, signal?: AbortSignal) =>
      unwrap<PresenceViewer[]>(board(boardId).presence.get(withSignal(signal))),
    heartbeat: ({ boardId }: { boardId: string }) =>
      unwrap<{ success: true }>(board(boardId).presence.post()),
  },
}

export function subscribeToBoard(boardId: string) {
  return getClient().ws.boards({ boardId }).subscribe()
}
