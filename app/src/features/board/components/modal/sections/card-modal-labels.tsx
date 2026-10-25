import { Tag, Plus, Check, X } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/shared/components/ui/popover.tsx'
import { Button } from '#/shared/components/ui/button.tsx'
import { getLabelColor } from '#/features/board/utils/label-colors.ts'
import type { LabelDoc } from '#/features/board/types/board.types.ts'

export interface CardModalLabelsProps {
  boardLabels: LabelDoc[]
  cardLabels: LabelDoc[]
  onToggleLabel: (label: LabelDoc) => void
}

export function CardModalLabels({
  boardLabels,
  cardLabels,
  onToggleLabel,
}: CardModalLabelsProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Tag className="size-3.5" />
          <span>Labels</span>
        </h4>
        <span className="text-xs text-muted-foreground font-mono">
          {cardLabels.length} active
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {cardLabels.map((lbl) => (
          <ActiveLabelBadge
            key={lbl._id}
            label={lbl}
            onToggle={() => onToggleLabel(lbl)}
          />
        ))}

        <CardLabelsTogglePopover
          boardLabels={boardLabels}
          cardLabels={cardLabels}
          onToggleLabel={onToggleLabel}
        />
      </div>
    </div>
  )
}

function ActiveLabelBadge({
  label,
  onToggle,
}: {
  label: LabelDoc
  onToggle: () => void
}) {
  const colorDef = getLabelColor(label.color)

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`group flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm font-semibold transition-colors max-w-full text-left cursor-pointer ${colorDef.badgeClass} hover:opacity-80`}
      title="Click to remove from card"
    >
      <span className="break-all">{label.name}</span>
      <span className="relative inline-flex items-center justify-center size-3.5 shrink-0 ml-0.5">
        <Check className="size-3.5 opacity-70 group-hover:opacity-0 transition-opacity" />
        <X className="size-3.5 absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      </span>
    </button>
  )
}

interface CardLabelsTogglePopoverProps {
  boardLabels: LabelDoc[]
  cardLabels: LabelDoc[]
  onToggleLabel: (label: LabelDoc) => void
}

function CardLabelsTogglePopover({
  boardLabels,
  cardLabels,
  onToggleLabel,
}: CardLabelsTogglePopoverProps) {
  return (
    <Popover modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 rounded-lg border-dashed border-border/80 text-muted-foreground hover:text-foreground text-xs h-7 px-2.5 cursor-pointer"
        >
          <Plus className="size-3.5" />
          <span>{cardLabels.length === 0 ? 'Add labels' : 'Edit'}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-80 p-3.5 space-y-3 max-h-[var(--radix-popover-content-available-height,420px)] overflow-y-auto"
      >
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-0.5">
          Toggle Labels on Card
        </div>

        <div className="space-y-1.5 max-h-56 overflow-y-auto p-0.5">
          {boardLabels.map((lbl) => {
            const colorDef = getLabelColor(lbl.color)
            const isSelected = cardLabels.some((l) => l._id === lbl._id)

            return (
              <button
                key={lbl._id}
                type="button"
                onClick={() => onToggleLabel(lbl)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors text-left cursor-pointer ${
                  isSelected
                    ? `border ${colorDef.badgeClass} font-semibold shadow-2xs`
                    : 'hover:bg-muted/70 text-foreground border border-border/40'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="truncate break-all">{lbl.name}</span>
                </div>
                {isSelected && (
                  <Check className="size-4 text-foreground shrink-0 ml-1.5" />
                )}
              </button>
            )
          })}

          {boardLabels.length === 0 && (
            <p className="text-xs text-muted-foreground italic py-3 text-center">
              No palette labels configured for this board yet.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
