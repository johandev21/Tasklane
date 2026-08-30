//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  ...tanstackConfig,
  {
    rules: {
      'import/no-cycle': 'off',
      'import/order': 'off',
      'sort-imports': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/require-await': 'off',
      'pnpm/json-enforce-catalog': 'off',
      'no-restricted-imports': [
        'warn',
        {
          patterns: [
            {
              group: [
                '#/components/board',
                '#/components/board/**',
                '#/components/dashboard',
                '#/components/dashboard/**',
                '#/hooks/use-board-presence',
                '#/hooks/use-board-presence.ts',
              ],
              message:
                'Migrate to feature-first imports (#/features/board, #/features/dashboard).',
            },
          ],
        },
      ],
    },
  },
  {
    ignores: [
      'eslint.config.js',
      'prettier.config.js',
      'convex/_generated/**',
      'src/routeTree.gen.ts',
      'src/components/ui/**',
      'src/shared/components/ui/**',
      '.output/**',
      'dist/**',
      'dist-ssr/**',
    ],
  },
]
