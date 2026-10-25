import { FolderArchive } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/shared/components/ui/alert-dialog.tsx'
import type { ListDoc } from '#/features/board/types/board.types.ts'

export interface ArchiveListDialogProps {
  list: ListDoc | null
  cardCount: number
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export function ArchiveListDialog({
  list,
  cardCount,
  isOpen,
  onClose,
  onConfirm,
}: ArchiveListDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-foreground">
            <FolderArchive className="size-5 text-muted-foreground" />
            Archive all cards in &quot;{list?.title}&quot;?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="flex flex-col gap-2 text-sm leading-relaxed text-muted-foreground">
              <p>
                This will archive{' '}
                <strong>
                  {cardCount} {cardCount === 1 ? 'card' : 'cards'}
                </strong>{' '}
                currently in this list. The list itself will remain on your
                board.
              </p>
              <p className="text-xs">
                You can restore individual cards at any time from the board menu
                under the Archived tab.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            Archive All Cards
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
