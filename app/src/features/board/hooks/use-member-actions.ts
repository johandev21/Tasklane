import { useBoardMutation } from '#/shared/api/use-board-mutation.ts'
import { toast } from 'sonner'
import { api } from '#/shared/api/client.ts'
import type { CardDoc } from '#/features/board/types/board.types.ts'

export interface MemberActions {
  inviteMember: (email: string) => Promise<void>
  removeMember: (userId: string) => Promise<void>
  toggleCardAssignee: (cardId: CardDoc['id'], userId: string) => Promise<void>
}

export function useMemberActions(boardId: string): MemberActions {
  const inviteMemberMutation = useBoardMutation({
    boardId,
    mutationFn: api.members.inviteByEmail,
    resources: ['members', 'assignees', 'presence', 'activity', 'cardActivity'],
  })
  const removeMemberMutation = useBoardMutation({
    boardId,
    mutationFn: api.members.remove,
    resources: ['members', 'assignees', 'presence', 'activity', 'cardActivity'],
  })
  const toggleCardAssigneeMutation = useBoardMutation({
    boardId,
    mutationFn: api.assignees.toggleOnCard,
    resources: ['members', 'assignees', 'presence', 'activity', 'cardActivity'],
  })

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

  const toggleCardAssignee = async (cardId: CardDoc['id'], userId: string) => {
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
