import { useMemo, useState } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { authClient } from '#/shared/api/auth.ts'
import { api } from '#/shared/api/client.ts'
import { queryKeys } from '#/shared/api/query-keys.ts'
import { useBoardPresence } from '#/features/board/hooks/use-board-presence.ts'
import { useBoardSocket } from '#/features/board/hooks/use-board-socket.ts'
import {
  groupCardAssigneesByCard,
  groupCardCommentCountsByCard,
  groupCardLabelsByCard,
} from '#/features/board/utils/board-transforms.ts'
import type {
  AuthUser,
  BoardDoc,
  BoardMemberUser,
  CardDoc,
  EnrichedActivityDoc,
  EnrichedComment,
  LabelDoc,
  ListDoc,
  PresenceViewer,
} from '#/features/board/types/board.types.ts'
import { useBoardActions } from './use-board-actions.ts'
import type { BoardActions } from './use-board-actions.ts'
import { useListActions } from './use-list-actions.ts'
import type { ListActions } from './use-list-actions.ts'
import { useCardActions } from './use-card-actions.ts'
import type { CardActions } from './use-card-actions.ts'
import { useLabelActions } from './use-label-actions.ts'
import type { LabelActions } from './use-label-actions.ts'
import { useCommentActions } from './use-comment-actions.ts'
import type { CommentActions } from './use-comment-actions.ts'
import { useMemberActions } from './use-member-actions.ts'
import type { MemberActions } from './use-member-actions.ts'

export type BoardPageState =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'unauthenticated' }
  | { status: 'not-found' }
  | {
      status: 'ready'
      boardId: string
      board: BoardDoc
      lists: ListDoc[]
      cards: CardDoc[]
      archivedCards: CardDoc[]
      boardLabels: LabelDoc[]
      cardLabelsMap: Record<string, LabelDoc[] | undefined>
      boardMembers: BoardMemberUser[]
      cardAssigneesMap: Record<string, BoardMemberUser[] | undefined>
      cardCommentsCountMap: Record<string, number | undefined>
      currentUser: AuthUser | null
      currentUserProfile: BoardMemberUser | null
      presenceViewers: PresenceViewer[]
      activeCardId: string | null
      activeCard: CardDoc | null
      activeCardLabels: LabelDoc[]
      activeCardAssignees: BoardMemberUser[]
      activeCardComments: EnrichedComment[]
      activeCardActivities: EnrichedActivityDoc[]
      commentsStatus:
        | 'CanLoadMore'
        | 'Error'
        | 'LoadingFirstPage'
        | 'LoadingMore'
        | 'Exhausted'
      isCommentsLoading: boolean
      loadMoreComments: (numItems: number) => void
      retryComments: () => void
      isActivityMenuOpen: boolean
      listBeingDeleted: ListDoc | null
      deletedListCardCount: number
      setActiveCardId: (id: string | null) => void
      setIsActivityMenuOpen: (open: boolean) => void
      setListBeingDeleted: (list: ListDoc | null) => void
      boardActions: BoardActions
      listActions: ListActions
      cardActions: CardActions
      labelActions: LabelActions
      commentActions: CommentActions
      memberActions: MemberActions
    }

