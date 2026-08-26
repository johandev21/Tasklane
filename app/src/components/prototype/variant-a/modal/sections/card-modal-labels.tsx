import { Tag, Check } from 'lucide-react'
import { LABEL_COLORS } from '../../constants'
import type { Label } from '#/components/prototype/types'

export interface CardModalLabelsProps {
  allLabels: Label[]
  cardLabels: Label[]
  onToggleLabel: (label: Label) => void
}

export function CardModalLabels({
  allLabels,
  cardLabels,
  onToggleLabel,
}: CardModalLabelsProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Tag className="size-3.5" />
          <span>Labels</span>
        </h4>
        <span className="text-xs text-muted-foreground font-mono">
          {cardLabels.length} active
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {allLabels.map((lbl) => {
          const colorDef = LABEL_COLORS[lbl.color]
          const isSelected = cardLabels.some((l) => l.id === lbl.id)

          return (
            <button
              key={lbl.id}
              type="button"
              onClick={() => onToggleLabel(lbl)}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm font-medium transition-colors max-w-full text-left ${
                isSelected
                  ? `${colorDef.badgeClass} font-semibold`
                  : 'border-border bg-card text-muted-foreground hover:text-foreground opacity-60'
              }`}
            >
              <span className="break-all">{lbl.name}</span>
              {isSelected && <Check className="size-3 shrink-0 ml-1" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
