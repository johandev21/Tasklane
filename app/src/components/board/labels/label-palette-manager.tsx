import { useState } from 'react'
import { Plus, Edit2, Trash2, Check, X, Palette, Loader2 } from 'lucide-react'
import { Button } from '#/components/ui/button.tsx'
import { Input } from '#/components/ui/input.tsx'
import { DeleteLabelDialog } from '../delete-label-dialog.tsx'
import { LABEL_COLOR_OPTIONS, getLabelColor } from './label-colors.ts'
import type { LabelColorKey } from './label-colors.ts'
import type { LabelDoc } from '../types.ts'

export interface LabelPaletteManagerProps {
  labels: LabelDoc[]
  isOwner: boolean
  onCreateLabel?: (name: string, color: string) => Promise<void> | void
  onUpdateLabel?: (
    labelId: LabelDoc['_id'],
    name?: string,
    color?: string,
  ) => Promise<void> | void
  onRemoveLabel?: (labelId: LabelDoc['_id']) => Promise<void> | void
}

export function LabelPaletteManager({
  labels,
  isOwner,
  onCreateLabel,
  onUpdateLabel,
  onRemoveLabel,
}: LabelPaletteManagerProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState<LabelColorKey>('blue')
  const [isCreatingSubmitting, setIsCreatingSubmitting] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [editingLabelId, setEditingLabelId] = useState<LabelDoc['_id'] | null>(
    null,
  )
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState<LabelColorKey>('blue')
  const [isEditingSubmitting, setIsEditingSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const [deletingLabel, setDeletingLabel] = useState<LabelDoc | null>(null)

  const handleStartEdit = (label: LabelDoc) => {
    setEditingLabelId(label._id)
    setEditName(label.name)
    setEditColor(label.color as LabelColorKey)
    setEditError(null)
  }

  const handleSaveEdit = async () => {
    if (!editingLabelId || !editName.trim()) return
    setIsEditingSubmitting(true)
    setEditError(null)
    try {
      await onUpdateLabel?.(editingLabelId, editName.trim(), editColor)
      setEditingLabelId(null)
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : 'Failed to update label',
      )
    } finally {
      setIsEditingSubmitting(false)
    }
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newLabelName.trim()
    if (!trimmed) return
    setIsCreatingSubmitting(true)
    setCreateError(null)
    try {
      await onCreateLabel?.(trimmed, newLabelColor)
      setNewLabelName('')
      setNewLabelColor('blue')
      setIsCreating(false)
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : 'Failed to create label',
      )
    } finally {
      setIsCreatingSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (deletingLabel) {
      await onRemoveLabel?.(deletingLabel._id)
      setDeletingLabel(null)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Header with Palette Count */}
        <div className="flex items-center justify-between gap-2 pb-2.5">
          <div className="flex items-center gap-2">
            <Palette className="size-4 text-primary" />
            <h3 className="font-heading text-sm font-semibold text-foreground">
              Board Label Palette
            </h3>
          </div>
          <span className="font-mono text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-muted border border-border/40">
            {labels.length} / 8 labels
          </span>
        </div>

        {/* Palette List */}
        <div className="flex flex-col gap-2">
          {labels.map((label) => {
            const colorDef = getLabelColor(label.color)
            const isEditing = editingLabelId === label._id

            if (isEditing) {
              return (
                <div
                  key={label._id}
                  className="flex flex-col gap-2.5 p-3 rounded-xl border border-ring bg-muted/30 shadow-xs"
                >
                  <div className="flex items-center gap-2">
                    <Input
                      aria-label={`Edit name for ${label.name}`}
                      autoFocus
                      value={editName}
                      onChange={(e) => {
                        setEditName(e.target.value)
                        setEditError(null)
                      }}
                      placeholder="Label name"
                      className="text-xs h-8 bg-background"
                      disabled={isEditingSubmitting}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleSaveEdit()
                        }
                        if (e.key === 'Escape') setEditingLabelId(null)
                      }}
                    />
                    <Button
                      size="icon-xs"
                      onClick={handleSaveEdit}
                      disabled={!editName.trim() || isEditingSubmitting}
                      title="Save changes"
                    >
                      {isEditingSubmitting ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Check className="size-3.5" />
                      )}
                    </Button>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      disabled={isEditingSubmitting}
                      onClick={() => setEditingLabelId(null)}
                      title="Cancel"
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>

                  {editError && (
                    <p className="text-xs text-destructive">{editError}</p>
                  )}

                  {/* Color swatches */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {LABEL_COLOR_OPTIONS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setEditColor(c.id)}
                        disabled={isEditingSubmitting}
                        className={`size-6 rounded-full ${c.dotClass} flex items-center justify-center transition-all cursor-pointer ${
                          editColor === c.id
                            ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110'
                            : 'opacity-70 hover:opacity-100 hover:scale-105'
                        }`}
                        title={c.name}
                      >
                        {editColor === c.id && (
                          <Check className="size-3 text-white stroke-[3]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )
            }

            return (
              <div
                key={label._id}
                className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border ${colorDef.borderClass} ${colorDef.bgClass} transition-all`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span
                    className={`text-sm font-semibold ${colorDef.textClass} break-all truncate`}
                  >
                    {label.name}
                  </span>
                </div>

                {isOwner && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      onClick={() => handleStartEdit(label)}
                      className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Edit label"
                    >
                      <Edit2 className="size-3.5" />
                    </Button>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      onClick={() => setDeletingLabel(label)}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                      title="Delete label"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            )
          })}

          {labels.length === 0 && (
            <div className="p-6 text-center text-xs sm:text-sm text-muted-foreground italic rounded-xl border border-dashed border-border/60">
              No labels in this board&apos;s palette yet.
            </div>
          )}
        </div>

        {/* Owner Creation Section */}
        {isOwner && (
          <div className="pt-2">
            {isCreating ? (
              <form
                onSubmit={handleCreateSubmit}
                className="flex flex-col gap-3 p-3.5 rounded-xl border border-border/80 bg-card shadow-xs"
              >
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  New Palette Label
                </div>

                <Input
                  aria-label="New label name"
                  autoFocus
                  placeholder="Label name (e.g. Urgent, Design, Backend)..."
                  value={newLabelName}
                  onChange={(e) => {
                    setNewLabelName(e.target.value)
                    setCreateError(null)
                  }}
                  disabled={isCreatingSubmitting}
                  required
                  minLength={1}
                  className="text-xs h-8 bg-background"
                />

                {createError && (
                  <p className="text-xs text-destructive">{createError}</p>
                )}

                {/* Swatches */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {LABEL_COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setNewLabelColor(c.id)}
                      disabled={isCreatingSubmitting}
                      className={`size-6 rounded-full ${c.dotClass} flex items-center justify-center transition-all cursor-pointer ${
                        newLabelColor === c.id
                          ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110'
                          : 'opacity-70 hover:opacity-100 hover:scale-105'
                      }`}
                      title={c.name}
                    >
                      {newLabelColor === c.id && (
                        <Check className="size-3 text-white stroke-[3]" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    type="submit"
                    disabled={!newLabelName.trim() || isCreatingSubmitting}
                    className="text-xs h-8"
                  >
                    {isCreatingSubmitting ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin mr-1.5" />
                        Creating...
                      </>
                    ) : (
                      'Create Label'
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    type="button"
                    disabled={isCreatingSubmitting}
                    onClick={() => {
                      setIsCreating(false)
                      setNewLabelName('')
                      setCreateError(null)
                    }}
                    className="text-xs h-8"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : labels.length < 8 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCreating(true)}
                className="w-full gap-1.5 border-dashed border-border/80 text-xs h-8"
              >
                <Plus className="size-3.5" />
                <span>Add palette label</span>
              </Button>
            ) : (
              <p className="text-xs text-center text-muted-foreground/80 italic">
                Maximum palette limit reached (8 / 8 labels).
              </p>
            )}
          </div>
        )}

        {!isOwner && (
          <p className="text-xs text-center text-muted-foreground/70 italic pt-1">
            The palette is managed by the board owner.
          </p>
        )}
      </div>

      {/* Delete Label Confirmation Dialog */}
      <DeleteLabelDialog
        label={deletingLabel}
        isOpen={Boolean(deletingLabel)}
        onClose={() => setDeletingLabel(null)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  )
}
