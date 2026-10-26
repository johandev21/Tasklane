import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { QueryKey } from '@tanstack/react-query'
import { queryKeys } from './query-keys.ts'
import type { BoardResource } from './query-keys.ts'

interface BoardMutationOptions<TVariables, TResult, TCache> {
  boardId: string
  mutationFn: (variables: TVariables) => Promise<TResult>
  resources: readonly BoardResource[]
  optimistic?: {
    queryKey: QueryKey
    update: (data: TCache, variables: TVariables) => TCache
  }
}

export function useBoardMutation<TVariables, TResult, TCache = never>(
  options: BoardMutationOptions<TVariables, TResult, TCache>,
) {
  const client = useQueryClient()
  const mutationKey = queryKeys.board(options.boardId)
  return useMutation({
    mutationKey,
    scope: { id: `board:${options.boardId}` },
    networkMode: 'always',
    mutationFn: options.mutationFn,
    onMutate: async (variables) => {
      if (!options.optimistic) return
      const { queryKey, update } = options.optimistic
      await client.cancelQueries({ queryKey })
      const previous = client.getQueryData<TCache>(queryKey)
      if (previous === undefined) return
      const optimistic = client.setQueryData<TCache>(
        queryKey,
        update(previous, variables),
      )
      return { previous, optimistic }
    },
    onError: (_error, _variables, snapshot) => {
      if (!options.optimistic || !snapshot) return
      const { queryKey } = options.optimistic
      // A later edit owns the cache until the last mutation reconciles with the server.
      if (client.getQueryData(queryKey) === snapshot.optimistic) {
        client.setQueryData(queryKey, snapshot.previous)
      }
    },
    onSettled: async () => {
      await Promise.all([
        ...options.resources.map((resource) =>
          client.invalidateQueries({
            queryKey: queryKeys.resource(options.boardId, resource),
            refetchType: 'none',
          }),
        ),
        client.invalidateQueries({
          queryKey: queryKeys.boards,
          refetchType: 'none',
        }),
      ])
      if (client.isMutating({ mutationKey }) === 1) {
        await Promise.all([
          client.refetchQueries({
            queryKey: mutationKey,
            type: 'active',
            stale: true,
          }),
          client.refetchQueries({
            queryKey: queryKeys.boards,
            type: 'active',
            stale: true,
          }),
        ])
      }
    },
  }).mutateAsync
}
