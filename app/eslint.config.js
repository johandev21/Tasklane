// @ts-check

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
        'error',
        {
          patterns: [
            {
              group: [
                '#/components',
                '#/components/**',
                '@/components',
                '@/components/**',
                '#/hooks',
                '#/hooks/**',
                '@/hooks',
                '@/hooks/**',
                '#/lib',
                '#/lib/**',
                '@/lib',
                '@/lib/**',
              ],
              message:
                'Legacy bucket imports are deleted. Use #/features/*, #/shared/*, or #/app/* instead.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/shared/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['#/features/**', '#/routes/**', '#/app/**'],
              message:
                'shared/ must not depend on features/, routes/, or app/ layers.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/routes/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '#/features/*/components/**',
                '#/features/*/hooks/**',
                '#/features/*/utils/**',
              ],
              message:
                'Routes must import features only via their public barrel (#/features/<domain>).',
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
