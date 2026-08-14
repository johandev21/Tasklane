import { useState } from 'react'
import { Button } from '#/components/ui/button.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog.tsx'
import { Field, FieldGroup, FieldLabel } from '#/components/ui/field.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Spinner } from '#/components/ui/spinner.tsx'

interface CreateBoardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateBoard: (name: string) => Promise<void>
}

/**
 * Accessible Modal Dialog for creating a new board.
 */
export function CreateBoardDialog({
  open,
  onOpenChange,
  onCreateBoard,
}: CreateBoardDialogProps) {
  const [boardName, setBoardName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = boardName.trim()
    if (!trimmed) {
      setErrorMessage('Board name is required')
      return
    }

    try {
      setIsSubmitting(true)
      setErrorMessage(null)
      await onCreateBoard(trimmed)
      setBoardName('')
      onOpenChange(false)
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to create board',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create board</DialogTitle>
            <DialogDescription>
              Boards are collaborative spaces for organizing work with members.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <FieldGroup>
              <Field data-invalid={errorMessage ? true : undefined}>
                <FieldLabel htmlFor="board-title-input">Board title</FieldLabel>
                <Input
                  id="board-title-input"
                  value={boardName}
                  onChange={(e) => setBoardName(e.target.value)}
                  placeholder="e.g. Mobile App Launch"
                  autoFocus
                  maxLength={100}
                  disabled={isSubmitting}
                  aria-invalid={errorMessage ? true : undefined}
                />
                {errorMessage ? (
                  <p className="mt-1 text-xs text-destructive">
                    {errorMessage}
                  </p>
                ) : null}
              </Field>
            </FieldGroup>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Spinner data-icon="inline-start" />
                  Creating...
                </>
              ) : (
                'Create'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
