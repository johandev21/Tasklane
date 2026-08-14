import { createFileRoute } from '@tanstack/react-router'
import { useBoardPrototypeState } from '#/components/prototype/use-board-prototype-state'
import { PrototypeSwitcher } from '#/components/prototype/prototype-switcher'
import { VariantA } from '#/components/prototype/variant-a'

export const Route = createFileRoute('/prototype/board')({
  component: PrototypeBoardPage,
})

function PrototypeBoardPage() {
  const actions = useBoardPrototypeState()

  return (
    <div className="relative min-h-screen bg-app-background text-foreground antialiased selection:bg-primary/10">
      {/* Active Prototype UI */}
      <VariantA actions={actions} />

      {/* Floating Prototype Helper Toolbar */}
      <PrototypeSwitcher actions={actions} />
    </div>
  )
}
