export type LabelColorKey =
  'red' | 'orange' | 'yellow' | 'green' | 'teal' | 'blue' | 'purple' | 'pink'

export interface LabelColorDefinition {
  id: LabelColorKey
  name: string
  bgClass: string
  textClass: string
  borderClass: string
  badgeClass: string
  dotClass: string
  ringClass: string
  hex: string
}

export const LABEL_COLORS: Record<LabelColorKey, LabelColorDefinition> = {
  red: {
    id: 'red',
    name: 'Red',
    bgClass: 'bg-red-500/15',
    textClass: 'text-red-700 dark:text-red-300',
    borderClass: 'border-red-300 dark:border-red-700/60',
    badgeClass:
      'bg-red-500/15 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700/60',
    dotClass: 'bg-red-500',
    ringClass: 'ring-red-400 dark:ring-red-500',
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
    ringClass: 'ring-orange-400 dark:ring-orange-500',
    hex: '#f97316',
  },
  yellow: {
    id: 'yellow',
    name: 'Yellow',
    bgClass: 'bg-yellow-500/15',
    textClass: 'text-yellow-800 dark:text-yellow-300',
    borderClass: 'border-yellow-300 dark:border-yellow-700/60',
    badgeClass:
      'bg-yellow-500/15 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700/60',
    dotClass: 'bg-yellow-500',
    ringClass: 'ring-yellow-400 dark:ring-yellow-500',
    hex: '#eab308',
  },
  green: {
    id: 'green',
    name: 'Green',
    bgClass: 'bg-emerald-500/15',
    textClass: 'text-emerald-700 dark:text-emerald-300',
    borderClass: 'border-emerald-300 dark:border-emerald-700/60',
    badgeClass:
      'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/60',
    dotClass: 'bg-emerald-500',
    ringClass: 'ring-emerald-400 dark:ring-emerald-500',
    hex: '#10b981',
  },
  teal: {
    id: 'teal',
    name: 'Teal',
    bgClass: 'bg-teal-500/15',
    textClass: 'text-teal-700 dark:text-teal-300',
    borderClass: 'border-teal-300 dark:border-teal-700/60',
    badgeClass:
      'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-700/60',
    dotClass: 'bg-teal-500',
    ringClass: 'ring-teal-400 dark:ring-teal-500',
    hex: '#14b8a6',
  },
  blue: {
    id: 'blue',
    name: 'Blue',
    bgClass: 'bg-blue-500/15',
    textClass: 'text-blue-700 dark:text-blue-300',
    borderClass: 'border-blue-300 dark:border-blue-700/60',
    badgeClass:
      'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700/60',
    dotClass: 'bg-blue-500',
    ringClass: 'ring-blue-400 dark:ring-blue-500',
    hex: '#3b82f6',
  },
  purple: {
    id: 'purple',
    name: 'Purple',
    bgClass: 'bg-purple-500/15',
    textClass: 'text-purple-700 dark:text-purple-300',
    borderClass: 'border-purple-300 dark:border-purple-700/60',
    badgeClass:
      'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700/60',
    dotClass: 'bg-purple-500',
    ringClass: 'ring-purple-400 dark:ring-purple-500',
    hex: '#a855f7',
  },
  pink: {
    id: 'pink',
    name: 'Pink',
    bgClass: 'bg-pink-500/15',
    textClass: 'text-pink-700 dark:text-pink-300',
    borderClass: 'border-pink-300 dark:border-pink-700/60',
    badgeClass:
      'bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-300 dark:border-pink-700/60',
    dotClass: 'bg-pink-500',
    ringClass: 'ring-pink-400 dark:ring-pink-500',
    hex: '#ec4899',
  },
}

export const LABEL_COLOR_OPTIONS = Object.values(LABEL_COLORS)

export function getLabelColor(colorKey: string): LabelColorDefinition {
  const colors = LABEL_COLORS as Record<
    string,
    LabelColorDefinition | undefined
  >
  return colors[colorKey] ?? LABEL_COLORS.blue
}
