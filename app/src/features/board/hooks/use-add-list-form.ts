import { useState } from 'react'
import type { FormEvent } from 'react'

export interface UseAddListFormResult {
  isAdding: boolean
  title: string
  isSubmitting: boolean
  error: string | null
  setIsAdding: (adding: boolean) => void
  setTitle: (title: string) => void
  reset: () => void
  handleSubmit: (e: FormEvent) => Promise<void>
}

export function useAddListForm(
  onAddList: (title: string) => void | Promise<void>,
): UseAddListFormResult {
  const [isAdding, setIsAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setError(null)
    setIsAdding(false)
    setTitle('')
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) {
      setError('List title is required')
      return
    }
    try {
      setIsSubmitting(true)
      setError(null)
      await onAddList(trimmed)
      setTitle('')
      setIsAdding(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add list')
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    isAdding,
    title,
    isSubmitting,
    error,
    setIsAdding,
    setTitle,
    reset,
    handleSubmit,
  }
}
