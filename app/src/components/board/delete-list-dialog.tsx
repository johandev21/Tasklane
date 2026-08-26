import { AlertCircle } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog.tsx'
import type { ListDoc } from './types.ts'

export interface DeleteListDialogProps {
  list: ListDoc | null
  cardCount: number
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export function DeleteListDialog({
  list,
  cardCount,
  isOpen,
  onClose,
  onConfirm,
}: DeleteListDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="size-5" />
            Delete List "{list?.title}"?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="flex flex-col gap-2 text-sm leading-relaxed">
              <p className="break-all">
                Deleting this list will remove it from the canvas and{' '}
                <strong>
                  archive all {cardCount} {cardCount === 1 ? 'card' : 'cards'}
                </strong>{' '}
                it contains.
              </p>
              <p className="text-muted-foreground">
                Per Tasklane specifications: no data is ever destroyed. You can
                restore these cards anytime.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
          >
            Delete & Archive Cards
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
