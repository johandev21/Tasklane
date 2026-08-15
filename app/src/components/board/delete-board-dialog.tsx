import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Input } from '#/components/ui/input.tsx'

export interface DeleteBoardDialogProps {
  boardTitle: string
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export function DeleteBoardDialog({
  boardTitle,
  isOpen,
  onClose,
  onConfirm,
}: DeleteBoardDialogProps) {
  const [confirmInput, setConfirmInput] = useState('')

  useEffect(() => {
    if (isOpen) {
      setConfirmInput('')
    }
  }, [isOpen])

  const isConfirmed = confirmInput.trim() === boardTitle.trim()

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 font-heading font-semibold text-destructive">
            <AlertTriangle className="size-5" />
            Delete Board Permanently?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 pt-2 text-sm leading-relaxed text-muted-foreground">
              <p>
                This action is <strong>permanent and irreversible</strong>. All
                lists, cards, comments, activity logs, labels, and board
                memberships will be completely deleted.
              </p>
              <div className="space-y-1.5 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                <label className="block text-sm font-semibold text-foreground">
                  To confirm, type the board name{' '}
                  <span className="select-all font-mono font-bold text-destructive">
                    {boardTitle}
                  </span>
                  :
                </label>
                <Input
                  autoFocus
                  placeholder={boardTitle}
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  className="h-8 bg-background text-sm"
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} className="h-8 text-sm">
            Cancel
          </AlertDialogCancel>
          <Button
            size="sm"
            variant="destructive"
            disabled={!isConfirmed}
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className="h-8 text-sm"
          >
            I understand, delete this board
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
