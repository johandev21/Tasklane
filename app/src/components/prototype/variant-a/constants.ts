import type { LabelColorId, ActivityVerb } from '../types'

export interface LabelColorDefinition {
  id: LabelColorId
  name: string
  bgClass: string
  textClass: string
  borderClass: string
  badgeClass: string
  dotClass: string
  hex: string
}

export const LABEL_COLORS: Record<LabelColorId, LabelColorDefinition> = {
  red: {
    id: 'red',
    name: 'Red',
    bgClass: 'bg-red-500/15',
    textClass: 'text-red-700 dark:text-red-300',
    borderClass: 'border-red-300 dark:border-red-700/60',
    badgeClass:
      'bg-red-500/15 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700/60',
    dotClass: 'bg-red-500',
    hex: '#ef4444',
  },
  orange: {
    id: 'orange',
    name: 'Orange',
    bgClass: 'bg-orange-500/15',
    textClass: 'text-orange-700 dark:text-orange-300',
    borderClass: 'border-orange-300 dark:border-orange-700/60',
    badgeClass:
      'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700/60',
    dotClass: 'bg-orange-500',
    hex: '#f97316',
  },
  amber: {
    id: 'amber',
    name: 'Amber',
    bgClass: 'bg-amber-500/15',
    textClass: 'text-amber-700 dark:text-amber-300',
    borderClass: 'border-amber-300 dark:border-amber-700/60',
    badgeClass:
      'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700/60',
    dotClass: 'bg-amber-500',
    hex: '#f59e0b',
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald',
    bgClass: 'bg-emerald-500/15',
    textClass: 'text-emerald-700 dark:text-emerald-300',
    borderClass: 'border-emerald-300 dark:border-emerald-700/60',
    badgeClass:
      'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/60',
    dotClass: 'bg-emerald-500',
    hex: '#10b981',
  },
  sky: {
    id: 'sky',
    name: 'Sky',
    bgClass: 'bg-sky-500/15',
    textClass: 'text-sky-700 dark:text-sky-300',
    borderClass: 'border-sky-300 dark:border-sky-700/60',
    badgeClass:
      'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-700/60',
    dotClass: 'bg-sky-500',
    hex: '#0ea5e9',
  },
  indigo: {
    id: 'indigo',
    name: 'Indigo',
    bgClass: 'bg-indigo-500/15',
    textClass: 'text-indigo-700 dark:text-indigo-300',
    borderClass: 'border-indigo-300 dark:border-indigo-700/60',
    badgeClass:
      'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700/60',
    dotClass: 'bg-indigo-500',
    hex: '#6366f1',
  },
  rose: {
    id: 'rose',
    name: 'Rose',
    bgClass: 'bg-rose-500/15',
    textClass: 'text-rose-700 dark:text-rose-300',
    borderClass: 'border-rose-300 dark:border-rose-700/60',
    badgeClass:
      'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700/60',
    dotClass: 'bg-rose-500',
    hex: '#f43f5e',
  },
  slate: {
    id: 'slate',
    name: 'Slate',
    bgClass: 'bg-slate-500/15',
    textClass: 'text-slate-700 dark:text-slate-300',
    borderClass: 'border-slate-300 dark:border-slate-700/60',
    badgeClass:
      'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700/60',
    dotClass: 'bg-slate-500',
    hex: '#64748b',
  },
}

export const LABEL_COLOR_OPTIONS = Object.values(LABEL_COLORS)

export const ACTIVITY_VERB_FORMATTERS: Record<
  ActivityVerb,
  (target: string, details?: string) => string
> = {
  list_created: (t) => `created list "${t}"`,
  list_renamed: (t, d) => `renamed list to "${t}"${d ? ` (was "${d}")` : ''}`,
  list_deleted: (t) => `deleted list "${t}"`,
  card_created: (t) => `added card "${t}"`,
  card_moved: (t, d) => `moved "${t}"${d ? ` to ${d}` : ''}`,
  card_archived: (t) => `archived card "${t}"`,
  card_restored: (t) => `restored card "${t}"`,
  description_changed: (t) => `updated description for "${t}"`,
  label_added: (t, d) => `added label "${d}" to "${t}"`,
  label_removed: (t, d) => `removed label "${d}" from "${t}"`,
  due_date_changed: (t, d) =>
    d ? `set due date for "${t}" to ${d}` : `removed due date for "${t}"`,
  assignee_added: (t, d) => `assigned ${d} to "${t}"`,
  assignee_removed: (t, d) => `removed ${d} from "${t}"`,
  comment_added: (t) => `commented on "${t}"`,
  member_added: (t) => `invited ${t} to the board`,
  member_removed: (t) => `removed ${t} from the board`,
  board_renamed: (t) => `renamed board to "${t}"`,
}
