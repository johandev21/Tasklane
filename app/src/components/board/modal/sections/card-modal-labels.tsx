import { Tag, Plus, Check } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover.tsx'
import { Button } from '#/components/ui/button.tsx'
import { getLabelColor } from '../../labels/label-colors.ts'
import { LabelPaletteManager } from '../../labels/label-palette-manager.tsx'
import type { LabelDoc } from '../../types.ts'

export interface CardModalLabelsProps {
  boardLabels: LabelDoc[]
  cardLabels: LabelDoc[]
  isOwner: boolean
  onToggleLabel: (label: LabelDoc) => void
  onCreateLabel?: (name: string, color: string) => Promise<void> | void
  onUpdateLabel?: (
    labelId: LabelDoc['_id'],
    name?: string,
    color?: string,
  ) => Promise<void> | void
  onRemoveLabel?: (labelId: LabelDoc['_id']) => Promise<void> | void
}

export function CardModalLabels({
  boardLabels,
  cardLabels,
  isOwner,
  onToggleLabel,
  onCreateLabel,
  onUpdateLabel,
  onRemoveLabel,
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
        {cardLabels.map((lbl) => {
          const colorDef = getLabelColor(lbl.color)

          return (
            <button
              key={lbl._id}
              type="button"
              onClick={() => onToggleLabel(lbl)}
              className={`group flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm font-semibold transition-all max-w-full text-left cursor-pointer ${colorDef.badgeClass} ring-1 ring-ring/30 hover:opacity-80`}
              title="Click to remove from card"
            >
              <span
                className={`size-2 rounded-full ${colorDef.dotClass} shrink-0`}
              />
              <span className="break-all">{lbl.name}</span>
              <Check className="size-3 shrink-0 ml-0.5 opacity-70 group-hover:hidden" />
              <span className="hidden group-hover:inline text-xs font-bold shrink-0 ml-0.5">
                ×
              </span>
            </button>
          )
        })}

        {/* Add / Manage Labels Popover Trigger */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-lg border-dashed border-border/80 text-muted-foreground hover:text-foreground text-xs h-7 px-2.5"
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
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-all text-left cursor-pointer ${
                      isSelected
                        ? `${colorDef.badgeClass} font-semibold ring-1 ring-inset ring-foreground/25 shadow-2xs`
                        : 'hover:bg-muted/70 text-foreground border border-border/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span
                        className={`size-2.5 rounded-full ${colorDef.dotClass} shrink-0`}
                      />
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

            {/* Palette Manager Drawer/Section inside popover for Owner */}
            {isOwner && (
              <div className="pt-2 border-t border-border/40">
                <LabelPaletteManager
                  labels={boardLabels}
                  isOwner={isOwner}
                  onCreateLabel={onCreateLabel}
                  onUpdateLabel={onUpdateLabel}
                  onRemoveLabel={onRemoveLabel}
                />
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
