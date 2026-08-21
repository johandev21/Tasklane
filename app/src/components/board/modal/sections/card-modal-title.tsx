import { useState, useEffect, useRef } from 'react'

export interface CardModalTitleProps {
  title: string
  onSaveTitle: (title: string) => void
}

export function CardModalTitle({ title, onSaveTitle }: CardModalTitleProps) {
  const [val, setVal] = useState(title)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setVal(title)
  }, [title])

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.max(36, textareaRef.current.scrollHeight)}px`
    }
  }

  useEffect(() => {
    adjustHeight()
  }, [val])

  const handleBlur = () => {
    const trimmed = val.trim()
    if (trimmed && trimmed !== title) {
      onSaveTitle(trimmed)
    } else {
      setVal(title)
    }
  }

  return (
    <div className="w-full">
      <textarea
        aria-label="Card title"
        ref={textareaRef}
        rows={1}
        value={val}
        onChange={(e) => {
          setVal(e.target.value)
          adjustHeight()
        }}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            textareaRef.current?.blur()
          }
          if (e.key === 'Escape') {
            setVal(title)
            textareaRef.current?.blur()
          }
        }}
        placeholder="Card title..."
        className="w-full resize-none overflow-hidden rounded-lg border border-transparent px-2.5 py-1.5 font-heading text-lg sm:text-xl font-bold tracking-tight text-foreground hover:bg-muted/50 focus:border-ring focus:bg-background focus:outline-none break-words leading-snug transition-colors"
        dir="auto"
      />
    </div>
  )
}
