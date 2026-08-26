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
} from 'lucide-react'
import { Button } from '#/components/ui/button'
import { MarkdownRenderer } from '../markdown-renderer'

export interface CardModalDescriptionProps {
  description: string
  onSaveDescription: (desc: string) => void
}

export function CardModalDescription({
  description,
  onSaveDescription,
}: CardModalDescriptionProps) {
  const [desc, setDesc] = useState(description)
  const [isEditing, setIsEditing] = useState(false)
  const [mode, setMode] = useState<'write' | 'preview'>('write')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setDesc(description)
  }, [description])

  const handleSave = () => {
    onSaveDescription(desc.trim())
    setIsEditing(false)
    setMode('write')
  }

  const handleCancel = () => {
    setDesc(description)
    setIsEditing(false)
    setMode('write')
  }

  const insertMarkdown = (syntax: string, wrapper = false) => {
    if (!textareaRef.current) return
    const textarea = textareaRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = desc.substring(start, end)

    let replacement = ''
    if (wrapper) {
      replacement = `${syntax}${selected || 'text'}${syntax}`
    } else {
      replacement = `${syntax} ${selected}`
    }

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
    <div className="space-y-2.5">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <AlignLeft className="size-4 text-muted-foreground" />
          <span>Description</span>
        </h4>

        {isEditing && (
          <div className="flex items-center rounded-lg border border-border/60 bg-muted/40 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setMode('write')}
              className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
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
              onClick={() => setMode('preview')}
              className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
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

      {/* Display Mode (when not editing) */}
      {!isEditing ? (
        desc.trim() ? (
          <div
            onClick={() => setIsEditing(true)}
            className="cursor-pointer rounded-xl border border-transparent hover:border-border/80 bg-muted/20 hover:bg-muted/40 p-3.5 text-base leading-relaxed text-foreground transition-all"
            title="Click to edit description"
          >
            <MarkdownRenderer text={desc} />
          </div>
        ) : (
          <div
            onClick={() => setIsEditing(true)}
            className="cursor-pointer rounded-xl border border-dashed border-border/70 bg-muted/20 hover:bg-muted/50 p-4 text-sm text-muted-foreground transition-colors"
          >
            <p className="font-normal text-muted-foreground/80">
              Add a more detailed description, reproduction steps, or context...
            </p>
          </div>
        )
      ) : (
        /* Edit Mode */
        <div className="space-y-3 rounded-xl border border-border/80 bg-card p-3 shadow-2xs">
          {/* Markdown Formatting Quick Toolbar */}
          {mode === 'write' && (
            <div className="flex items-center gap-1.5 pb-1 text-muted-foreground">
              <button
                type="button"
                onClick={() => insertMarkdown('**', true)}
                className="p-1 rounded hover:bg-muted hover:text-foreground"
                title="Bold"
              >
                <Bold className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown('*', true)}
                className="p-1 rounded hover:bg-muted hover:text-foreground"
                title="Italic"
              >
                <Italic className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown('- ')}
                className="p-1 rounded hover:bg-muted hover:text-foreground"
                title="Bullet List"
              >
                <List className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown('`', true)}
                className="p-1 rounded hover:bg-muted hover:text-foreground"
                title="Code"
              >
                <Code className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown('[link title](url)')}
                className="p-1 rounded hover:bg-muted hover:text-foreground"
                title="Link"
              >
                <Link2 className="size-3.5" />
              </button>
            </div>
          )}

          {mode === 'write' ? (
            <textarea
              ref={textareaRef}
              autoFocus
              rows={5}
              placeholder="Write markdown notes, checklist items, acceptance criteria..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full resize-y bg-transparent p-1 text-base leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none break-all"
              dir="auto"
            />
          ) : (
            <div className="min-h-[110px] w-full p-2 text-base leading-relaxed text-foreground break-all">
              {desc.trim() ? (
                <MarkdownRenderer text={desc} />
              ) : (
                <p className="text-muted-foreground italic text-sm">
                  Nothing to preview.
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <Button size="sm" onClick={handleSave} className="text-sm h-8 px-3">
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              className="text-sm h-8 px-3"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
