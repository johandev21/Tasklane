import { useState } from 'react'
import { Plus, Edit2, Trash2, Check, X, Palette, Loader2 } from 'lucide-react'
import { Button } from '#/shared/components/ui/button.tsx'
import { Input } from '#/shared/components/ui/input.tsx'
import { DeleteLabelDialog } from './delete-label-dialog.tsx'
import {
  LABEL_COLOR_OPTIONS,
  getLabelColor,
} from '#/features/board/utils/label-colors.ts'
import type {
  LabelColorKey,
  LabelColorDefinition,
} from '#/features/board/utils/label-colors.ts'
import type { LabelDoc } from '#/features/board/types/board.types.ts'

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

  const handleDeleteConfirm = async () => {
    if (deletingLabel) {
      await onRemoveLabel?.(deletingLabel._id)
      setDeletingLabel(null)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <LabelPaletteHeader count={labels.length} />

        <LabelPaletteList
          labels={labels}
          isOwner={isOwner}
          editingLabelId={editingLabelId}
          editName={editName}
          editColor={editColor}
          editError={editError}
          isEditingSubmitting={isEditingSubmitting}
          onStartEdit={handleStartEdit}
          onChangeEditName={(val) => {
            setEditName(val)
            setEditError(null)
          }}
          onChangeEditColor={setEditColor}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={() => setEditingLabelId(null)}
          onStartDelete={(label) => setDeletingLabel(label)}
        />

        <LabelPaletteCreateSection
          isOwner={isOwner}
          labelsCount={labels.length}
          onCreateLabel={onCreateLabel}
        />
      </div>

      <DeleteLabelDialog
        label={deletingLabel}
        isOpen={Boolean(deletingLabel)}
        onClose={() => setDeletingLabel(null)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  )
}

function LabelPaletteHeader({ count }: { count: number }) {
  return (
    <div className="flex items-center justify-between gap-2 pb-2.5">
      <div className="flex items-center gap-2">
        <Palette className="size-4 text-primary" />
        <h3 className="font-heading text-sm font-semibold text-foreground">
          Board Label Palette
        </h3>
      </div>
      <span className="font-mono text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-muted border border-border/40">
        {count} / 8 labels
      </span>
    </div>
  )
}

interface LabelPaletteListProps {
  labels: LabelDoc[]
  isOwner: boolean
  editingLabelId: LabelDoc['_id'] | null
  editName: string
  editColor: LabelColorKey
  editError: string | null
  isEditingSubmitting: boolean
  onStartEdit: (label: LabelDoc) => void
  onChangeEditName: (val: string) => void
  onChangeEditColor: (color: LabelColorKey) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onStartDelete: (label: LabelDoc) => void
}

function LabelPaletteList({
  labels,
  isOwner,
  editingLabelId,
  editName,
  editColor,
  editError,
  isEditingSubmitting,
  onStartEdit,
  onChangeEditName,
  onChangeEditColor,
  onSaveEdit,
  onCancelEdit,
  onStartDelete,
}: LabelPaletteListProps) {
  if (labels.length === 0) {
    return (
      <div className="p-6 text-center text-xs sm:text-sm text-muted-foreground italic rounded-xl border border-dashed border-border/60">
        No labels in this board&apos;s palette yet.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {labels.map((label) =>
        editingLabelId === label._id ? (
          <LabelPaletteEditor
            key={label._id}
            name={editName}
            color={editColor}
            error={editError}
            isSubmitting={isEditingSubmitting}
            onChangeName={onChangeEditName}
            onChangeColor={onChangeEditColor}
            onSave={onSaveEdit}
            onCancel={onCancelEdit}
          />
        ) : (
          <LabelPaletteRow
            key={label._id}
            label={label}
            isOwner={isOwner}
            onStartEdit={() => onStartEdit(label)}
            onStartDelete={() => onStartDelete(label)}
          />
        ),
      )}
    </div>
  )
}

interface LabelPaletteRowProps {
  label: LabelDoc
  isOwner: boolean
  onStartEdit: () => void
  onStartDelete: () => void
}

function LabelPaletteRow({
  label,
  isOwner,
  onStartEdit,
  onStartDelete,
}: LabelPaletteRowProps) {
  const colorDef = getLabelColor(label.color)

  return (
    <div
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
            onClick={onStartEdit}
            className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
            title="Edit label"
          >
            <Edit2 className="size-3.5" />
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={onStartDelete}
            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
            title="Delete label"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}

interface LabelPaletteEditorProps {
  name: string
  color: LabelColorKey
  error: string | null
  isSubmitting: boolean
  onChangeName: (val: string) => void
  onChangeColor: (color: LabelColorKey) => void
  onSave: () => void
  onCancel: () => void
}

function LabelPaletteEditor({
  name,
  color,
  error,
  isSubmitting,
  onChangeName,
  onChangeColor,
  onSave,
  onCancel,
}: LabelPaletteEditorProps) {
  return (
    <div className="flex flex-col gap-2.5 p-3 rounded-xl border border-ring bg-muted/30 shadow-xs">
      <div className="flex items-center gap-2">
        <Input
          aria-label="Edit label name"
          autoFocus
          value={name}
          onChange={(e) => onChangeName(e.target.value)}
          placeholder="Label name"
          className="text-xs h-8 bg-background"
          disabled={isSubmitting}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onSave()
            }
            if (e.key === 'Escape') onCancel()
          }}
        />
        <Button
          size="icon-xs"
          onClick={onSave}
          disabled={!name.trim() || isSubmitting}
          title="Save changes"
        >
          {isSubmitting ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Check className="size-3.5" />
          )}
        </Button>
        <Button
          size="icon-xs"
          variant="ghost"
          disabled={isSubmitting}
          onClick={onCancel}
          title="Cancel"
        >
          <X className="size-3.5" />
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <ColorSwatchPicker
        selectedColor={color}
        disabled={isSubmitting}
        onSelectColor={onChangeColor}
      />
    </div>
  )
}

