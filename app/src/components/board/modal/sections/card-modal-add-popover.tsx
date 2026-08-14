import { useState } from 'react'
import { Plus, Tag, ChevronLeft, Check } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover.tsx'
import { Button } from '#/components/ui/button.tsx'
import { getLabelColor } from '../../labels/label-colors.ts'
import { LabelPaletteManager } from '../../labels/label-palette-manager.tsx'
import type { LabelDoc } from '../../types.ts'

export interface CardModalAddPopoverProps {
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
  trigger?: React.ReactNode
}

export function CardModalAddPopover({
  boardLabels,
  cardLabels,
  isOwner,
  onToggleLabel,
  onCreateLabel,
  onUpdateLabel,
  onRemoveLabel,
  trigger,
}: CardModalAddPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentView, setCurrentView] = useState<'menu' | 'labels' | 'manage'>(
    'menu',
  )

  const handleOpenChange = (next: boolean) => {
    setIsOpen(next)
    if (!next) setCurrentView('menu')
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 rounded-lg text-xs font-medium h-8 px-3 shadow-2xs"
          >
            <Plus className="size-3.5" />
            <span>Add</span>
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-80 p-3.5 space-y-3 max-h-[var(--radix-popover-content-available-height,420px)] overflow-y-auto"
      >
        {/* Main Menu View */}
        {currentView === 'menu' && (
          <div className="space-y-1">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 pb-1">
              Add to card
            </div>

            <button
              type="button"
              onClick={() => setCurrentView('labels')}
              className="flex w-full items-start gap-3 rounded-xl p-2 text-left hover:bg-muted/70 transition-colors group cursor-pointer"
            >
              <div className="rounded-lg border border-border bg-muted/40 p-2 text-muted-foreground group-hover:text-foreground shrink-0 mt-0.5">
                <Tag className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">
                  Labels
                </div>
                <p className="text-xs text-muted-foreground leading-snug">
                  Apply color markers from board palette
                </p>
              </div>
            </button>
          </div>
        )}

        {/* Labels View */}
        {currentView === 'labels' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-1.5 pb-0.5 border-b border-border/40">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentView('menu')}
                  className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                  title="Back"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <div className="text-sm font-semibold text-foreground">
                  Labels
                </div>
              </div>

              {isOwner && (
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => setCurrentView('manage')}
                  className="text-xs h-7 text-primary"
                >
                  Manage palette
                </Button>
              )}
            </div>

            <div className="space-y-1.5 max-h-60 overflow-y-auto p-0.5">
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
                  No labels in this board&apos;s palette.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Manage Palette View */}
        {currentView === 'manage' && isOwner && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 pb-0.5 border-b border-border/40">
              <button
                type="button"
                onClick={() => setCurrentView('labels')}
                className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                title="Back to labels"
              >
                <ChevronLeft className="size-4" />
              </button>
              <div className="text-sm font-semibold text-foreground">
                Edit Board Palette
              </div>
            </div>

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
  )
}
