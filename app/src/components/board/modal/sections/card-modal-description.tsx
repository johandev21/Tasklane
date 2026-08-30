import { useState, useEffect, useRef } from 'react'
import {
  AlignLeft,
  PenLine,
  Eye,
  Bold,
  Italic,
  List,
  Code,
  Link2,
  Loader2,
} from 'lucide-react'
import { Button } from '#/components/ui/button.tsx'
import { MarkdownRenderer } from '../markdown-renderer.tsx'

export interface CardModalDescriptionProps {
  description: string
  onSaveDescription: (desc: string) => Promise<void> | void
}

export function CardModalDescription({
  description,
  onSaveDescription,
}: CardModalDescriptionProps) {
  const [desc, setDesc] = useState(description)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [mode, setMode] = useState<'write' | 'preview'>('write')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setDesc(description)
  }, [description])

  const handleSave = async () => {
    setIsSaving(true)
    setSaveError(null)
    try {
      await onSaveDescription(desc.trim())
      setIsEditing(false)
      setMode('write')
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Failed to save description',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setDesc(description)
    setSaveError(null)
    setIsEditing(false)
    setMode('write')
  }

  const insertMarkdown = (syntax: string, wrapper = false) => {
    if (!textareaRef.current) return
    const textarea = textareaRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = desc.substring(start, end)

    const replacement = wrapper
      ? `${syntax}${selected || 'text'}${syntax}`
      : `${syntax} ${selected}`

    const newText = desc.substring(0, start) + replacement + desc.substring(end)
    setDesc(newText)

    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(
        start + syntax.length,
        start + replacement.length - (wrapper ? syntax.length : 0),
      )
    }, 0)
  }

  return (
    <div className="flex flex-col gap-2.5">
      <DescriptionSectionHeader
        isEditing={isEditing}
        mode={mode}
        onSetMode={setMode}
      />

      {!isEditing ? (
        <DescriptionViewer
          description={desc}
          onStartEdit={() => setIsEditing(true)}
        />
      ) : (
        <DescriptionEditor
          desc={desc}
          mode={mode}
          isSaving={isSaving}
          saveError={saveError}
          textareaRef={textareaRef}
          onChangeDesc={(val) => {
            setDesc(val)
            setSaveError(null)
          }}
          onInsertMarkdown={insertMarkdown}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}
    </div>
  )
}

interface DescriptionSectionHeaderProps {
  isEditing: boolean
  mode: 'write' | 'preview'
  onSetMode: (mode: 'write' | 'preview') => void
}

function DescriptionSectionHeader({
  isEditing,
  mode,
  onSetMode,
}: DescriptionSectionHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <AlignLeft className="size-4 text-muted-foreground" />
        <span>Description</span>
      </h4>

      {isEditing && (
        <div className="flex items-center rounded-lg border border-border/60 bg-muted/40 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => onSetMode('write')}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
              mode === 'write'
                ? 'bg-background text-foreground shadow-2xs font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <PenLine className="size-3" />
            <span>Write</span>
          </button>
          <button
            type="button"
            onClick={() => onSetMode('preview')}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
              mode === 'preview'
                ? 'bg-background text-foreground shadow-2xs font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Eye className="size-3" />
            <span>Preview</span>
          </button>
        </div>
      )}
    </div>
  )
}

function DescriptionViewer({
  description,
  onStartEdit,
}: {
  description: string
  onStartEdit: () => void
}) {
  if (description.trim()) {
    return (
      <div
        onClick={onStartEdit}
        className="cursor-pointer rounded-xl border border-transparent hover:border-border/80 bg-muted/20 hover:bg-muted/40 p-3.5 text-sm sm:text-base leading-relaxed text-foreground transition-all"
        title="Click to edit description"
      >
        <MarkdownRenderer text={description} />
      </div>
    )
  }

  return (
    <div
      onClick={onStartEdit}
      className="cursor-pointer rounded-xl border border-dashed border-border/70 bg-muted/20 hover:bg-muted/50 p-4 text-sm text-muted-foreground transition-colors"
    >
      <p className="font-normal text-muted-foreground/80">
        Add a more detailed description, checklist, or context...
      </p>
    </div>
  )
}

interface DescriptionEditorProps {
  desc: string
  mode: 'write' | 'preview'
  isSaving: boolean
  saveError: string | null
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  onChangeDesc: (val: string) => void
  onInsertMarkdown: (syntax: string, wrapper?: boolean) => void
  onSave: () => void
  onCancel: () => void
}

function DescriptionEditor({
  desc,
  mode,
  isSaving,
  saveError,
  textareaRef,
  onChangeDesc,
  onInsertMarkdown,
  onSave,
  onCancel,
}: DescriptionEditorProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-card p-3 shadow-2xs">
      {mode === 'write' && <MarkdownToolbar onInsert={onInsertMarkdown} />}

      {mode === 'write' ? (
        <textarea
          aria-label="Card description"
          ref={textareaRef}
          autoFocus
          rows={5}
          placeholder="Write markdown notes, checklist items, acceptance criteria..."
          value={desc}
          onChange={(e) => onChangeDesc(e.target.value)}
          disabled={isSaving}
          className="w-full resize-y bg-transparent p-1 text-sm sm:text-base leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none break-words"
          dir="auto"
        />
      ) : (
        <div className="min-h-[110px] w-full p-2 text-sm sm:text-base leading-relaxed text-foreground break-words">
          {desc.trim() ? (
            <MarkdownRenderer text={desc} />
          ) : (
            <p className="text-muted-foreground italic text-sm">
              Nothing to preview.
            </p>
          )}
        </div>
      )}

      {saveError && (
        <p className="text-xs text-destructive px-1">{saveError}</p>
      )}

      <div className="flex items-center gap-2 pt-1 border-t border-border/40">
        <Button
          size="sm"
          onClick={onSave}
          disabled={isSaving}
          className="text-xs sm:text-sm h-8 px-3 cursor-pointer"
        >
          {isSaving ? (
            <>
              <Loader2 className="size-3.5 animate-spin mr-1.5" />
              Saving...
            </>
          ) : (
            'Save'
          )}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={isSaving}
          onClick={onCancel}
          className="text-xs sm:text-sm h-8 px-3 cursor-pointer"
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}

function MarkdownToolbar({
  onInsert,
}: {
  onInsert: (syntax: string, wrapper?: boolean) => void
}) {
  return (
    <div className="flex items-center gap-1.5 pb-1 border-b border-border/40 text-muted-foreground">
      <button
        type="button"
        onClick={() => onInsert('**', true)}
        className="p-1.5 rounded-md hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
        title="Bold"
      >
        <Bold className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onInsert('*', true)}
        className="p-1.5 rounded-md hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
        title="Italic"
      >
        <Italic className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onInsert('- ')}
        className="p-1.5 rounded-md hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
        title="Bullet List"
      >
        <List className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onInsert('`', true)}
        className="p-1.5 rounded-md hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
        title="Inline Code"
      >
        <Code className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onInsert('[link text](url)')}
        className="p-1.5 rounded-md hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
        title="Link"
      >
        <Link2 className="size-3.5" />
      </button>
    </div>
  )
}
