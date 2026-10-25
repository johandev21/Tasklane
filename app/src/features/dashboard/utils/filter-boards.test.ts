import { describe, expect, it } from 'vitest'
import type { Id } from '../../../../convex/_generated/dataModel'
import { filterBoards } from './filter-boards.ts'
import type { BoardSummary } from '../types/dashboard.types.ts'

function createMockBoard(
  id: string,
  name: string,
  isOwner: boolean,
): BoardSummary {
  return {
    _id: id as Id<'boards'>,
    _creationTime: Date.now(),
    name,
    ownerId: isOwner ? 'user-1' : 'user-2',
    listsCount: 3,
    cardsCount: 5,
    memberCount: isOwner ? 1 : 2,
    isOwner,
  }
}

describe('filterBoards', () => {
  const mockBoards: BoardSummary[] = [
    createMockBoard('b1', 'Owned Board 1', true),
    createMockBoard('b2', 'Shared Board 1', false),
    createMockBoard('b3', 'Owned Board 2', true),
    createMockBoard('b4', 'Shared Board 2', false),
  ]

  it('returns all boards when filterMode is all', () => {
    const result = filterBoards(mockBoards, 'all')
    expect(result).toHaveLength(4)
    expect(result).toEqual(mockBoards)
  })

  it('returns only owned boards when filterMode is owned', () => {
    const result = filterBoards(mockBoards, 'owned')
    expect(result).toHaveLength(2)
    expect(result.every((b) => b.isOwner)).toBe(true)
    expect(result.map((b) => b._id)).toEqual(['b1', 'b3'])
  })

  it('returns only shared boards when filterMode is shared', () => {
    const result = filterBoards(mockBoards, 'shared')
    expect(result).toHaveLength(2)
    expect(result.every((b) => !b.isOwner)).toBe(true)
    expect(result.map((b) => b._id)).toEqual(['b2', 'b4'])
  })

  it('handles empty boards list gracefully', () => {
    expect(filterBoards([], 'all')).toEqual([])
    expect(filterBoards([], 'owned')).toEqual([])
    expect(filterBoards([], 'shared')).toEqual([])
  })
})
