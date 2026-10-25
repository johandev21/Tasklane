import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.string(),
    imageUrl: v.optional(v.string()),
  })
    .index('by_tokenIdentifier', ['tokenIdentifier'])
    .index('by_email', ['email']),

  boards: defineTable({
    name: v.string(),
    ownerId: v.string(),
  }).index('by_ownerId', ['ownerId']),

  boardMembers: defineTable({
    boardId: v.id('boards'),
    userId: v.string(),
  })
    .index('by_boardId', ['boardId'])
    .index('by_userId', ['userId'])
    .index('by_board_and_user', ['boardId', 'userId']),

  lists: defineTable({
    boardId: v.id('boards'),
    title: v.string(),
    position: v.number(),
  })
    .index('by_boardId', ['boardId'])
    .index('by_board_and_position', ['boardId', 'position']),

  cards: defineTable({
    listId: v.id('lists'),
    boardId: v.id('boards'),
    title: v.string(),
    description: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    position: v.number(),
    archived: v.boolean(),
  })
    .index('by_listId', ['listId'])
    .index('by_boardId', ['boardId'])
    .index('by_list_and_position', ['listId', 'position'])
    .index('by_board_and_archived', ['boardId', 'archived']),

  labels: defineTable({
    boardId: v.id('boards'),
    name: v.string(),
    color: v.string(),
  }).index('by_boardId', ['boardId']),

  cardLabels: defineTable({
    cardId: v.id('cards'),
    labelId: v.id('labels'),
  })
    .index('by_cardId', ['cardId'])
    .index('by_labelId', ['labelId'])
    .index('by_card_and_label', ['cardId', 'labelId']),

  cardAssignees: defineTable({
    cardId: v.id('cards'),
    userId: v.string(),
  })
    .index('by_cardId', ['cardId'])
    .index('by_userId', ['userId'])
    .index('by_card_and_user', ['cardId', 'userId']),

  comments: defineTable({
    cardId: v.id('cards'),
    authorId: v.string(),
    body: v.string(),
  })
    .index('by_cardId', ['cardId'])
    .index('by_authorId', ['authorId']),

  activity: defineTable({
    boardId: v.id('boards'),
    actorId: v.string(),
    type: v.string(),
    payload: v.record(v.string(), v.any()),
  }).index('by_boardId', ['boardId']),

  presence: defineTable({
    boardId: v.id('boards'),
    userId: v.string(),
    lastSeen: v.number(),
  })
    .index('by_boardId', ['boardId'])
    .index('by_board_and_user', ['boardId', 'userId'])
    .index('by_lastSeen', ['lastSeen']),
})
