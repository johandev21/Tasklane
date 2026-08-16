import { useState } from 'react'
import { Calendar, Clock, Flame, Plus, X } from 'lucide-react'
import { Button } from '#/components/ui/button.tsx'
import { Input } from '#/components/ui/input.tsx'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover.tsx'

export interface CardModalDueDateProps {
  dueDate?: number
  onUpdateDueDate: (dueDate: number | undefined) => void
}

function formatForInput(timestamp?: number): string {
  if (!timestamp) return ''
  try {
    const d = new Date(timestamp)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  } catch {
    return ''
  }
}

export function CardModalDueDate({
  dueDate,
  onUpdateDueDate,
}: CardModalDueDateProps) {
  const [isOpen, setIsOpen] = useState(false)
  const isOverdue = dueDate !== undefined && dueDate < Date.now()

  const handleInputChange = (val: string) => {
    if (!val) {
      onUpdateDueDate(undefined)
      return
    }
    const parsed = new Date(val).getTime()
    if (!Number.isNaN(parsed)) {
      onUpdateDueDate(parsed)
    }
  }

  const setPresetTomorrow = () => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(17, 0, 0, 0) // 5:00 PM tomorrow
    onUpdateDueDate(d.getTime())
    setIsOpen(false)
  }

  const setPresetNextWeek = () => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    d.setHours(17, 0, 0, 0) // 5:00 PM next week
    onUpdateDueDate(d.getTime())
    setIsOpen(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold text-muted-foreground block uppercase tracking-wider">
        Due Date
      </span>

      <div className="flex items-center gap-2 flex-wrap">
        <Popover modal={true} open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            {dueDate ? (
              <button
                type="button"
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                  isOverdue
                    ? 'bg-red-500/15 border-red-300 dark:border-red-800/80 text-red-600 dark:text-red-400 hover:bg-red-500/25'
                    : 'bg-muted/40 border-border/80 hover:bg-muted/80 text-foreground'
                }`}
              >
                <Clock className="size-3.5" />
                <span>
                  {new Date(dueDate).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {isOverdue && (
                  <span className="rounded-md bg-red-600 px-1.5 py-0.5 text-xs font-bold text-white uppercase flex items-center gap-0.5">
                    <Flame className="size-3" />
                    Overdue
                  </span>
                )}
              </button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-xl border-dashed border-border/80 hover:border-foreground/60 text-muted-foreground hover:text-foreground text-sm font-medium h-8 px-3 cursor-pointer"
              >
                <Plus className="size-3.5" />
                <Calendar className="size-3.5" />
                <span>Set due date</span>
              </Button>
            )}
          </PopoverTrigger>

          <PopoverContent
            align="start"
            className="w-80 p-4 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Calendar className="size-4 text-primary" />
                <span>Set Due Date & Time</span>
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded p-1 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="dueDateInput"
                className="text-xs text-muted-foreground"
              >
                Date & Time
              </label>
              <Input
                id="dueDateInput"
                type="datetime-local"
                value={formatForInput(dueDate)}
                onChange={(e) => handleInputChange(e.target.value)}
                className="h-9 text-sm bg-background"
              />
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-2 pt-1">
              <Button
                size="xs"
                variant="outline"
                type="button"
                onClick={setPresetTomorrow}
                className="flex-1 text-xs cursor-pointer"
              >
                Tomorrow 5 PM
              </Button>
              <Button
                size="xs"
                variant="outline"
                type="button"
                onClick={setPresetNextWeek}
                className="flex-1 text-xs cursor-pointer"
              >
                In 1 Week
              </Button>
            </div>

            {dueDate && (
              <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                <Button
                  size="xs"
                  variant="ghost"
                  type="button"
                  onClick={() => {
                    onUpdateDueDate(undefined)
                    setIsOpen(false)
                  }}
                  className="text-xs text-destructive hover:bg-destructive/10 h-7 px-2 cursor-pointer"
                >
                  Remove due date
                </Button>
                <Button
                  size="xs"
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-xs h-7 px-3 cursor-pointer"
                >
                  Done
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {dueDate && (
          <Button
            size="icon-xs"
            variant="ghost"
            type="button"
            onClick={() => onUpdateDueDate(undefined)}
            className="text-muted-foreground hover:text-destructive size-7 cursor-pointer"
            title="Clear due date"
          >
            <X className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}
