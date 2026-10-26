import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '#/shared/components/ui/dialog.tsx'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '#/shared/components/ui/drawer.tsx'
import { useIsMobile } from '#/shared/hooks/use-mobile.ts'

import { CardDetailModalContent } from './card-detail-modal-content.tsx'
import type {
  BoardMemberUser,
  CardDoc,
  CommentDoc,
  EnrichedActivityDoc,
  EnrichedComment,
  ListDoc,
  LabelDoc,
} from '#/features/board/types/board.types.ts'

export interface CardDetailModalProps {
  card: CardDoc | null
  lists: ListDoc[]
  boardLabels?: LabelDoc[]
  cardLabels?: LabelDoc[]
  boardMembers?: BoardMemberUser[]
  cardAssignees?: BoardMemberUser[]
  comments?: EnrichedComment[]
  activities?: EnrichedActivityDoc[]
  currentUserId?: string
  currentUserProfile?: BoardMemberUser | null
  isOpen: boolean
  onClose: () => void
  onSaveTitle: (cardId: CardDoc['id'], title: string) => void
  onSaveDescription: (cardId: CardDoc['id'], description: string) => void
  onUpdateDueDate: (cardId: CardDoc['id'], dueDate: number | undefined) => void
  onMoveToList: (cardId: CardDoc['id'], listId: ListDoc['id']) => void
  onArchive: (cardId: CardDoc['id']) => void
  onToggleLabel?: (cardId: CardDoc['id'], label: LabelDoc) => void
  onToggleAssignee?: (cardId: CardDoc['id'], userId: string) => void
  onAddComment?: (cardId: CardDoc['id'], body: string) => Promise<void> | void
  onUpdateComment?: (
    commentId: CommentDoc['id'],
    body: string,
  ) => Promise<void> | void
  onDeleteComment?: (commentId: CommentDoc['id']) => Promise<void> | void
  commentsStatus?:
    'CanLoadMore' | 'Error' | 'LoadingFirstPage' | 'LoadingMore' | 'Exhausted'
  isCommentsLoading?: boolean
  onLoadMoreComments?: (numItems: number) => void
  onRetryComments?: () => void
}

export function CardDetailModal({
  card,
  lists,
  boardLabels = [],
  cardLabels = [],
  boardMembers = [],
  cardAssignees = [],
  comments = [],
  activities = [],
  currentUserId,
  currentUserProfile,
  isOpen,
  onClose,
  onSaveTitle,
  onSaveDescription,
  onUpdateDueDate,
  onMoveToList,
  onArchive,
  onToggleLabel,
  onToggleAssignee,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
  commentsStatus,
  isCommentsLoading,
  onLoadMoreComments,
  onRetryComments,
}: CardDetailModalProps) {
  const isMobile = useIsMobile()

  if (!card) return null

  const content = (
    <CardDetailModalContent
      card={card}
      lists={lists}
      boardLabels={boardLabels}
      cardLabels={cardLabels}
      boardMembers={boardMembers}
      cardAssignees={cardAssignees}
      comments={comments}
      activities={activities}
      currentUserId={currentUserId}
      currentUserProfile={currentUserProfile}
      onSaveTitle={(title) => onSaveTitle(card.id, title)}
      onSaveDescription={(desc) => onSaveDescription(card.id, desc)}
      onUpdateDueDate={(dueDate) => onUpdateDueDate(card.id, dueDate)}
      onMoveToList={(listId) => onMoveToList(card.id, listId)}
      onArchive={() => onArchive(card.id)}
      onClose={onClose}
      onToggleLabel={(label) => onToggleLabel?.(card.id, label)}
      onToggleAssignee={(userId) => onToggleAssignee?.(card.id, userId)}
      onAddComment={(body) => onAddComment?.(card.id, body)}
      onUpdateComment={(commentId, body) => onUpdateComment?.(commentId, body)}
      onDeleteComment={(commentId) => onDeleteComment?.(commentId)}
      commentsStatus={commentsStatus}
      isCommentsLoading={isCommentsLoading}
      onLoadMoreComments={onLoadMoreComments}
      onRetryComments={onRetryComments}
    />
  )

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="h-[90vh] max-h-[95vh] flex flex-col p-0 bg-card rounded-t-3xl overflow-hidden shadow-2xl border-none before:hidden">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Card Details - {card.title}</DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-3xl md:max-w-3xl max-w-3xl w-[min(94vw,760px)] md:w-[min(90vw,780px)] lg:w-[min(85vw,820px)] h-[84vh] max-h-[88vh] flex flex-col p-0 bg-card rounded-2xl overflow-hidden shadow-2xl ring-1 ring-border/80"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Card Details - {card.title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {content}
        </div>
      </DialogContent>
    </Dialog>
  )
}
