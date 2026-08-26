import { useEffect, useRef, useCallback } from 'react'

export interface UseInfiniteScrollOptions {
  onLoadMore: () => void
  canLoadMore: boolean
  isLoading?: boolean
  rootMargin?: string
  threshold?: number
  disabled?: boolean
}

export function useInfiniteScroll({
  onLoadMore,
  canLoadMore,
  isLoading = false,
  rootMargin = '150px',
  threshold = 0.05,
  disabled = false,
}: UseInfiniteScrollOptions) {
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0]
      if (target.isIntersecting && canLoadMore && !isLoading && !disabled) {
        onLoadMore()
      }
    },
    [canLoadMore, isLoading, disabled, onLoadMore],
  )

  useEffect(() => {
    const element = sentinelRef.current
    if (!element || disabled) return

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin,
      threshold,
    })

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [handleObserver, rootMargin, threshold, disabled])

  return { sentinelRef }
}