interface LabelPaletteCreateSectionProps {
  isOwner: boolean
  labelsCount: number
  onCreateLabel?: (name: string, color: string) => Promise<void> | void
}

function LabelPaletteCreateSection({
  isOwner,
  labelsCount,
  onCreateLabel,
}: LabelPaletteCreateSectionProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState<LabelColorKey>('blue')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  if (!isOwner) {
    return (
      <p className="text-xs text-center text-muted-foreground/70 italic pt-1">
        The palette is managed by the board owner.
      </p>
    )
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newLabelName.trim()
    if (!trimmed) return
    setIsSubmitting(true)
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
      setIsSubmitting(false)
    }
  }

  if (isCreating) {
    return (
      <form
        onSubmit={handleCreateSubmit}
        className="flex flex-col gap-3 p-3.5 rounded-xl border border-border/80 bg-card shadow-xs pt-2"
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
          disabled={isSubmitting}
          required
          minLength={1}
          className="text-xs h-8 bg-background"
        />

        {createError && (
          <p className="text-xs text-destructive">{createError}</p>
        )}

        <ColorSwatchPicker
          selectedColor={newLabelColor}
          disabled={isSubmitting}
          onSelectColor={setNewLabelColor}
        />

        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            type="submit"
            disabled={!newLabelName.trim() || isSubmitting}
            className="text-xs h-8"
          >
            {isSubmitting ? (
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
            disabled={isSubmitting}
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
    )
  }

  if (labelsCount < 8) {
    return (
      <div className="pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsCreating(true)}
          className="w-full gap-1.5 border-dashed border-border/80 text-xs h-8"
        >
          <Plus className="size-3.5" />
          <span>Add palette label</span>
        </Button>
      </div>
    )
  }

  return (
    <p className="text-xs text-center text-muted-foreground/80 italic pt-2">
      Maximum palette limit reached (8 / 8 labels).
    </p>
  )
}

function ColorSwatchPicker({
  selectedColor,
  disabled,
  onSelectColor,
}: {
  selectedColor: LabelColorKey
  disabled?: boolean
  onSelectColor: (color: LabelColorKey) => void
}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {LABEL_COLOR_OPTIONS.map((c: LabelColorDefinition) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onSelectColor(c.id)}
          disabled={disabled}
          className={`size-6 rounded-full ${c.dotClass} flex items-center justify-center transition-all cursor-pointer ${
            selectedColor === c.id
              ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110'
              : 'opacity-70 hover:opacity-100 hover:scale-105'
          }`}
          title={c.name}
        >
          {selectedColor === c.id && (
            <Check className="size-3 text-white stroke-[3]" />
          )}
        </button>
      ))}
    </div>
  )
}
