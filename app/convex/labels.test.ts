import { describe, it, expect } from 'vitest'
import { convexTest } from 'convex-test'
import schema from './schema'
import { api } from './_generated/api'

describe('labels', () => {
  it('allows owner to create up to 8 palette labels and enforces the 8-label maximum limit', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Label Limit Board',
    })

    const paletteColors = [
      'red',
      'orange',
      'yellow',
      'green',
      'teal',
      'blue',
      'purple',
      'pink',
    ] as const

    // Create 8 labels
    for (let i = 0; i < 8; i++) {
      const labelId = await asAlice.mutation(api.labels.create, {
        boardId,
        name: `Label ${i + 1}`,
        color: paletteColors[i],
      })
      expect(labelId).toBeDefined()
    }

    const labels = await asAlice.query(api.labels.listByBoard, { boardId })
    expect(labels).toHaveLength(8)

    // Attempting to create a 9th label must throw
    await expect(
      asAlice.mutation(api.labels.create, {
        boardId,
        name: 'Label 9',
        color: 'red',
      }),
    ).rejects.toThrow('Board label palette limit reached (maximum 8 labels)')
  })

  it('rejects empty names and invalid colors', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Validation Board',
    })

    // Empty name
    await expect(
      asAlice.mutation(api.labels.create, {
        boardId,
        name: '   ',
        color: 'red',
      }),
    ).rejects.toThrow('Label name cannot be empty')

    // Invalid color
    await expect(
      asAlice.mutation(api.labels.create, {
        boardId,
        name: 'Invalid Color',
        color: 'neon-violet',
      }),
    ).rejects.toThrow('Invalid label color')
  })

  it('enforces RBAC: non-owners cannot manage palette, but can attach/remove on cards', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })
    const asBob = t.withIdentity({ tokenIdentifier: 'clerk|user_bob' })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Team Project',
    })

    // Add Bob as board member
    await t.run(async (ctx) => {
      await ctx.db.insert('boardMembers', {
        boardId,
        userId: 'clerk|user_bob',
      })
    })

    // Alice (Owner) creates a label
    const labelId = await asAlice.mutation(api.labels.create, {
      boardId,
      name: 'Frontend',
      color: 'blue',
    })

    // Bob (Member) attempts to create a label -> rejected
    await expect(
      asBob.mutation(api.labels.create, {
        boardId,
        name: 'Backend',
        color: 'green',
      }),
    ).rejects.toThrow(
      'Unauthorized: only the board owner can manage the label palette',
    )

    // Bob attempts to rename/recolor label -> rejected
    await expect(
      asBob.mutation(api.labels.update, {
        labelId,
        name: 'Hacked Name',
      }),
    ).rejects.toThrow(
      'Unauthorized: only the board owner can manage the label palette',
    )

    // Bob attempts to remove label -> rejected
    await expect(
      asBob.mutation(api.labels.remove, {
        labelId,
      }),
    ).rejects.toThrow(
      'Unauthorized: only the board owner can manage the label palette',
    )

    // Alice creates a list and card
    const listId = await asAlice.mutation(api.lists.create, {
      boardId,
      title: 'Sprint 1',
    })
    const cardId = await asAlice.mutation(api.cards.create, {
      listId,
      title: 'UI Design',
    })

    // Bob (Member) CAN attach and remove labels on cards
    await asBob.mutation(api.labels.addToCard, {
      cardId,
      labelId,
    })

    let cardLabels = await asBob.query(api.labels.listByCard, { cardId })
    expect(cardLabels).toHaveLength(1)
    expect(cardLabels[0].name).toBe('Frontend')

    await asBob.mutation(api.labels.removeFromCard, {
      cardId,
      labelId,
    })

    cardLabels = await asBob.query(api.labels.listByCard, { cardId })
    expect(cardLabels).toHaveLength(0)
  })

  it('propagates rename and recolor across all cards referencing the label', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Propagation Board',
    })
    const listId = await asAlice.mutation(api.lists.create, {
      boardId,
      title: 'Todo',
    })
    const card1Id = await asAlice.mutation(api.cards.create, {
      listId,
      title: 'First Task',
    })
    const card2Id = await asAlice.mutation(api.cards.create, {
      listId,
      title: 'Second Task',
    })

    const labelId = await asAlice.mutation(api.labels.create, {
      boardId,
      name: 'Bug',
      color: 'red',
    })

    // Attach label to both cards
    await asAlice.mutation(api.labels.addToCard, { cardId: card1Id, labelId })
    await asAlice.mutation(api.labels.addToCard, { cardId: card2Id, labelId })

    // Verify both cards reference 'Bug' / 'red'
    let boardCardLabels = await asAlice.query(
      api.labels.listCardLabelsForBoard,
      { boardId },
    )
    expect(boardCardLabels).toHaveLength(2)
    expect(boardCardLabels.every((l) => l.label.name === 'Bug')).toBe(true)
    expect(boardCardLabels.every((l) => l.label.color === 'red')).toBe(true)

    // Owner renames & recolors label to 'Defect' / 'orange'
    await asAlice.mutation(api.labels.update, {
      labelId,
      name: 'Defect',
      color: 'orange',
    })

    // Query card labels again: both cards reflect updated name and color immediately
    boardCardLabels = await asAlice.query(api.labels.listCardLabelsForBoard, {
      boardId,
    })
    expect(boardCardLabels).toHaveLength(2)
    expect(boardCardLabels.every((l) => l.label.name === 'Defect')).toBe(true)
    expect(boardCardLabels.every((l) => l.label.color === 'orange')).toBe(true)

    const card1Labels = await asAlice.query(api.labels.listByCard, {
      cardId: card1Id,
    })
    expect(card1Labels[0].name).toBe('Defect')
    expect(card1Labels[0].color).toBe('orange')
  })

  it('cascades deletion: deleting a palette label removes all card attachments', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Cascade Board',
    })
    const listId = await asAlice.mutation(api.lists.create, {
      boardId,
      title: 'Todo',
    })
    const cardId = await asAlice.mutation(api.cards.create, {
      listId,
      title: 'Task 1',
    })

    const labelId = await asAlice.mutation(api.labels.create, {
      boardId,
      name: 'Temporary',
      color: 'teal',
    })

    await asAlice.mutation(api.labels.addToCard, { cardId, labelId })

    // Verify attached
    let cardLabels = await asAlice.query(api.labels.listByCard, { cardId })
    expect(cardLabels).toHaveLength(1)

    // Delete label from palette
    await asAlice.mutation(api.labels.remove, { labelId })

    // Query card labels: attachment is gone
    cardLabels = await asAlice.query(api.labels.listByCard, { cardId })
    expect(cardLabels).toHaveLength(0)

    const boardCardLabels = await asAlice.query(
      api.labels.listCardLabelsForBoard,
      { boardId },
    )
    expect(boardCardLabels).toHaveLength(0)
  })

  it('writes activity rows for label_added and label_removed', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })

    const boardId = await asAlice.mutation(api.boards.create, {
      name: 'Audit Board',
    })
    const listId = await asAlice.mutation(api.lists.create, {
      boardId,
      title: 'Tasks',
    })
    const cardId = await asAlice.mutation(api.cards.create, {
      listId,
      title: 'Deploy Service',
    })

    const labelId = await asAlice.mutation(api.labels.create, {
      boardId,
      name: 'Ops',
      color: 'purple',
    })

    // Add label
    await asAlice.mutation(api.labels.addToCard, { cardId, labelId })

    // Remove label
    await asAlice.mutation(api.labels.removeFromCard, { cardId, labelId })

    const activities = await t.run(async (ctx) => {
      return await ctx.db
        .query('activity')
        .withIndex('by_boardId', (q) => q.eq('boardId', boardId))
        .collect()
    })

    const labelAddedAct = activities.find((a) => a.type === 'label_added')
    expect(labelAddedAct).toBeDefined()
    expect(labelAddedAct?.payload.labelName).toBe('Ops')
    expect(labelAddedAct?.payload.labelColor).toBe('purple')
    expect(labelAddedAct?.payload.title).toBe('Deploy Service')

    const labelRemovedAct = activities.find((a) => a.type === 'label_removed')
    expect(labelRemovedAct).toBeDefined()
    expect(labelRemovedAct?.payload.labelName).toBe('Ops')
    expect(labelRemovedAct?.payload.title).toBe('Deploy Service')
  })

  it('toggles labels on cards idempotently and rejects cross-board attachments', async () => {
    const t = convexTest(schema, import.meta.glob('./**/*.*s'))
    const asAlice = t.withIdentity({ tokenIdentifier: 'clerk|user_alice' })

    const board1 = await asAlice.mutation(api.boards.create, {
      name: 'Board 1',
    })
    const board2 = await asAlice.mutation(api.boards.create, {
      name: 'Board 2',
    })

    const list1 = await asAlice.mutation(api.lists.create, {
      boardId: board1,
      title: 'List 1',
    })
    const card1 = await asAlice.mutation(api.cards.create, {
      listId: list1,
      title: 'Card 1',
    })

    const label1 = await asAlice.mutation(api.labels.create, {
      boardId: board1,
      name: 'B1 Label',
      color: 'blue',
    })

    const label2 = await asAlice.mutation(api.labels.create, {
      boardId: board2,
      name: 'B2 Label',
      color: 'green',
    })

    // Cross-board attachment must fail
    await expect(
      asAlice.mutation(api.labels.addToCard, {
        cardId: card1,
        labelId: label2,
      }),
    ).rejects.toThrow('Label does not belong to this board')

    // Toggle on
    const isNowAttached1 = await asAlice.mutation(api.labels.toggleOnCard, {
      cardId: card1,
      labelId: label1,
    })
    expect(isNowAttached1).toBe(true)

    let cardLabels = await asAlice.query(api.labels.listByCard, {
      cardId: card1,
    })
    expect(cardLabels).toHaveLength(1)

    // Toggle off
    const isNowAttached2 = await asAlice.mutation(api.labels.toggleOnCard, {
      cardId: card1,
      labelId: label1,
    })
    expect(isNowAttached2).toBe(false)

    cardLabels = await asAlice.query(api.labels.listByCard, { cardId: card1 })
    expect(cardLabels).toHaveLength(0)
  })
})
