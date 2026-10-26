import { sql } from 'drizzle-orm'
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'
import { ACTIVITY_TYPES, LABEL_COLORS } from '../constants'
import { newId } from '../ids'

const id = () => text('id').primaryKey().$defaultFn(newId)
const createdAt = () => integer('created_at').notNull().$defaultFn(Date.now)
const authDate = (name: string) =>
  integer(name, { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date())

export const user = sqliteTable('user', {
  id: id(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' })
    .notNull()
    .default(false),
  image: text('image'),
  createdAt: authDate('created_at'),
  updatedAt: authDate('updated_at').$onUpdate(() => new Date()),
})

export const session = sqliteTable(
  'session',
  {
    id: id(),
    token: text('token').notNull().unique(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: authDate('created_at'),
    updatedAt: authDate('updated_at').$onUpdate(() => new Date()),
  },
  (table) => [index('session_by_user').on(table.userId)],
)

export const account = sqliteTable(
  'account',
  {
    id: id(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: integer('access_token_expires_at', {
      mode: 'timestamp_ms',
    }),
    refreshTokenExpiresAt: integer('refresh_token_expires_at', {
      mode: 'timestamp_ms',
    }),
    scope: text('scope'),
    password: text('password'),
    createdAt: authDate('created_at'),
    updatedAt: authDate('updated_at').$onUpdate(() => new Date()),
  },
  (table) => [
    index('account_by_user').on(table.userId),
    uniqueIndex('account_by_provider').on(table.providerId, table.accountId),
  ],
)

export const verification = sqliteTable(
  'verification',
  {
    id: id(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    createdAt: authDate('created_at'),
    updatedAt: authDate('updated_at').$onUpdate(() => new Date()),
  },
  (table) => [index('verification_by_identifier').on(table.identifier)],
)

export const boards = sqliteTable(
  'boards',
  {
    id: id(),
    createdAt: createdAt(),
    name: text('name').notNull(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [index('boards_by_owner').on(table.ownerId)],
)

export const boardMembers = sqliteTable(
  'board_members',
  {
    id: id(),
    createdAt: createdAt(),
    boardId: text('board_id')
      .notNull()
      .references(() => boards.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('board_members_by_board').on(table.boardId),
    index('board_members_by_user').on(table.userId),
    uniqueIndex('board_members_by_board_and_user').on(
      table.boardId,
      table.userId,
    ),
  ],
)

export const lists = sqliteTable(
  'lists',
  {
    id: id(),
    createdAt: createdAt(),
    boardId: text('board_id')
      .notNull()
      .references(() => boards.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    position: integer('position').notNull(),
  },
  (table) => [
    index('lists_by_board').on(table.boardId),
    index('lists_by_board_and_position').on(table.boardId, table.position),
    check('lists_position_nonnegative', sql`${table.position} >= 0`),
  ],
)

export const cards = sqliteTable(
  'cards',
  {
    id: id(),
    createdAt: createdAt(),
    // Deleting a list archives its cards; the board still owns their lifecycle.
    listId: text('list_id').references(() => lists.id, {
      onDelete: 'set null',
    }),
    boardId: text('board_id')
      .notNull()
      .references(() => boards.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    dueDate: integer('due_date'),
    position: integer('position').notNull(),
    archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
  },
  (table) => [
    index('cards_by_list').on(table.listId),
    index('cards_by_board').on(table.boardId),
    index('cards_by_list_and_position').on(table.listId, table.position),
    index('cards_by_board_and_archived').on(table.boardId, table.archived),
    check('cards_position_nonnegative', sql`${table.position} >= 0`),
    check(
      'active_cards_have_list',
      sql`${table.archived} = 1 OR ${table.listId} IS NOT NULL`,
    ),
  ],
)

export const labels = sqliteTable(
  'labels',
  {
    id: id(),
    createdAt: createdAt(),
    boardId: text('board_id')
      .notNull()
      .references(() => boards.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    color: text('color', { enum: LABEL_COLORS }).notNull(),
  },
  (table) => [
    index('labels_by_board').on(table.boardId),
    check(
      'labels_valid_color',
      sql`${table.color} IN ('red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink')`,
    ),
  ],
)

export const cardLabels = sqliteTable(
  'card_labels',
  {
    id: id(),
    createdAt: createdAt(),
    cardId: text('card_id')
      .notNull()
      .references(() => cards.id, { onDelete: 'cascade' }),
    labelId: text('label_id')
      .notNull()
      .references(() => labels.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('card_labels_by_card').on(table.cardId),
    index('card_labels_by_label').on(table.labelId),
    uniqueIndex('card_labels_by_card_and_label').on(
      table.cardId,
      table.labelId,
    ),
  ],
)

export const cardAssignees = sqliteTable(
  'card_assignees',
  {
    id: id(),
    createdAt: createdAt(),
    cardId: text('card_id')
      .notNull()
      .references(() => cards.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('card_assignees_by_card').on(table.cardId),
    index('card_assignees_by_user').on(table.userId),
    uniqueIndex('card_assignees_by_card_and_user').on(
      table.cardId,
      table.userId,
    ),
  ],
)

export const comments = sqliteTable(
  'comments',
  {
    id: id(),
    createdAt: createdAt(),
    cardId: text('card_id')
      .notNull()
      .references(() => cards.id, { onDelete: 'cascade' }),
    authorId: text('author_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
  },
  (table) => [
    index('comments_by_card').on(table.cardId, table.createdAt, table.id),
    index('comments_by_author').on(table.authorId),
  ],
)

export const activity = sqliteTable(
  'activity',
  {
    id: id(),
    createdAt: createdAt(),
    boardId: text('board_id')
      .notNull()
      .references(() => boards.id, { onDelete: 'cascade' }),
    actorId: text('actor_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    type: text('type', { enum: ACTIVITY_TYPES }).notNull(),
    payload: text('payload', { mode: 'json' })
      .$type<Record<string, unknown>>()
      .notNull(),
  },
  (table) => [
    index('activity_by_board').on(table.boardId, table.createdAt, table.id),
  ],
)

export const presence = sqliteTable(
  'presence',
  {
    id: id(),
    createdAt: createdAt(),
    boardId: text('board_id')
      .notNull()
      .references(() => boards.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    lastSeen: integer('last_seen').notNull(),
  },
  (table) => [
    index('presence_by_board').on(table.boardId),
    uniqueIndex('presence_by_board_and_user').on(table.boardId, table.userId),
    index('presence_by_last_seen').on(table.lastSeen),
  ],
)
