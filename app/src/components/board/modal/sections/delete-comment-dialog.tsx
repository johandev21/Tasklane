import { Trash2 } from 'lucide-react'
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
import type { CommentDoc } from '../../types.ts'

export interface DeleteCommentDialogProps {
  commentId: CommentDoc['_id'] | null
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export function DeleteCommentDialog({
  isOpen,
  onClose,
  onConfirm,
}: DeleteCommentDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="size-5" />
            Delete Comment?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this comment? This action is
            permanent and cannot be undone.
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
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
