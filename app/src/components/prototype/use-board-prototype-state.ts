import { useState, useCallback } from 'react'
import { INITIAL_MOCK_BOARD } from './mock-data'
import type {
  BoardData,
  CardItem,
  ListItem,
  Label,
  LabelColorId,
  ActivityItem,
  ActivityVerb,
  Member,
} from './types'

export function useBoardPrototypeState() {
  const [board, setBoard] = useState<BoardData>(() =>
    structuredClone(INITIAL_MOCK_BOARD),
  )
  const [currentUserId, setCurrentUserId] = useState<string>('user-priya')

  const logActivity = useCallback(
    (type: ActivityVerb, targetTitle: string, details?: string) => {
      const newActivity: ActivityItem = {
        id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        actorId: currentUserId,
        type,
        targetTitle,
        details,
        createdAt: new Date().toISOString(),
      }
      setBoard((prev) => ({
        ...prev,
        activity: [newActivity, ...prev.activity],
      }))
    },
    [currentUserId],
  )

  const resetBoard = useCallback(() => {
    setBoard(structuredClone(INITIAL_MOCK_BOARD))
    setCurrentUserId('user-priya')
  }, [])

  const updateBoardTitle = useCallback(
    (newTitle: string) => {
      const trimmed = newTitle.trim()
      if (!trimmed) return
      setBoard((prev) => {
        if (prev.title === trimmed) return prev
        return { ...prev, title: trimmed }
      })
      logActivity('board_renamed', trimmed)
    },
    [logActivity],
  )

  const deleteBoard = useCallback(() => {
    setBoard({
      id: 'board-empty',
      title: 'Empty Board',
      ownerId: currentUserId,
      members: [],
      labels: [],
      lists: [],
      cards: {},
      archivedCardIds: [],
      activity: [],
    })
  }, [currentUserId])

  const addList = useCallback(
    (title: string) => {
      const trimmed = title.trim()
      if (!trimmed) return
      const id = `list-${Date.now()}`
      setBoard((prev) => {
        const newList: ListItem = {
          id,
          boardId: prev.id,
          title: trimmed,
          order: prev.lists.length,
          cardIds: [],
        }
        return {
          ...prev,
          lists: [...prev.lists, newList],
        }
      })
      logActivity('list_created', trimmed)
    },
    [logActivity],
  )

  const renameList = useCallback(
    (listId: string, newTitle: string) => {
      const trimmed = newTitle.trim()
      if (!trimmed) return
      let oldTitle = ''
      setBoard((prev) => {
        const target = prev.lists.find((l) => l.id === listId)
        if (!target || target.title === trimmed) return prev
        oldTitle = target.title
        return {
          ...prev,
          lists: prev.lists.map((l) =>
            l.id === listId ? { ...l, title: trimmed } : l,
          ),
        }
      })
      if (oldTitle) {
        logActivity('list_renamed', trimmed, oldTitle)
      }
    },
    [logActivity],
  )

  const deleteList = useCallback(
    (listId: string) => {
      let listTitle = ''
      setBoard((prev) => {
        const targetList = prev.lists.find((l) => l.id === listId)
        if (!targetList) return prev
        listTitle = targetList.title

        const cardsToArchive = targetList.cardIds
        const updatedCards = { ...prev.cards }
        cardsToArchive.forEach((cId) => {
          const c = updatedCards[cId]
          if (c) {
            updatedCards[cId] = { ...c, isArchived: true }
          }
        })

        return {
          ...prev,
          lists: prev.lists.filter((l) => l.id !== listId),
          cards: updatedCards,
          archivedCardIds: [...prev.archivedCardIds, ...cardsToArchive],
        }
      })
      if (listTitle) {
        logActivity('list_deleted', listTitle)
      }
    },
    [logActivity],
  )

  const archiveAllCardsInList = useCallback(
    (listId: string) => {
      let listTitle = ''
      setBoard((prev) => {
        const targetList = prev.lists.find((l) => l.id === listId)
        if (!targetList || targetList.cardIds.length === 0) return prev
        listTitle = targetList.title

        const cardsToArchive = targetList.cardIds
        const updatedCards = { ...prev.cards }
        cardsToArchive.forEach((cId) => {
          const c = updatedCards[cId]
          if (c) {
            updatedCards[cId] = { ...c, isArchived: true }
          }
        })

        return {
          ...prev,
          lists: prev.lists.map((l) =>
            l.id === listId ? { ...l, cardIds: [] } : l,
          ),
          cards: updatedCards,
          archivedCardIds: [...prev.archivedCardIds, ...cardsToArchive],
        }
      })
      if (listTitle) {
        logActivity('card_archived', `All cards in ${listTitle}`)
      }
    },
    [logActivity],
  )

  const addCard = useCallback(
    (listId: string, title: string) => {
      const trimmed = title.trim()
      if (!trimmed) return
      const id = `card-${Date.now()}`
      const newCard: CardItem = {
        id,
        listId,
        title: trimmed,
        labels: [],
        assigneeIds: [],
        comments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      setBoard((prev) => ({
        ...prev,
        cards: {
          ...prev.cards,
          [id]: newCard,
        },
        lists: prev.lists.map((l) =>
          l.id === listId ? { ...l, cardIds: [...l.cardIds, id] } : l,
        ),
      }))
      logActivity('card_created', trimmed)
    },
    [logActivity],
  )

  const renameCard = useCallback((cardId: string, newTitle: string) => {
    const trimmed = newTitle.trim()
    if (!trimmed) return
    setBoard((prev) => {
      const existing = prev.cards[cardId]
      if (!existing || existing.title === trimmed) return prev
      return {
        ...prev,
        cards: {
          ...prev.cards,
          [cardId]: {
            ...existing,
            title: trimmed,
            updatedAt: new Date().toISOString(),
          },
        },
      }
    })
  }, [])

  const updateCard = useCallback((cardId: string, patch: Partial<CardItem>) => {
    setBoard((prev) => {
      const existing = prev.cards[cardId]
      if (!existing) return prev
      return {
        ...prev,
        cards: {
          ...prev.cards,
          [cardId]: {
            ...existing,
            ...patch,
            updatedAt: new Date().toISOString(),
          },
        },
      }
    })
  }, [])

  const archiveCard = useCallback(
    (cardId: string) => {
      let cardTitle = ''
      setBoard((prev) => {
        const card = prev.cards[cardId]
        if (!card) return prev
        cardTitle = card.title

        return {
          ...prev,
          cards: {
            ...prev.cards,
            [cardId]: { ...card, isArchived: true },
          },
          lists: prev.lists.map((l) =>
            l.id === card.listId
              ? { ...l, cardIds: l.cardIds.filter((id) => id !== cardId) }
              : l,
          ),
          archivedCardIds: [...prev.archivedCardIds, cardId],
        }
      })
      if (cardTitle) {
        logActivity('card_archived', cardTitle)
      }
    },
    [logActivity],
  )

  const restoreCard = useCallback(
    (cardId: string, targetListId?: string) => {
      let cardTitle = ''
      setBoard((prev) => {
        const card = prev.cards[cardId]
        if (!card) return prev
        cardTitle = card.title

        const destListId =
          targetListId ||
          (prev.lists.some((l) => l.id === card.listId)
            ? card.listId
            : prev.lists[0]?.id)

        if (!destListId) return prev

        return {
          ...prev,
          cards: {
            ...prev.cards,
            [cardId]: {
              ...card,
              isArchived: false,
              listId: destListId,
              updatedAt: new Date().toISOString(),
            },
          },
          lists: prev.lists.map((l) =>
            l.id === destListId ? { ...l, cardIds: [...l.cardIds, cardId] } : l,
          ),
          archivedCardIds: prev.archivedCardIds.filter((id) => id !== cardId),
        }
      })
      if (cardTitle) {
        logActivity('card_restored', cardTitle)
      }
    },
    [logActivity],
  )

  const reorderLists = useCallback(
    (sourceIndex: number, targetIndex: number) => {
      setBoard((prev) => {
        const newLists = [...prev.lists]
        const [moved] = newLists.splice(sourceIndex, 1)
        newLists.splice(targetIndex, 0, moved)
        return {
          ...prev,
          lists: newLists.map((l, i) => ({ ...l, order: i })),
        }
      })
    },
    [],
  )

  const moveCard = useCallback(
    (
      cardId: string,
      sourceListId: string,
      targetListId: string,
      targetIndex: number,
    ) => {
      setBoard((prev) => {
        const sourceList = prev.lists.find((l) => l.id === sourceListId)
        const targetList = prev.lists.find((l) => l.id === targetListId)
        if (!sourceList || !targetList) return prev

        const existingCard = prev.cards[cardId]
        if (!existingCard) return prev

        const newSourceCardIds = sourceList.cardIds.filter(
          (id) => id !== cardId,
        )
        const newTargetCardIds =
          sourceListId === targetListId
            ? newSourceCardIds
            : [...targetList.cardIds]

        newTargetCardIds.splice(targetIndex, 0, cardId)

        const updatedLists = prev.lists.map((l) => {
          if (l.id === sourceListId && sourceListId === targetListId) {
            return { ...l, cardIds: newTargetCardIds }
          }
          if (l.id === sourceListId) {
            return { ...l, cardIds: newSourceCardIds }
          }
          if (l.id === targetListId) {
            return { ...l, cardIds: newTargetCardIds }
          }
          return l
        })

        const updatedCards = {
          ...prev.cards,
          [cardId]: {
            ...existingCard,
            listId: targetListId,
            updatedAt: new Date().toISOString(),
          },
        }

        return {
          ...prev,
          lists: updatedLists,
          cards: updatedCards,
        }
      })
    },
    [],
  )

  const moveCardToList = useCallback(
    (cardId: string, targetListId: string) => {
      let cardTitle = ''
      let targetListName = ''

      setBoard((prev) => {
        const card = prev.cards[cardId]
        if (!card || card.listId === targetListId) return prev
        const sourceList = prev.lists.find((l) => l.id === card.listId)
        const targetList = prev.lists.find((l) => l.id === targetListId)
        if (!sourceList || !targetList) return prev

        cardTitle = card.title
        targetListName = targetList.title

        const newSourceCardIds = sourceList.cardIds.filter(
          (id) => id !== cardId,
        )
        const newTargetCardIds = [...targetList.cardIds, cardId]

        const updatedLists = prev.lists.map((l) => {
          if (l.id === sourceList.id) {
            return { ...l, cardIds: newSourceCardIds }
          }
          if (l.id === targetList.id) {
            return { ...l, cardIds: newTargetCardIds }
          }
          return l
        })

        const updatedCards = {
          ...prev.cards,
          [cardId]: {
            ...card,
            listId: targetListId,
            updatedAt: new Date().toISOString(),
          },
        }

        return {
          ...prev,
          lists: updatedLists,
          cards: updatedCards,
        }
      })

      if (cardTitle && targetListName) {
        logActivity('card_moved', cardTitle, targetListName)
      }
    },
    [logActivity],
  )

  // Comments CRUD
  const addComment = useCallback(
    (cardId: string, text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      let cardTitle = ''
      const newComment = {
        id: `cm-${Date.now()}`,
        memberId: currentUserId,
        text: trimmed,
        createdAt: new Date().toISOString(),
      }

      setBoard((prev) => {
        const card = prev.cards[cardId]
        if (!card) return prev
        cardTitle = card.title
        return {
          ...prev,
          cards: {
            ...prev.cards,
            [cardId]: {
              ...card,
              comments: [...card.comments, newComment],
              updatedAt: new Date().toISOString(),
            },
          },
        }
      })
      if (cardTitle) {
        logActivity('comment_added', cardTitle)
      }
    },
    [currentUserId, logActivity],
  )

  const editComment = useCallback(
    (cardId: string, commentId: string, newText: string) => {
      const trimmed = newText.trim()
      if (!trimmed) return
      setBoard((prev) => {
        const card = prev.cards[cardId]
        if (!card) return prev
        return {
          ...prev,
          cards: {
            ...prev.cards,
            [cardId]: {
              ...card,
              comments: card.comments.map((cm) =>
                cm.id === commentId
                  ? {
                      ...cm,
                      text: trimmed,
                      updatedAt: new Date().toISOString(),
                    }
                  : cm,
              ),
              updatedAt: new Date().toISOString(),
            },
          },
        }
      })
    },
    [],
  )

  const deleteComment = useCallback((cardId: string, commentId: string) => {
    setBoard((prev) => {
      const card = prev.cards[cardId]
      if (!card) return prev
      return {
        ...prev,
        cards: {
          ...prev.cards,
          [cardId]: {
            ...card,
            comments: card.comments.filter((cm) => cm.id !== commentId),
            updatedAt: new Date().toISOString(),
          },
        },
      }
    })
  }, [])

  // Labels on Cards
  const toggleCardLabel = useCallback(
    (cardId: string, label: Label) => {
      const card = board.cards[cardId]
      if (!card) return
      const hasLabel = card.labels.some((l) => l.id === label.id)
      const updatedLabels = hasLabel
        ? card.labels.filter((l) => l.id !== label.id)
        : [...card.labels, label]

      setBoard((prev) => ({
        ...prev,
        cards: {
          ...prev.cards,
          [cardId]: {
            ...card,
            labels: updatedLabels,
            updatedAt: new Date().toISOString(),
          },
        },
      }))

      logActivity(
        hasLabel ? 'label_removed' : 'label_added',
        card.title,
        label.name,
      )
    },
    [board.cards, logActivity],
  )

  // Assignees on Cards
  const toggleCardAssignee = useCallback(
    (cardId: string, memberId: string) => {
      const card = board.cards[cardId]
      const member = board.members.find((m) => m.id === memberId)
      if (!card || !member) return

      const isAssigned = card.assigneeIds.includes(memberId)
      const updatedAssignees = isAssigned
        ? card.assigneeIds.filter((id) => id !== memberId)
        : [...card.assigneeIds, memberId]

      setBoard((prev) => ({
        ...prev,
        cards: {
          ...prev.cards,
          [cardId]: {
            ...card,
            assigneeIds: updatedAssignees,
            updatedAt: new Date().toISOString(),
          },
        },
      }))

      logActivity(
        isAssigned ? 'assignee_removed' : 'assignee_added',
        card.title,
        member.name,
      )
    },
    [board.cards, board.members, logActivity],
  )

  // Label Palette Management (Owner only)
  const addPaletteLabel = useCallback((name: string, color: LabelColorId) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setBoard((prev) => {
      if (prev.labels.length >= 8) return prev
      const newLabel: Label = {
        id: `lbl-${Date.now()}`,
        name: trimmed,
        color,
      }
      return {
        ...prev,
        labels: [...prev.labels, newLabel],
      }
    })
  }, [])

  const updatePaletteLabel = useCallback(
    (labelId: string, name: string, color: LabelColorId) => {
      const trimmed = name.trim()
      if (!trimmed) return
      setBoard((prev) => {
        const updatedPalette = prev.labels.map((l) =>
          l.id === labelId ? { ...l, name: trimmed, color } : l,
        )

        // Propagate palette change to all cards referencing this label
        const updatedCards = { ...prev.cards }
        Object.keys(updatedCards).forEach((cId) => {
          const c = updatedCards[cId]
          if (c && c.labels.some((l) => l.id === labelId)) {
            updatedCards[cId] = {
              ...c,
              labels: c.labels.map((l) =>
                l.id === labelId ? { ...l, name: trimmed, color } : l,
              ),
            }
          }
        })

        return {
          ...prev,
          labels: updatedPalette,
          cards: updatedCards,
        }
      })
    },
    [],
  )

  const deletePaletteLabel = useCallback((labelId: string) => {
    setBoard((prev) => {
      const updatedPalette = prev.labels.filter((l) => l.id !== labelId)

      // Remove from all cards
      const updatedCards = { ...prev.cards }
      Object.keys(updatedCards).forEach((cId) => {
        const c = updatedCards[cId]
        if (c && c.labels.some((l) => l.id === labelId)) {
          updatedCards[cId] = {
            ...c,
            labels: c.labels.filter((l) => l.id !== labelId),
          }
        }
      })

      return {
        ...prev,
        labels: updatedPalette,
        cards: updatedCards,
      }
    })
  }, [])

  // Members Management (Owner only)
  const inviteMemberByEmail = useCallback(
    (email: string, name?: string) => {
      const trimmedEmail = email.trim().toLowerCase()
      if (!trimmedEmail) return
      const memberName = name?.trim() || trimmedEmail.split('@')[0]
      const newMember: Member = {
        id: `user-${Date.now()}`,
        name: memberName,
        email: trimmedEmail,
        avatarUrl: `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 1000)}?w=120&auto=format&fit=crop&q=80`,
        initials: memberName.slice(0, 2).toUpperCase(),
        color: 'bg-indigo-600',
        isOnline: true,
      }

      setBoard((prev) => ({
        ...prev,
        members: [...prev.members, newMember],
      }))
      logActivity('member_added', memberName)
    },
    [logActivity],
  )

  const removeMember = useCallback(
    (memberId: string) => {
      let memberName = ''
      setBoard((prev) => {
        const member = prev.members.find((m) => m.id === memberId)
        if (!member) return prev
        memberName = member.name

        // Remove assignment from all cards
        const updatedCards = { ...prev.cards }
        Object.keys(updatedCards).forEach((cId) => {
          const c = updatedCards[cId]
          if (c && c.assigneeIds.includes(memberId)) {
            updatedCards[cId] = {
              ...c,
              assigneeIds: c.assigneeIds.filter((id) => id !== memberId),
            }
          }
        })

        return {
          ...prev,
          members: prev.members.filter((m) => m.id !== memberId),
          cards: updatedCards,
        }
      })

      if (memberName) {
        logActivity('member_removed', memberName)
      }
    },
    [logActivity],
  )

  const isOwner = board.ownerId === currentUserId

  return {
    board,
    currentUserId,
    isOwner,
    setCurrentUserId,
    updateBoardTitle,
    deleteBoard,
    addList,
    renameList,
    deleteList,
    archiveAllCardsInList,
    addCard,
    renameCard,
    updateCard,
    archiveCard,
    restoreCard,
    reorderLists,
    moveCard,
    moveCardToList,
    addComment,
    editComment,
    deleteComment,
    toggleCardLabel,
    toggleCardAssignee,
    addPaletteLabel,
    updatePaletteLabel,
    deletePaletteLabel,
    inviteMemberByEmail,
    removeMember,
    resetBoard,
  }
}

export type BoardPrototypeActions = ReturnType<typeof useBoardPrototypeState>
