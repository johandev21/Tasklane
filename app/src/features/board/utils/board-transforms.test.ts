import { describe, it, expect } from 'vitest'
import type { Id } from '../../../../convex/_generated/dataModel'
import type {
  CardDoc,
  EnrichedActivityDoc,
  EnrichedComment,
  LabelDoc,
  ListDoc,
  BoardMemberUser,
} from '#/features/board/types/board.types.ts'
import {
  reorderLists,
  reorderCardsWithinList,
  moveCardBetweenLists,
  moveCardToListEnd,
  removeArchivedCard,
  groupCardLabelsByCard,
  groupCardAssigneesByCard,
  groupCardCommentCountsByCard,
  getCardFeedItems,
  formatActivityMessage,
  formatCardActivityMessage,
  getInitials,
} from '#/features/board/utils/board-transforms.ts'

describe('board-transforms', () => {
  const listAId = 'list_a' as Id<'lists'>
  const listBId = 'list_b' as Id<'lists'>
  const listCId = 'list_c' as Id<'lists'>
  const boardId = 'board_1' as Id<'boards'>

  const mockLists: ListDoc[] = [
    {
      _id: listAId,
      _creationTime: 1000,
      boardId,
      title: 'To Do',
      position: 0,
    },
    {
      _id: listBId,
      _creationTime: 1001,
      boardId,
      title: 'In Progress',
      position: 1,
    },
    {
      _id: listCId,
      _creationTime: 1002,
      boardId,
      title: 'Done',
      position: 2,
    },
  ]

  const card1Id = 'card_1' as Id<'cards'>
  const card2Id = 'card_2' as Id<'cards'>
  const card3Id = 'card_3' as Id<'cards'>
  const card4Id = 'card_4' as Id<'cards'>

  const mockCards: CardDoc[] = [
    {
      _id: card1Id,
      _creationTime: 2000,
      boardId,
      listId: listAId,
      title: 'Card 1',
      position: 0,
      archived: false,
    },
    {
      _id: card2Id,
      _creationTime: 2001,
      boardId,
      listId: listAId,
      title: 'Card 2',
      position: 1,
      archived: false,
    },
    {
      _id: card3Id,
      _creationTime: 2002,
      boardId,
      listId: listBId,
      title: 'Card 3',
      position: 0,
      archived: false,
    },
    {
      _id: card4Id,
      _creationTime: 2003,
      boardId,
      listId: listBId,
      title: 'Card 4',
      position: 1,
      archived: true,
    },
  ]

  describe('reorderLists', () => {
    it('moves a list to a new position and re-indexes sequentially', () => {
      const result = reorderLists(mockLists, listAId, 2)
      expect(result.map((l) => l._id)).toEqual([listBId, listCId, listAId])
      expect(result.map((l) => l.position)).toEqual([0, 1, 2])
    })

    it('returns unchanged list if listId is not found', () => {
      const result = reorderLists(mockLists, 'unknown' as Id<'lists'>, 1)
      expect(result).toEqual(mockLists)
    })
  })

  describe('reorderCardsWithinList', () => {
    it('reorders active cards within the same list', () => {
      const result = reorderCardsWithinList(mockCards, card2Id, listAId, 0)
      const listACards = result.filter((c) => c.listId === listAId)
      expect(listACards.map((c) => c._id)).toEqual([card2Id, card1Id])
      expect(listACards.map((c) => c.position)).toEqual([0, 1])
    })

    it('ignores unknown card ID', () => {
      const result = reorderCardsWithinList(
        mockCards,
        'unknown' as Id<'cards'>,
        listAId,
        0,
      )
      expect(result).toEqual(mockCards)
    })
  })

  describe('moveCardBetweenLists', () => {
    it('moves card from source to target list and re-indexes both', () => {
      const result = moveCardBetweenLists(mockCards, card1Id, listBId, 0)
      const listACards = result.filter((c) => c.listId === listAId)
      const listBCards = result.filter(
        (c) => c.listId === listBId && !c.archived,
      )

      expect(listACards.map((c) => c._id)).toEqual([card2Id])
      expect(listACards[0].position).toBe(0)

      expect(listBCards.map((c) => c._id)).toEqual([card1Id, card3Id])
      expect(listBCards[0].position).toBe(0)
      expect(listBCards[1].position).toBe(1)
    })
  })

  describe('moveCardToListEnd', () => {
    it('appends card to the end of the target list', () => {
      const result = moveCardToListEnd(mockCards, card1Id, listBId)
      const listBCards = result.filter(
        (c) => c.listId === listBId && !c.archived,
      )
      expect(listBCards.map((c) => c._id)).toEqual([card3Id, card1Id])
      expect(listBCards[1].position).toBe(1)
    })

    it('does nothing if card is already in the target list', () => {
      const result = moveCardToListEnd(mockCards, card1Id, listAId)
      expect(result).toEqual(mockCards)
    })
  })

  describe('removeArchivedCard', () => {
    it('filters out the specified card', () => {
      const result = removeArchivedCard(mockCards, card1Id)
      expect(result.some((c) => c._id === card1Id)).toBe(false)
      expect(result.length).toBe(mockCards.length - 1)
    })
  })

  describe('groupCardLabelsByCard & groupCardAssigneesByCard', () => {
    it('groups labels by cardId', () => {
      const label1: LabelDoc = {
        _id: 'l1' as Id<'labels'>,
        _creationTime: 100,
        boardId,
        name: 'Urgent',
        color: 'red',
      }
      const label2: LabelDoc = {
        _id: 'l2' as Id<'labels'>,
        _creationTime: 101,
        boardId,
        name: 'Feature',
        color: 'blue',
      }

      const grouped = groupCardLabelsByCard([
        { cardId: card1Id, label: label1 },
        { cardId: card1Id, label: label2 },
      ])

      expect(grouped[card1Id]).toEqual([label1, label2])
      expect(grouped[card2Id]).toBeUndefined()
    })

    it('groups assignees by cardId', () => {
      const user: BoardMemberUser = {
        userId: 'u1',
        name: 'Alice Cooper',
        email: 'alice@example.com',
        isOwner: true,
      }

      const grouped = groupCardAssigneesByCard([{ cardId: card1Id, user }])

      expect(grouped[card1Id]).toEqual([user])
    })

    it('groups comment counts by cardId', () => {
      const grouped = groupCardCommentCountsByCard([
        { cardId: card1Id, count: 5 },
      ])
      expect(grouped[card1Id]).toBe(5)
    })
  })

  describe('getCardFeedItems', () => {
    it('combines comments and activities, sorted newest first', () => {
      const comment: EnrichedComment = {
        _id: 'c1' as Id<'comments'>,
        _creationTime: 500,
        cardId: card1Id,
        authorId: 'u1',
        body: 'Hello',
        author: {
          userId: 'u1',
          name: 'Alice',
          email: 'alice@example.com',
          isOwner: false,
        },
      }
      const activity: EnrichedActivityDoc = {
        _id: 'a1' as Id<'activity'>,
        _creationTime: 600,
        boardId,
        actorId: 'u1',
        type: 'card_created',
        payload: { cardId: card1Id, title: 'Card 1' },
      }

      const feed = getCardFeedItems(
        [comment],
        [activity],
        card1Id,
        'Card 1',
        true,
      )
      expect(feed.length).toBe(2)
      expect(feed[0].kind).toBe('activity')
      expect(feed[1].kind).toBe('comment')
    })
  })

  describe('getInitials', () => {
    it('extracts two letter initials from multiple words', () => {
      expect(getInitials('John Doe')).toBe('JD')
      expect(getInitials('John')).toBe('JO')
      expect(getInitials('')).toBe('?')
    })
  })

  describe('formatActivityMessage & formatCardActivityMessage', () => {
    it('formats board creation and card rename', () => {
      const act1: EnrichedActivityDoc = {
        _id: 'a1' as Id<'activity'>,
        _creationTime: 100,
        boardId,
        actorId: 'u1',
        type: 'board_created',
        payload: { boardName: 'My Board' },
      }
      expect(formatActivityMessage(act1)).toBe('created board "My Board"')

      const act2: EnrichedActivityDoc = {
        _id: 'a2' as Id<'activity'>,
        _creationTime: 100,
        boardId,
        actorId: 'u1',
        type: 'card_renamed',
        payload: { oldTitle: 'Old', newTitle: 'New' },
      }
      expect(formatCardActivityMessage(act2)).toBe(
        'renamed this card from "Old" to "New"',
      )
    })
  })
})
