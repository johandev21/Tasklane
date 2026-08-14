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
} from '#/components/ui/alert-dialog'
import type { ListItem } from '#/components/prototype/types'

export interface DeleteListDialogProps {
  list: ListItem | null | undefined
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export function DeleteListDialog({
  list,
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
            <div className="space-y-2 text-sm leading-relaxed">
              <p className="break-all">
                Deleting this list will remove it from the canvas and{' '}
                <strong>archive all {list?.cardIds.length ?? 0} cards</strong>{' '}
                it contains.
              </p>
              <p className="text-muted-foreground">
                Per Tasklane specifications: no data is ever destroyed. You can
                restore these cards anytime from the Archive view.
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
