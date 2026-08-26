import type { BoardData } from './types'

export const INITIAL_MOCK_BOARD: BoardData = {
  id: 'board-mobile-launch',
  title: 'Mobile App Launch',
  ownerId: 'user-priya',
  members: [
    {
      id: 'user-priya',
      name: 'Priya Sharma',
      email: 'priya@tasklane.dev',
      avatarUrl:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      initials: 'PS',
      color: 'bg-indigo-600',
      isOnline: true,
    },
    {
      id: 'user-marcus',
      name: 'Marcus Vance',
      email: 'marcus@tasklane.dev',
      avatarUrl:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
      initials: 'MV',
      color: 'bg-emerald-600',
      isOnline: true,
    },
    {
      id: 'user-ana',
      name: 'Ana Belmonte',
      email: 'ana@tasklane.dev',
      avatarUrl:
        'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80',
      initials: 'AB',
      color: 'bg-amber-600',
      isOnline: true,
    },
    {
      id: 'user-leo',
      name: 'Leo Thorne',
      email: 'leo@tasklane.dev',
      avatarUrl:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
      initials: 'LT',
      color: 'bg-rose-600',
      isOnline: false,
    },
  ],
  labels: [
    { id: 'lbl-content', name: 'Content', color: 'sky' },
    { id: 'lbl-engineering', name: 'Engineering', color: 'indigo' },
    { id: 'lbl-blocked', name: 'Blocked', color: 'red' },
    { id: 'lbl-marketing', name: 'Marketing', color: 'rose' },
    { id: 'lbl-design', name: 'Design', color: 'emerald' },
    { id: 'lbl-ops', name: 'Ops', color: 'slate' },
    { id: 'lbl-research', name: 'Research', color: 'amber' },
    { id: 'lbl-security', name: 'Security', color: 'orange' },
  ],
  lists: [
    {
      id: 'list-backlog',
      boardId: 'board-mobile-launch',
      title: 'Backlog',
      order: 0,
      cardIds: ['card-onboarding', 'card-deep-link', 'card-beta-triage'],
    },
    {
      id: 'list-in-progress',
      boardId: 'board-mobile-launch',
      title: 'In Progress',
      order: 1,
      cardIds: ['card-push-notifs', 'card-press-kit'],
    },
    {
      id: 'list-done',
      boardId: 'board-mobile-launch',
      title: 'Done',
      order: 2,
      cardIds: ['card-design-tokens', 'card-auth-flow'],
    },
  ],
  cards: {
    'card-onboarding': {
      id: 'card-onboarding',
      listId: 'list-backlog',
      title: 'Finalize onboarding copy',
      description:
        'Review the welcome screens and permissions explanatory text. Ensure tone is calm, concise, and aligned with design guidelines.\n\n- [ ] Screen 1: Welcome value proposition\n- [ ] Screen 2: Realtime sync primer\n- [ ] Screen 3: Notification permission request',
      labels: [{ id: 'lbl-content', name: 'Content', color: 'sky' }],
      assigneeIds: ['user-priya'],
      dueDate: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago (overdue)
      isOverdue: true,
      comments: [
        {
          id: 'cm-1',
          memberId: 'user-priya',
          text: 'Drafted the first pass in Figma. Need Ana to review the marketing copy alignment.',
          createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        },
      ],
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    },
    'card-deep-link': {
      id: 'card-deep-link',
      listId: 'list-backlog',
      title: 'Deep-link handling',
      description:
        'Handle universal links for `tasklane.app/board/:id` and ensure navigation restores route state when cold-booting on mobile devices.',
      labels: [{ id: 'lbl-engineering', name: 'Engineering', color: 'indigo' }],
      assigneeIds: ['user-marcus'],
      comments: [
        {
          id: 'cm-dl-1',
          memberId: 'user-marcus',
          text: 'Verified URL scheme routing in iOS simulator with custom URL handler.',
          createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        },
        {
          id: 'cm-dl-2',
          memberId: 'user-priya',
          text: 'Make sure fallback to web browser works when app is not installed.',
          createdAt: new Date(Date.now() - 86400000 * 1.5).toISOString(),
        },
        {
          id: 'cm-dl-3',
          memberId: 'user-marcus',
          text: 'Added universal link `apple-app-site-association` file to root static assets.',
          createdAt: new Date(Date.now() - 86400000 * 0.5).toISOString(),
        },
      ],
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 0.5).toISOString(),
    },
    'card-beta-triage': {
      id: 'card-beta-triage',
      listId: 'list-backlog',
      title: 'Beta feedback triage',
      description:
        'Weekly review of customer feedback tickets gathered from the TestFlight and Play Store internal tracks.',
      labels: [],
      assigneeIds: [],
      comments: [
        {
          id: 'cm-bt-1',
          memberId: 'user-ana',
          text: 'Aggregated 14 survey responses into the research repo. Overall sentiment is 4.8/5.',
          createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
        },
      ],
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    },
    'card-push-notifs': {
      id: 'card-push-notifs',
      listId: 'list-in-progress',
      title: 'Push-notification permissions',
      description:
        'Implement native permission prompt trigger only after user attempts to invite a member or toggle live sync.',
      labels: [
        { id: 'lbl-engineering', name: 'Engineering', color: 'indigo' },
        { id: 'lbl-blocked', name: 'Blocked', color: 'red' },
      ],
      assigneeIds: ['user-marcus', 'user-ana'],
      comments: [
        {
          id: 'cm-pn-1',
          memberId: 'user-marcus',
          text: 'Currently blocked on Apple Developer provisioning profile renewal.',
          createdAt: new Date(Date.now() - 86400000 * 0.8).toISOString(),
        },
      ],
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 0.8).toISOString(),
    },
    'card-press-kit': {
      id: 'card-press-kit',
      listId: 'list-in-progress',
      title: 'Press kit assets',
      description:
        'High-resolution screenshots, app icon badges, product brief PDF, and founder photos in dark/light mode.',
      labels: [{ id: 'lbl-marketing', name: 'Marketing', color: 'rose' }],
      assigneeIds: ['user-ana'],
      dueDate: new Date(Date.now() + 86400000 * 2).toISOString(), // in 2 days
      isOverdue: false,
      comments: [],
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 0.4).toISOString(),
    },
    'card-design-tokens': {
      id: 'card-design-tokens',
      listId: 'list-done',
      title: 'Design tokens',
      description:
        'Clean token system defined with HSL tailored colors for background, surface cards, borders, typography, and the 8 functional label colors.',
      labels: [{ id: 'lbl-design', name: 'Design', color: 'emerald' }],
      assigneeIds: ['user-leo'],
      comments: [
        {
          id: 'cm-dt-1',
          memberId: 'user-leo',
          text: 'Merged into main branch with full Tailwind v4 theme variables.',
          createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        },
      ],
      createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
    'card-auth-flow': {
      id: 'card-auth-flow',
      listId: 'list-done',
      title: 'Auth flow',
      description:
        'Clerk authentication integration with isomorphic session hydration on TanStack Start SSR routes.',
      labels: [
        { id: 'lbl-engineering', name: 'Engineering', color: 'indigo' },
        { id: 'lbl-content', name: 'Content', color: 'sky' },
      ],
      assigneeIds: ['user-marcus', 'user-priya'],
      comments: [],
      createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
  },
  archivedCardIds: [],
  activity: [
    {
      id: 'act-1',
      actorId: 'user-priya',
      type: 'board_renamed',
      targetTitle: 'Mobile App Launch',
      createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    },
    {
      id: 'act-2',
      actorId: 'user-priya',
      type: 'member_added',
      targetTitle: 'Marcus Vance',
      createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    },
    {
      id: 'act-3',
      actorId: 'user-priya',
      type: 'member_added',
      targetTitle: 'Ana Belmonte',
      createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    },
    {
      id: 'act-4',
      actorId: 'user-priya',
      type: 'member_added',
      targetTitle: 'Leo Thorne',
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
    {
      id: 'act-5',
      actorId: 'user-marcus',
      type: 'card_created',
      targetTitle: 'Deep-link handling',
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    },
    {
      id: 'act-6',
      actorId: 'user-leo',
      type: 'card_moved',
      targetTitle: 'Design tokens',
      details: 'Done',
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
    {
      id: 'act-7',
      actorId: 'user-ana',
      type: 'due_date_changed',
      targetTitle: 'Press kit assets',
      details: 'in 2 days',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'act-8',
      actorId: 'user-marcus',
      type: 'label_added',
      targetTitle: 'Push-notification permissions',
      details: 'Blocked',
      createdAt: new Date(Date.now() - 86400000 * 0.8).toISOString(),
    },
  ],
}
