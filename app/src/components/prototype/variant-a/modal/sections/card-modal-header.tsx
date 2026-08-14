import { Archive, X } from 'lucide-react'
import { Button } from '#/components/ui/button'
import type { CardItem } from '#/components/prototype/types'

export interface CardModalHeaderProps {
  card: CardItem
  listTitle: string
  onArchive: () => void
  onClose: () => void
}

export function CardModalHeader({
  listTitle,
  onArchive,
  onClose,
}: CardModalHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
        <span>in list</span>
        <span className="font-semibold text-foreground bg-muted/60 px-2 py-0.5 rounded-md break-all text-xs">
          {listTitle}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={onArchive}
          className="gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted h-7 px-2.5"
        >
          <Archive className="size-3.5" />
          <span>Archive</span>
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground rounded-full size-7"
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  )
}