export function useBoardPage(boardId: string): BoardPageState {
  const session = authClient.useSession()
  const isAuthenticated = Boolean(session.data)
  const enabled = !session.isPending && isAuthenticated
  const [isActivityMenuOpen, setIsActivityMenuOpen] = useState(false)
  const [listBeingDeleted, setListBeingDeleted] = useState<ListDoc | null>(null)
  const [activeCardId, setActiveCardId] = useState<string | null>(null)

  const board = useQuery({
    queryKey: queryKeys.resource(boardId, 'board'),
    queryFn: ({ signal }) => api.boards.get(boardId, signal),
    enabled,
  })
  const lists = useQuery({
    queryKey: queryKeys.resource(boardId, 'lists'),
    queryFn: ({ signal }) => api.lists.list(boardId, signal),
    enabled,
  })
  const cards = useQuery({
    queryKey: queryKeys.resource(boardId, 'cards'),
    queryFn: ({ signal }) => api.cards.listByBoard(boardId, signal),
    enabled,
  })
  const archivedCards = useQuery({
    queryKey: queryKeys.resource(boardId, 'archivedCards'),
    queryFn: ({ signal }) => api.cards.listArchivedByBoard(boardId, signal),
    enabled,
  })
  const boardLabels = useQuery({
    queryKey: queryKeys.resource(boardId, 'labels'),
    queryFn: ({ signal }) => api.labels.listByBoard(boardId, signal),
    enabled,
  })
  const cardLabels = useQuery({
    queryKey: queryKeys.resource(boardId, 'cardLabels'),
    queryFn: ({ signal }) => api.labels.listCardLabelsForBoard(boardId, signal),
    enabled,
  })
  const boardMembers = useQuery({
    queryKey: queryKeys.resource(boardId, 'members'),
    queryFn: ({ signal }) => api.members.listByBoard(boardId, signal),
    enabled,
  })
  const cardAssignees = useQuery({
    queryKey: queryKeys.resource(boardId, 'assignees'),
    queryFn: ({ signal }) =>
      api.assignees.listCardAssigneesForBoard(boardId, signal),
    enabled,
  })
  const commentCounts = useQuery({
    queryKey: queryKeys.resource(boardId, 'commentCounts'),
    queryFn: ({ signal }) =>
      api.comments.listCommentsCountForBoard(boardId, signal),
    enabled,
  })
  const activeCardCommentsQuery = useInfiniteQuery({
    queryKey: [...queryKeys.resource(boardId, 'comments'), activeCardId],
    queryFn: ({ pageParam, signal }) =>
      api.comments.listByCardPaginated(activeCardId!, pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.isDone ? undefined : lastPage.continueCursor,
    enabled: enabled && Boolean(activeCardId),
  })
  const activeCardActivitiesQuery = useQuery({
    queryKey: [...queryKeys.resource(boardId, 'cardActivity'), activeCardId],
    queryFn: ({ signal }) => api.activity.listByCard(activeCardId!, signal),
    enabled: enabled && Boolean(activeCardId),
  })

  const hasBoard = board.data !== undefined && board.data !== null
  const presenceViewers = useBoardPresence(boardId, enabled && hasBoard)
  useBoardSocket(boardId, enabled && hasBoard)

  const cardLabelsMap = useMemo(
    () => groupCardLabelsByCard(cardLabels.data),
    [cardLabels.data],
  )
  const cardAssigneesMap = useMemo(
    () => groupCardAssigneesByCard(cardAssignees.data),
    [cardAssignees.data],
  )
  const cardCommentsCountMap = useMemo(
    () => groupCardCommentCountsByCard(commentCounts.data),
    [commentCounts.data],
  )
  const boardActions = useBoardActions(boardId)
  const listActions = useListActions(boardId)
  const cardActions = useCardActions(boardId, lists.data?.length ?? 0)
  const labelActions = useLabelActions(boardId)
  const commentActions = useCommentActions(boardId)
  const memberActions = useMemberActions(boardId)

  const boardQueries = [
    board,
    lists,
    cards,
    archivedCards,
    boardLabels,
    cardLabels,
    boardMembers,
    cardAssignees,
    commentCounts,
  ]
  const failedQuery = boardQueries.find((query) => query.isError)

  if (session.error) return { status: 'error', error: session.error }
  if (session.isPending) return { status: 'loading' }
  if (!session.data) return { status: 'unauthenticated' }
  if (failedQuery) return { status: 'error', error: failedQuery.error }
  if (boardQueries.some((query) => query.isPending))
    return { status: 'loading' }
  if (board.data === undefined) return { status: 'loading' }
  if (board.data === null) return { status: 'not-found' }

  const currentBoard = board.data
  const currentLists = lists.data ?? []
  const currentCards = cards.data ?? []
  const currentUser = session.data.user as AuthUser
  const activeCard =
    currentCards.find((card) => card.id === activeCardId) ?? null
  const activeCardComments =
    activeCardCommentsQuery.data?.pages.flatMap((page) => page.page) ?? []
  const commentsStatus =
    activeCardCommentsQuery.isError || activeCardActivitiesQuery.isError
      ? 'Error'
      : !activeCardId
        ? 'Exhausted'
        : activeCardCommentsQuery.isPending
          ? 'LoadingFirstPage'
          : activeCardCommentsQuery.isFetchingNextPage
            ? 'LoadingMore'
            : activeCardCommentsQuery.hasNextPage
              ? 'CanLoadMore'
              : 'Exhausted'

  const currentUserProfile: BoardMemberUser = {
    userId: currentUser.id,
    name: currentUser.name || 'You',
    email: currentUser.email,
    imageUrl: currentUser.image ?? undefined,
    isOwner: currentUser.id === currentBoard.ownerId,
  }

  return {
    status: 'ready',
    boardId,
    board: currentBoard,
    lists: currentLists,
    cards: currentCards,
    archivedCards: archivedCards.data ?? [],
    boardLabels: boardLabels.data ?? [],
    cardLabelsMap,
    boardMembers: boardMembers.data ?? [],
    cardAssigneesMap,
    cardCommentsCountMap,
    currentUser,
    currentUserProfile,
    presenceViewers,
    activeCardId,
    activeCard,
    activeCardLabels: activeCardId ? (cardLabelsMap[activeCardId] ?? []) : [],
    activeCardAssignees: activeCardId
      ? (cardAssigneesMap[activeCardId] ?? [])
      : [],
    activeCardComments,
    activeCardActivities: activeCardActivitiesQuery.data ?? [],
    commentsStatus,
    isCommentsLoading:
      Boolean(activeCardId) &&
      (activeCardCommentsQuery.isPending ||
        activeCardCommentsQuery.isFetchingNextPage ||
        activeCardActivitiesQuery.isPending),
    loadMoreComments: () => {
      if (activeCardCommentsQuery.hasNextPage) {
        void activeCardCommentsQuery.fetchNextPage()
      }
    },
    retryComments: () => {
      void activeCardCommentsQuery.refetch()
      void activeCardActivitiesQuery.refetch()
    },
    isActivityMenuOpen,
    listBeingDeleted,
    deletedListCardCount: listBeingDeleted
      ? currentCards.filter((card) => card.listId === listBeingDeleted.id)
          .length
      : 0,
    setActiveCardId,
    setIsActivityMenuOpen,
    setListBeingDeleted,
    boardActions,
    listActions,
    cardActions,
    labelActions,
    commentActions,
    memberActions,
  }
}
