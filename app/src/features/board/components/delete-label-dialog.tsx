import { AlertTriangle } from 'lucide-react'
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
import type { LabelDoc } from '#/features/board/types/board.types.ts'

export interface DeleteLabelDialogProps {
  label: LabelDoc | null
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export function DeleteLabelDialog({
  label,
  isOpen,
  onClose,
  onConfirm,
}: DeleteLabelDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" />
            Delete Label &quot;{label?.name}&quot;?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="flex flex-col gap-2 text-sm leading-relaxed text-muted-foreground">
              <p>
                Deleting this label will permanently remove it from the board
                palette and <strong>detach it from all cards</strong> where it
                is currently applied.
              </p>
              <p className="text-xs">This action cannot be undone.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            Delete Label
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
