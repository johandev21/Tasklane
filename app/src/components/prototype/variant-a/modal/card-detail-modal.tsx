import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '#/components/ui/drawer'
import { CardDetailModalContent } from './card-detail-modal-content'
import type { BoardData, CardItem, Label } from '#/components/prototype/types'

export interface CardDetailModalProps {
  card: CardItem
  board: BoardData
  currentUserId: string
  isMobile: boolean
  isOpen: boolean
  onClose: () => void
  onUpdateCard: (patch: Partial<CardItem>) => void
  onToggleLabel: (label: Label) => void
  onToggleAssignee: (memberId: string) => void
  onAddComment: (text: string) => void
  onEditComment: (commentId: string, newText: string) => void
  onDeleteComment: (commentId: string) => void
  onMoveCardToList: (targetListId: string) => void
  onArchiveCard: () => void
}

export function CardDetailModal({
  card,
  board,
  currentUserId,
  isMobile,
  isOpen,
  onClose,
  onUpdateCard,
  onToggleLabel,
  onToggleAssignee,
  onAddComment,
  onEditComment,
  onDeleteComment,
  onMoveCardToList,
  onArchiveCard,
}: CardDetailModalProps) {
  const content = (
    <CardDetailModalContent
      card={card}
      board={board}
      currentUserId={currentUserId}
      onUpdateCard={onUpdateCard}
      onToggleLabel={onToggleLabel}
      onToggleAssignee={onToggleAssignee}
      onAddComment={onAddComment}
      onEditComment={onEditComment}
      onDeleteComment={onDeleteComment}
      onMoveCardToList={onMoveCardToList}
      onArchiveCard={onArchiveCard}
      onClose={onClose}
    />
  )

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="h-[92vh] max-h-[95vh] flex flex-col p-0 bg-card rounded-t-3xl overflow-hidden shadow-2xl">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Card Details</DrawerTitle>
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
        className="sm:max-w-5xl md:max-w-5xl max-w-5xl w-[min(96vw,1040px)] h-[88vh] max-h-[88vh] flex flex-col p-0 bg-card rounded-2xl overflow-hidden shadow-2xl ring-1 ring-border/80"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Card Details</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {content}
        </div>
      </DialogContent>
    </Dialog>
  )
}
