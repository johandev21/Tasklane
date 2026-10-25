import { Link, createFileRoute } from '@tanstack/react-router'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '#/shared/components/ui/empty.tsx'
import { Button } from '#/shared/components/ui/button.tsx'
import { AppError } from '#/shared/components/ui/app-error.tsx'
import {
  BoardSkeleton,
  BoardHeader,
  BoardCanvas,
  CardDetailModal,
  DeleteListDialog,
  BoardMenuSheet,
  useBoardPage,
} from '#/features/board'
import type { BoardPageState } from '#/features/board'

export const Route = createFileRoute('/boards/$boardId')({
  errorComponent: AppError,
  component: BoardPage,
})

export function BoardPage() {
  const { boardId } = Route.useParams()
  const page = useBoardPage(boardId)

  if (page.status === 'loading') return <BoardSkeleton />
  if (page.status === 'unauthenticated') return <SignInRequired />
  if (page.status === 'not-found') return <BoardNotFound />

  return <BoardWorkspace page={page} />
}

function SignInRequired() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <Empty className="max-w-md border border-border bg-card">
        <EmptyHeader>
          <EmptyTitle>Sign in required</EmptyTitle>
          <EmptyDescription>
            Please sign in to access this Tasklane board.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link to="/sign-in/$" params={{ _splat: '' }}>
              Sign In
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  )
}

function BoardNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <Empty className="max-w-md border border-border bg-card">
        <EmptyHeader>
          <EmptyTitle>Board not found</EmptyTitle>
          <EmptyDescription>
            This board does not exist or you do not have permission to view it.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link to="/home">Return to Dashboard</Link>
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  )
}

function BoardWorkspace({
  page,
}: {
  page: Extract<BoardPageState, { status: 'ready' }>
}) {
  const {
    boardId,
    board,
    lists,
    cards,
    archivedCards,
    boardLabels,
    cardLabelsMap,
    boardMembers,
    cardAssigneesMap,
    cardCommentsCountMap,
    currentUser,
    currentUserProfile,
    presenceViewers,
    activeCard,
    activeCardLabels,
    activeCardAssignees,
    activeCardComments,
    activeCardActivities,
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
  } = page

  return (
    <div className="flex h-screen flex-col bg-app-background font-sans overflow-hidden">
      {/* Top Persistent Board Header */}
      <header className="shrink-0 border-b border-border/60 bg-card/85 shadow-2xs backdrop-blur-md sticky top-0 z-30">
        <BoardHeader
          board={board}
          members={boardMembers}
          presence={presenceViewers}
          isOwner={board.isOwner}
          currentUserId={currentUser?.tokenIdentifier}
          onOpenBoardMenu={() => setIsActivityMenuOpen(true)}
          onInviteMember={memberActions.inviteMember}
          onRemoveMember={memberActions.removeMember}
          onRenameBoard={boardActions.renameBoard}
          onDeleteBoard={boardActions.deleteBoard}
        />
      </header>

      {/* Main Drag-and-Drop Horizontal Canvas */}
      <BoardCanvas
        lists={lists}
        cards={cards}
        cardLabelsMap={cardLabelsMap}
        cardAssigneesMap={cardAssigneesMap}
        cardCommentsCountMap={cardCommentsCountMap}
        onAddList={listActions.addList}
        onRenameList={listActions.renameList}
        onDeleteList={(list) => setListBeingDeleted(list)}
        onArchiveAllCards={listActions.archiveAllCards}
        onAddCard={cardActions.addCard}
        onRenameCard={cardActions.renameCard}
        onArchiveCard={(cardId) =>
          cardActions.archiveCard(cardId, () => {
            if (activeCard?._id === cardId) {
              setActiveCardId(null)
            }
          })
        }
        onCardClick={(card) => setActiveCardId(card._id)}
        onReorderList={listActions.reorderList}
        onReorderCard={cardActions.reorderCard}
      />

      {/* Card Detail Modal (Desktop Dialog / Mobile Drawer) */}
      <CardDetailModal
        card={activeCard}
        lists={lists}
        boardLabels={boardLabels}
        cardLabels={activeCardLabels}
        boardMembers={boardMembers}
        cardAssignees={activeCardAssignees}
        comments={activeCardComments}
        activities={activeCardActivities}
        commentsStatus={commentsStatus}
        isCommentsLoading={isCommentsLoading}
        onLoadMoreComments={loadMoreComments}
        currentUserId={currentUser?.tokenIdentifier}
        currentUserProfile={currentUserProfile}
        isOpen={Boolean(activeCard)}
        onClose={() => setActiveCardId(null)}
        onSaveTitle={cardActions.renameCard}
        onSaveDescription={cardActions.updateCardDescription}
        onUpdateDueDate={cardActions.updateCardDueDate}
        onMoveToList={cardActions.moveCardToList}
        onArchive={() => {
          if (activeCard) {
            cardActions.archiveCard(activeCard._id, () => {
              setActiveCardId(null)
            })
          }
        }}
        onToggleLabel={labelActions.toggleCardLabel}
        onToggleAssignee={(userId) => {
          if (activeCard) {
            memberActions.toggleCardAssignee(activeCard._id, userId)
          }
        }}
        onAddComment={commentActions.addComment}
        onUpdateComment={commentActions.updateComment}
        onDeleteComment={commentActions.deleteComment}
      />

      {/* Delete List Confirmation Dialog */}
      <DeleteListDialog
        list={listBeingDeleted}
        cardCount={deletedListCardCount}
        isOpen={Boolean(listBeingDeleted)}
        onClose={() => setListBeingDeleted(null)}
        onConfirm={async () => {
          if (listBeingDeleted) {
            await listActions.deleteList(listBeingDeleted)
            setListBeingDeleted(null)
          }
        }}
      />

      {/* Board Menu / Activity Feed, Labels Palette & Archive Sheet */}
      <BoardMenuSheet
        boardId={boardId}
        boardTitle={board.name}
        presence={presenceViewers}
        archivedCards={archivedCards}
        labels={boardLabels}
        isOwner={board.isOwner}
        isOpen={isActivityMenuOpen}
        onClose={() => setIsActivityMenuOpen(false)}
        onRestoreCard={cardActions.restoreCard}
        onCreateLabel={labelActions.createLabel}
        onUpdateLabel={labelActions.updateLabel}
        onRemoveLabel={labelActions.removeLabel}
        onDeleteBoard={boardActions.deleteBoard}
      />
    </div>
  )
}
