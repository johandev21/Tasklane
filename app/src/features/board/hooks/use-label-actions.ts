import { useMutation } from 'convex/react'
import { toast } from 'sonner'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import type { CardDoc, LabelDoc } from '#/features/board/types/board.types.ts'

export interface LabelActions {
  createLabel: (name: string, color: string) => Promise<void>
  updateLabel: (
    labelId: LabelDoc['_id'],
    name?: string,
    color?: string,
  ) => Promise<void>
  removeLabel: (labelId: LabelDoc['_id']) => Promise<void>
  toggleCardLabel: (cardId: CardDoc['_id'], label: LabelDoc) => Promise<void>
}

export function useLabelActions(boardId: Id<'boards'>): LabelActions {
  const createLabelMutation = useMutation(api.labels.create)
  const updateLabelMutation = useMutation(api.labels.update)
  const removeLabelMutation = useMutation(api.labels.remove)
  const toggleCardLabelMutation = useMutation(api.labels.toggleOnCard)

  const createLabel = async (name: string, color: string) => {
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
    labelId: LabelDoc['_id'],
    name?: string,
    color?: string,
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

  const removeLabel = async (labelId: LabelDoc['_id']) => {
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

  const toggleCardLabel = async (cardId: CardDoc['_id'], label: LabelDoc) => {
    try {
      await toggleCardLabelMutation({
        cardId,
        labelId: label._id,
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
