import { ChevronDown, Check, Archive, X } from 'lucide-react'
import { Button } from '#/components/ui/button.tsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu.tsx'
import type { ListDoc } from '../../types.ts'

export interface CardModalTopBarProps {
  currentList?: ListDoc
  allLists: ListDoc[]
  onMoveToList: (listId: ListDoc['_id']) => void
  onArchive: () => void
  onClose: () => void
}

export function CardModalTopBar({
  currentList,
  allLists,
  onMoveToList,
  onArchive,
  onClose,
}: CardModalTopBarProps) {
  return (
    <div className="flex items-center justify-between gap-3 bg-card px-5 pt-3 pb-2 shrink-0 select-none border-b border-border/40">
      {/* Left: List Switcher Dropdown */}
      <div className="flex items-center gap-2 min-w-0">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-muted/40 hover:bg-muted/80 px-2.5 py-1 text-sm font-medium text-foreground transition-colors max-w-[240px] truncate cursor-pointer"
              title="Change list"
            >
              <span className="truncate">{currentList?.title || 'List'}</span>
              <ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              Move to List
            </div>
            {allLists.map((l) => {
              const isSelected = l._id === currentList?._id
              return (
                <DropdownMenuItem
                  key={l._id}
                  onClick={() => onMoveToList(l._id)}
                  className="flex items-center justify-between text-sm cursor-pointer"
                >
                  <span className="truncate break-words">{l.title}</span>
                  {isSelected && (
                    <Check className="size-3.5 text-primary shrink-0 ml-1" />
                  )}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Right: Header Actions (Archive + Close) */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={onArchive}
          className="gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted h-8 px-2.5 cursor-pointer"
          title="Archive card"
        >
          <Archive className="size-4" />
          <span className="hidden sm:inline">Archive</span>
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground rounded-full size-8 cursor-pointer"
          title="Close dialog"
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  )
}
