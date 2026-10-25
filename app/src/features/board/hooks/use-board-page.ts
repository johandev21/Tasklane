import { useState, useMemo } from 'react'
import { useConvexAuth, usePaginatedQuery, useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import type { Doc, Id } from '../../../../convex/_generated/dataModel'
import { useBoardPresence } from '#/features/board/hooks/use-board-presence.ts'
import {
  groupCardAssigneesByCard,
  groupCardCommentCountsByCard,
  groupCardLabelsByCard,
} from '#/features/board/utils/board-transforms.ts'
import type {
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
  | { status: 'unauthenticated' }
  | { status: 'not-found' }
  | {
      status: 'ready'
      boardId: Id<'boards'>
      board: BoardDoc
      lists: ListDoc[]
      cards: CardDoc[]
      archivedCards: CardDoc[]
      boardLabels: LabelDoc[]
      cardLabelsMap: Record<string, LabelDoc[] | undefined>
      boardMembers: BoardMemberUser[]
      cardAssigneesMap: Record<string, BoardMemberUser[] | undefined>
      cardCommentsCountMap: Record<string, number | undefined>
      currentUser: Doc<'users'> | null | undefined
      currentUserProfile: BoardMemberUser | null
      presenceViewers: PresenceViewer[]
      activeCardId: Id<'cards'> | null
      activeCard: CardDoc | null
      activeCardLabels: LabelDoc[]
      activeCardAssignees: BoardMemberUser[]
      activeCardComments: EnrichedComment[]
      activeCardActivities: EnrichedActivityDoc[]
      commentsStatus:
        'CanLoadMore' | 'LoadingFirstPage' | 'LoadingMore' | 'Exhausted'
      isCommentsLoading: boolean
      loadMoreComments: (numItems: number) => void
      isActivityMenuOpen: boolean
      listBeingDeleted: ListDoc | null
      deletedListCardCount: number
      setActiveCardId: (id: Id<'cards'> | null) => void
      setIsActivityMenuOpen: (open: boolean) => void
      setListBeingDeleted: (list: ListDoc | null) => void
      boardActions: BoardActions
      listActions: ListActions
      cardActions: CardActions
      labelActions: LabelActions
      commentActions: CommentActions
      memberActions: MemberActions
    }

export function useBoardPage(boardIdParam: string): BoardPageState {
  const typedBoardId = boardIdParam as Id<'boards'>
  const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth()

  // Live subscriptions to board, lists, cards, archived cards, labels, members, assignees, and comments
  const queryArgs = isAuthenticated ? { boardId: typedBoardId } : 'skip'

  const board = useQuery(api.boards.get, queryArgs)
  const lists = useQuery(api.lists.list, queryArgs)
  const cards = useQuery(api.cards.listByBoard, queryArgs)
  const archivedCards = useQuery(api.cards.listArchivedByBoard, queryArgs)
  const boardLabels = useQuery(api.labels.listByBoard, queryArgs)
  const cardLabelsList = useQuery(api.labels.listCardLabelsForBoard, queryArgs)
  const boardMembers = useQuery(api.members.listByBoard, queryArgs)
  const cardAssigneesList = useQuery(
    api.assignees.listCardAssigneesForBoard,
    queryArgs,
  )
  const cardCommentsCountList = useQuery(
    api.comments.listCommentsCountForBoard,
    queryArgs,
  )
  const currentUser = useQuery(
    api.users.currentUser,
    isAuthenticated ? {} : 'skip',
  )
  const presenceViewers = useBoardPresence(
    isAuthenticated && board ? typedBoardId : null,
  )

  // Local UI State
  const [isActivityMenuOpen, setIsActivityMenuOpen] = useState(false)
  const [listBeingDeleted, setListBeingDeleted] = useState<ListDoc | null>(null)
  const [activeCardId, setActiveCardId] = useState<Id<'cards'> | null>(null)

  // Subscribed paginated comments for active modal card
  const {
    results: activeCardComments,
    status: commentsStatus,
    loadMore: loadMoreComments,
    isLoading: isCommentsLoading,
  } = usePaginatedQuery(
    api.comments.listByCardPaginated,
    isAuthenticated && activeCardId ? { cardId: activeCardId } : 'skip',
    { initialNumItems: 15 },
  )

  // Subscribed activities for active modal card
  const activeCardActivities = useQuery(
    api.activity.listByCard,
    isAuthenticated && activeCardId ? { cardId: activeCardId } : 'skip',
  )

  // Action domain hooks
  const boardActions = useBoardActions(typedBoardId)
  const listActions = useListActions(typedBoardId)
  const cardActions = useCardActions(typedBoardId, lists?.length ?? 0)
  const labelActions = useLabelActions(typedBoardId)
  const commentActions = useCommentActions()
  const memberActions = useMemberActions(typedBoardId)

  // Derived view-model mappings
  const cardLabelsMap = useMemo(
    () => groupCardLabelsByCard(cardLabelsList),
    [cardLabelsList],
  )
  const cardAssigneesMap = useMemo(
    () => groupCardAssigneesByCard(cardAssigneesList),
    [cardAssigneesList],
  )
  const cardCommentsCountMap = useMemo(
    () => groupCardCommentCountsByCard(cardCommentsCountList),
    [cardCommentsCountList],
  )

  if (isAuthLoading) {
    return { status: 'loading' }
  }

  if (!isAuthenticated) {
    return { status: 'unauthenticated' }
  }

  if (board === undefined || lists === undefined || cards === undefined) {
    return { status: 'loading' }
  }

  if (board === null) {
    return { status: 'not-found' }
  }

  const deletedListCardCount = listBeingDeleted
    ? cards.filter((c) => c.listId === listBeingDeleted._id).length
    : 0

  const activeCard = cards.find((c) => c._id === activeCardId) ?? null
  const activeCardLabels = activeCardId
    ? (cardLabelsMap[activeCardId] ?? [])
    : []
  const activeCardAssignees = activeCardId
    ? (cardAssigneesMap[activeCardId] ?? [])
    : []

  const currentUserProfile: BoardMemberUser | null = currentUser
    ? {
        userId: currentUser.tokenIdentifier,
        name: currentUser.name ?? 'You',
        email: currentUser.email,
        imageUrl: currentUser.imageUrl,
        isOwner: currentUser.tokenIdentifier === board.ownerId,
      }
    : null

  return {
    status: 'ready',
    boardId: typedBoardId,
    board,
    lists,
    cards,
    archivedCards: archivedCards ?? [],
    boardLabels: boardLabels ?? [],
    cardLabelsMap,
    boardMembers: boardMembers ?? [],
    cardAssigneesMap,
    cardCommentsCountMap,
    currentUser,
    currentUserProfile,
    presenceViewers: presenceViewers ?? [],
    activeCardId,
    activeCard,
    activeCardLabels,
    activeCardAssignees,
    activeCardComments,
    activeCardActivities: activeCardActivities ?? [],
    commentsStatus,
    isCommentsLoading,
    loadMoreComments,
    isActivityMenuOpen,
    listBeingDeleted,
    deletedListCardCount,
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
