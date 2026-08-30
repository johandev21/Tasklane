import { Calendar, Clock, Flame } from 'lucide-react'
import { Input } from '#/components/ui/input'
import { Button } from '#/components/ui/button'

export interface CardModalDueDateProps {
  dueDate?: string
  isOverdue?: boolean
  onUpdateDueDate: (date: string | undefined, overdue: boolean) => void
}

export function CardModalDueDate({
  dueDate,
  isOverdue,
  onUpdateDueDate,
}: CardModalDueDateProps) {
  const formatForInput = (iso?: string) => {
    if (!iso) return ''
    try {
      const d = new Date(iso)
      return d.toISOString().slice(0, 16) // YYYY-MM-DDTHH:mm
    } catch {
      return ''
    }
  }

  const handleChange = (val: string) => {
    if (!val) {
      onUpdateDueDate(undefined, false)
      return
    }
    try {
      const parsed = new Date(val).toISOString()
      const overdue = new Date(parsed).getTime() < Date.now()
      onUpdateDueDate(parsed, overdue)
    } catch {
      // ignore invalid input
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Calendar className="size-3.5" />
          <span>Due Date</span>
        </h4>
        {dueDate && isOverdue && (
          <span className="rounded bg-red-600 px-1.5 py-0.2 text-xs font-bold text-white uppercase flex items-center gap-0.5">
            <Flame className="size-3" />
            <span>Overdue</span>
          </span>
        )}
      </div>

      <div className="space-y-2">
        <Input
          type="datetime-local"
          value={formatForInput(dueDate)}
          onChange={(e) => handleChange(e.target.value)}
          className="h-8 text-sm bg-background"
        />

        {dueDate && (
          <div className="flex items-center justify-between text-sm pt-1">
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="size-3.5" />
              <span>
                {new Date(dueDate).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </span>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => onUpdateDueDate(undefined, false)}
              className="text-xs text-muted-foreground hover:text-destructive h-6 px-1.5"
            >
              Clear date
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
