import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '#/components/ui/button.tsx'

export interface VariantOption {
  id: string
  label: string
}

interface PrototypeSwitcherProps {
  variants: VariantOption[]
  currentVariant: string
  onSelectVariant?: (id: string) => void
}

/**
 * Floating prototype variant switcher bar.
 * Enables quick switching between UI prototype variants via buttons or keyboard arrows.
 * Gated to non-production environments.
 */
export function PrototypeSwitcher({
  variants,
  currentVariant,
  onSelectVariant,
}: PrototypeSwitcherProps) {
  const navigate = useNavigate()

  const currentIndex = Math.max(
    0,
    variants.findIndex((v) => v.id === currentVariant),
  )

  const selectVariant = (id: string) => {
    if (onSelectVariant) {
      onSelectVariant(id)
      return
    }
    navigate({
      // @ts-expect-error search reducer on generic router
      search: (prev: Record<string, unknown>) => ({
        ...prev,
        variant: id,
      }),
      replace: true,
    })
  }

  const handlePrev = () => {
    const prevIndex = (currentIndex - 1 + variants.length) % variants.length
    selectVariant(variants[prevIndex].id)
  }

  const handleNext = () => {
    const nextIndex = (currentIndex + 1) % variants.length
    selectVariant(variants[nextIndex].id)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)

      if (isInput) return

      if (e.key === 'ArrowLeft') {
        handlePrev()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, variants])

  if (process.env.NODE_ENV === 'production') {
    return null
  }

  const currentOption = variants[currentIndex] || variants[0]

  return (
    <aside
      aria-label="Prototype Variant Switcher"
      className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border/80 bg-background/95 px-2 py-1.5 shadow-lg backdrop-blur-md"
    >
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={handlePrev}
        aria-label="Previous layout variant"
        className="rounded-full"
      >
        <ChevronLeft data-icon="inline-start" />
      </Button>

      <span className="px-2 text-xs font-medium text-foreground select-none">
        Variant {currentOption.id}: {currentOption.label}
      </span>

      <Button
        variant="ghost"
        size="icon-xs"
        onClick={handleNext}
        aria-label="Next layout variant"
        className="rounded-full"
      >
        <ChevronRight data-icon="inline-end" />
      </Button>
    </aside>
  )
}
