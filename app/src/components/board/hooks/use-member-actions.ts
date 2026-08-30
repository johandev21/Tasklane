import { useMutation } from 'convex/react'
import { toast } from 'sonner'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import type { CardDoc } from '../types.ts'

export interface MemberActions {
  inviteMember: (email: string) => Promise<void>
  removeMember: (userId: string) => Promise<void>
  toggleCardAssignee: (cardId: CardDoc['_id'], userId: string) => Promise<void>
}

export function useMemberActions(boardId: Id<'boards'>): MemberActions {
  const inviteMemberMutation = useMutation(api.members.inviteByEmail)
  const removeMemberMutation = useMutation(api.members.remove)
  const toggleCardAssigneeMutation = useMutation(api.assignees.toggleOnCard)

  const inviteMember = async (email: string) => {
    await inviteMemberMutation({
      boardId,
      email,
    })
  }

  const removeMember = async (userId: string) => {
    await removeMemberMutation({
      boardId,
      userId,
    })
  }

  const toggleCardAssignee = async (cardId: CardDoc['_id'], userId: string) => {
    try {
      await toggleCardAssigneeMutation({
        cardId,
        userId,
      })
    } catch (err) {
      console.error('Failed to toggle assignee:', err)
      toast.error(
        err instanceof Error ? err.message : 'Failed to update card assignee.',
      )
    }
  }

  return {
    inviteMember,
    removeMember,
    toggleCardAssignee,
  }
}
