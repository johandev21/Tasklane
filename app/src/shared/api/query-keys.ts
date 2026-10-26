export const boardResources = [
  'board',
  'lists',
  'cards',
  'archivedCards',
  'labels',
  'cardLabels',
  'members',
  'assignees',
  'commentCounts',
  'activity',
  'comments',
  'cardActivity',
  'presence',
] as const

export type BoardResource = (typeof boardResources)[number]

export const queryKeys = {
  boards: ['boards'] as const,
  board: (boardId: string) => ['board', boardId] as const,
  resource: (boardId: string, resource: BoardResource) =>
    ['board', boardId, resource] as const,
}
