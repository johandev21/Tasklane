import { useBoardMutation } from '#/shared/api/use-board-mutation.ts'
import { toast } from 'sonner'
import { api } from '#/shared/api/client.ts'
import type { CardDoc, LabelDoc } from '#/features/board/types/board.types.ts'
import type { LabelColorKey } from '#/features/board/utils/label-colors.ts'

export interface LabelActions {
  createLabel: (name: string, color: LabelColorKey) => Promise<void>
  updateLabel: (
    labelId: LabelDoc['id'],
    name?: string,
    color?: LabelColorKey,
  ) => Promise<void>
  removeLabel: (labelId: LabelDoc['id']) => Promise<void>
  toggleCardLabel: (cardId: CardDoc['id'], label: LabelDoc) => Promise<void>
}

export function useLabelActions(boardId: string): LabelActions {
  const createLabelMutation = useBoardMutation({
    boardId,
    mutationFn: api.labels.create,
    resources: ['labels', 'cardLabels', 'activity', 'cardActivity'],
  })
  const updateLabelMutation = useBoardMutation({
    boardId,
    mutationFn: api.labels.update,
    resources: ['labels', 'cardLabels', 'activity', 'cardActivity'],
  })
  const removeLabelMutation = useBoardMutation({
    boardId,
    mutationFn: api.labels.remove,
    resources: ['labels', 'cardLabels', 'activity', 'cardActivity'],
  })
  const toggleCardLabelMutation = useBoardMutation({
    boardId,
    mutationFn: api.labels.toggleOnCard,
    resources: ['labels', 'cardLabels', 'activity', 'cardActivity'],
  })

  const createLabel = async (name: string, color: LabelColorKey) => {
    try {
      await createLabelMutation({
        boardId,
        name,
        color,
      })
      toast.success(`Created label "${name}"`)
    } catch (err) {
      console.error('Failed to create label:', err)
      toast.error(
        err instanceof Error ? err.message : 'Failed to create label.',
      )
      throw err
    }
  }

  const updateLabel = async (
    labelId: LabelDoc['id'],
    name?: string,
    color?: LabelColorKey,
  ) => {
    try {
      await updateLabelMutation({
        labelId,
        name,
        color,
      })
      toast.success('Label updated')
    } catch (err) {
      console.error('Failed to update label:', err)
      toast.error(
        err instanceof Error ? err.message : 'Failed to update label.',
      )
      throw err
    }
  }

  const removeLabel = async (labelId: LabelDoc['id']) => {
    try {
      await removeLabelMutation({
        labelId,
      })
      toast.success('Label removed from board')
    } catch (err) {
      console.error('Failed to remove label:', err)
      toast.error(
        err instanceof Error ? err.message : 'Failed to remove label.',
      )
      throw err
    }
  }

  const toggleCardLabel = async (cardId: CardDoc['id'], label: LabelDoc) => {
    try {
      await toggleCardLabelMutation({
        cardId,
        labelId: label.id,
      })
    } catch (err) {
      console.error('Failed to toggle label:', err)
      toast.error(
        err instanceof Error ? err.message : 'Failed to toggle label on card.',
      )
    }
  }

  return {
    createLabel,
    updateLabel,
    removeLabel,
    toggleCardLabel,
  }
}
