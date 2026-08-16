import { useState, useMemo } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { MessageSquare, Edit2, Trash2, Loader2 } from 'lucide-react'
import { Button } from '#/components/ui/button.tsx'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar.tsx'
import { useInfiniteScroll } from '#/hooks/use-infinite-scroll.ts'
import { DeleteCommentDialog } from './delete-comment-dialog.tsx'
import type {
  BoardMemberUser,
  CardDoc,
  CommentDoc,
  EnrichedActivityDoc,
  EnrichedComment,
} from '../../types.ts'

export interface CardModalCommentsProps {
  cardId: CardDoc['_id']
  cardTitle: string
  comments: EnrichedComment[]
  activities?: EnrichedActivityDoc[]
  currentUserId?: string
  currentUserProfile?: BoardMemberUser | null
  onAddComment: (body: string) => Promise<void> | void
  onUpdateComment: (
    commentId: CommentDoc['_id'],
    body: string,
  ) => Promise<void> | void
  onDeleteComment: (commentId: CommentDoc['_id']) => Promise<void> | void
  commentsStatus?:
    'CanLoadMore' | 'LoadingFirstPage' | 'LoadingMore' | 'Exhausted'
  isCommentsLoading?: boolean
  onLoadMoreComments?: (numItems: number) => void
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0 || !parts[0]) return '?'
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatRelativeTime(timestamp: number): string {
  try {
    const diffMs = Date.now() - timestamp
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'just now'
    if (diffMins === 1) return '1 minute ago'
    if (diffMins < 60) return `${diffMins} minutes ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours === 1) return '1 hour ago'
    if (diffHours < 24) return `${diffHours} hours ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays === 1) return 'yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return ''
  }
}

function formatCardActivityMessage(act: EnrichedActivityDoc): string {
  const p = act.payload
  switch (act.type) {
    case 'card_created':
      return 'created this card'
    case 'card_renamed':
      return `renamed this card from "${p.oldTitle ?? ''}" to "${p.newTitle ?? ''}"`
    case 'card_moved':
      return `moved this card${p.fromList ? ` from ${p.fromList}` : ''}${p.toList ? ` to ${p.toList}` : ''}`
    case 'card_archived':
      return 'archived this card'
    case 'card_restored':
      return 'restored this card'
    case 'card_label_added':
      return `added label "${p.labelName ?? 'a label'}"`
    case 'card_label_removed':
      return `removed label "${p.labelName ?? 'a label'}"`
    case 'card_assignee_added':
      return 'assigned a member to this card'
    case 'card_assignee_removed':
      return 'unassigned a member from this card'
    case 'card_due_date_updated':
      return p.dueDate
        ? `set due date to ${new Date(p.dueDate).toLocaleDateString()}`
        : 'removed due date'
    case 'card_description_updated':
      return 'updated card description'
    default:
      return 'updated this card'
  }
}

type FeedItem =
  | { kind: 'comment'; data: EnrichedComment; timestamp: number }
  | { kind: 'activity'; data: EnrichedActivityDoc; timestamp: number }

export function CardModalComments({
  cardId,
  cardTitle,
  comments,
  activities = [],
  currentUserId,
  currentUserProfile,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
  commentsStatus,
  isCommentsLoading,
  onLoadMoreComments,
}: CardModalCommentsProps) {
  const [composerText, setComposerText] = useState('')
  const [isComposerFocused, setIsComposerFocused] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(true)

  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: () => onLoadMoreComments?.(15),
    canLoadMore: commentsStatus === 'CanLoadMore',
    isLoading: Boolean(isCommentsLoading),
    disabled: !onLoadMoreComments,
  })

  const [editingCommentId, setEditingCommentId] = useState<
    CommentDoc['_id'] | null
  >(null)
  const [editText, setEditText] = useState('')
  const [isEditingSubmitting, setIsEditingSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [deletingCommentId, setDeletingCommentId] = useState<
    CommentDoc['_id'] | null
  >(null)

  const handleAddSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault()
    const trimmed = composerText.trim()
    if (!trimmed || isSubmitting) return

    setIsSubmitting(true)
    setSubmitError(null)
    try {
      await onAddComment(trimmed)
      setComposerText('')
      setIsComposerFocused(false)
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Failed to post comment',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleComposerKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleAddSubmit()
    }
    if (e.key === 'Escape') {
      setComposerText('')
      setSubmitError(null)
      setIsComposerFocused(false)
    }
  }

  const handleEditSubmit = async (commentId: CommentDoc['_id']) => {
    const trimmed = editText.trim()
    if (!trimmed || isEditingSubmitting) return

    setIsEditingSubmitting(true)
    setEditError(null)
    try {
      await onUpdateComment(commentId, trimmed)
      setEditingCommentId(null)
      setEditText('')
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : 'Failed to update comment',
      )
    } finally {
      setIsEditingSubmitting(false)
    }
  }

  const handleEditKeyDown = (
    e: KeyboardEvent<HTMLTextAreaElement>,
    commentId: CommentDoc['_id'],
  ) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleEditSubmit(commentId)
    }
    if (e.key === 'Escape') {
      setEditingCommentId(null)
      setEditText('')
      setEditError(null)
    }
  }

  const handleDeleteConfirm = async () => {
    if (deletingCommentId) {
      await onDeleteComment(deletingCommentId)
      setDeletingCommentId(null)
    }
  }

  // Filter activities relevant to this card
  const cardActivities = useMemo(() => {
    return activities.filter((act) => {
      const payloadCardId = act.payload.cardId
      const payloadTitle = act.payload.title
      return (
        payloadCardId === cardId ||
        (!payloadCardId && payloadTitle === cardTitle)
      )
    })
  }, [activities, cardId, cardTitle])

  // Merge comments and activity, newest first for natural conversation flow
  const feedItems = useMemo(() => {
    const items: FeedItem[] = [
      ...comments.map((c): FeedItem => ({
        kind: 'comment',
        data: c,
        timestamp: c._creationTime,
      })),
      ...(showDetails
        ? cardActivities.map((a): FeedItem => ({
            kind: 'activity',
            data: a,
            timestamp: a._creationTime,
          }))
        : []),
    ]
    return items.sort((a, b) => b.timestamp - a.timestamp)
  }, [comments, cardActivities, showDetails])

  const currentUserName = currentUserProfile?.name || 'You'
  const currentUserAvatar = currentUserProfile?.imageUrl

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Header: Title + Show/Hide details toggle */}
        <div className="flex items-center justify-between gap-2">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <MessageSquare className="size-4 text-muted-foreground" />
            <span>Comments and activity</span>
          </h4>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => setShowDetails((prev) => !prev)}
            className="text-xs h-7 px-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            {showDetails ? 'Hide details' : 'Show details'}
          </Button>
        </div>

        {/* Top Comment Composer */}
        <div className="flex items-start gap-3">
          <Avatar className="size-7 ring-1 ring-border shrink-0 mt-0.5">
            <AvatarImage src={currentUserAvatar} alt={currentUserName} />
            <AvatarFallback className="text-[10px] font-semibold bg-primary/15 text-primary">
              {getInitials(currentUserName)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            {!isComposerFocused && !composerText ? (
              <button
                type="button"
                onClick={() => setIsComposerFocused(true)}
                className="w-full text-left rounded-xl border border-border/80 bg-background px-3.5 py-2 text-sm text-muted-foreground hover:border-border hover:bg-muted/20 focus:outline-none transition-all shadow-2xs cursor-text"
              >
                Write a comment...
              </button>
            ) : (
              <div className="flex flex-col gap-2 rounded-xl border border-border bg-background p-3 shadow-2xs focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/20 transition-all">
                <textarea
                  autoFocus
                  rows={3}
                  placeholder="Write a comment..."
                  value={composerText}
                  onChange={(e) => {
                    setComposerText(e.target.value)
                    setSubmitError(null)
                  }}
                  onKeyDown={handleComposerKeyDown}
                  disabled={isSubmitting}
                  className="w-full resize-none bg-transparent text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none wrap-break-word"
                />

                {submitError && (
                  <p className="text-xs text-destructive">{submitError}</p>
                )}

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <Button
                      size="xs"
                      onClick={() => handleAddSubmit()}
                      disabled={!composerText.trim() || isSubmitting}
                      className="h-7 px-3 text-xs cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="size-3 animate-spin mr-1" />
                          Saving...
                        </>
                      ) : (
                        'Save'
                      )}
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      disabled={isSubmitting}
                      onClick={() => {
                        setIsComposerFocused(false)
                        setComposerText('')
                        setSubmitError(null)
                      }}
                      className="h-7 px-3 text-xs cursor-pointer"
                    >
                      Cancel
                    </Button>
                  </div>
                  <span className="text-[11px] text-muted-foreground/80 font-mono hidden sm:inline-block">
                    Cmd/Ctrl+Enter to save
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Feed: Comments + Activity Timeline */}
        <div className="flex flex-col gap-4 pt-2">
          {feedItems.map((item) => {
            if (item.kind === 'comment') {
              const comment = item.data
              const author = comment.author
              const isAuthor =
                Boolean(currentUserId) && currentUserId === comment.authorId
              const authorName = author.name || 'Anonymous User'
              const authorAvatar = author.imageUrl
              const isEditing = editingCommentId === comment._id

              return (
                <div
                  key={comment._id}
                  className="flex items-start gap-3 group/comment"
                >
                  <Avatar className="size-7 ring-1 ring-border shrink-0 mt-0.5">
                    <AvatarImage src={authorAvatar} alt={authorName} />
                    <AvatarFallback className="text-[10px] font-semibold bg-secondary text-secondary-foreground">
                      {getInitials(authorName)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    {/* Author & Timestamp */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-foreground">
                        {authorName}
                      </span>
                      <span className="text-muted-foreground font-mono text-[11px]">
                        {formatRelativeTime(comment._creationTime)}
                      </span>
                    </div>

                    {isEditing ? (
                      <div className="flex flex-col gap-2 rounded-xl border border-ring bg-background p-2.5 shadow-2xs">
                        <textarea
                          autoFocus
                          rows={2}
                          value={editText}
                          onChange={(e) => {
                            setEditText(e.target.value)
                            setEditError(null)
                          }}
                          onKeyDown={(e) => handleEditKeyDown(e, comment._id)}
                          disabled={isEditingSubmitting}
                          className="w-full resize-none bg-transparent text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none wrap-break-word"
                        />

                        {editError && (
                          <p className="text-xs text-destructive">
                            {editError}
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="xs"
                              onClick={() => handleEditSubmit(comment._id)}
                              disabled={!editText.trim() || isEditingSubmitting}
                              className="h-6 px-2.5 text-xs cursor-pointer"
                            >
                              {isEditingSubmitting ? (
                                <>
                                  <Loader2 className="size-3 animate-spin mr-1" />
                                  Saving...
                                </>
                              ) : (
                                'Save'
                              )}
                            </Button>
                            <Button
                              size="xs"
                              variant="ghost"
                              disabled={isEditingSubmitting}
                              onClick={() => {
                                setEditingCommentId(null)
                                setEditText('')
                                setEditError(null)
                              }}
                              className="h-6 px-2.5 text-xs cursor-pointer"
                            >
                              Cancel
                            </Button>
                          </div>
                          <span className="text-[11px] text-muted-foreground/80 font-mono hidden sm:inline-block">
                            Cmd/Ctrl+Enter to save
                          </span>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Speech Bubble Card */}
                        <div className="rounded-xl border border-border/70 bg-card p-3 shadow-2xs text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words">
                          {comment.body}
                        </div>

                        {/* Author Only Actions */}
                        {isAuthor && (
                          <div className="flex items-center gap-2 pt-0.5 text-xs text-muted-foreground">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCommentId(comment._id)
                                setEditText(comment.body)
                                setEditError(null)
                              }}
                              className="hover:text-foreground flex items-center gap-1 hover:underline cursor-pointer"
                            >
                              <Edit2 className="size-3" />
                              <span>Edit</span>
                            </button>
                            <span>•</span>
                            <button
                              type="button"
                              onClick={() => setDeletingCommentId(comment._id)}
                              className="hover:text-destructive flex items-center gap-1 hover:underline cursor-pointer"
                            >
                              <Trash2 className="size-3" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            }

            // Card Activity Item
            const act = item.data
            const actorName = act.actor?.name || 'A team member'
            const actionText = formatCardActivityMessage(act)

            return (
              <div
                key={act._id}
                className="flex items-start gap-3 text-xs sm:text-sm text-foreground"
              >
                <Avatar className="size-7 ring-1 ring-border shrink-0 mt-0.5">
                  <AvatarImage src={act.actor?.imageUrl} alt={actorName} />
                  <AvatarFallback className="text-[10px] font-semibold bg-muted text-muted-foreground">
                    {getInitials(actorName)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <p className="leading-snug text-foreground break-words text-xs sm:text-sm">
                    <span className="font-semibold">{actorName}</span>{' '}
                    <span className="text-muted-foreground">{actionText}</span>
                  </p>
                  <span className="text-xs text-muted-foreground block font-mono">
                    {formatRelativeTime(act._creationTime)}
                  </span>
                </div>
              </div>
            )
          })}

          {commentsStatus === 'LoadingFirstPage' && comments.length === 0 && (
            <div className="flex flex-col gap-3 py-2 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="size-7 rounded-full bg-muted shrink-0" />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="h-3 w-24 rounded bg-muted" />
                  <div className="h-12 w-full rounded-xl bg-muted/60" />
                </div>
              </div>
            </div>
          )}

          {feedItems.length === 0 && commentsStatus !== 'LoadingFirstPage' && (
            <p className="text-xs sm:text-sm text-muted-foreground py-4 text-center italic">
              No comments or activity yet on this card.
            </p>
          )}

          {/* Loading More Spinner */}
          {commentsStatus === 'LoadingMore' && (
            <div className="flex items-center justify-center py-2 text-xs text-muted-foreground gap-2">
              <Loader2 className="size-3.5 animate-spin text-primary" />
              <span>Loading older comments...</span>
            </div>
          )}

          {/* Infinite Scroll Sentinel */}
          {commentsStatus === 'CanLoadMore' && (
            <div ref={sentinelRef} className="h-2 w-full" />
          )}

          {/* Fallback Load More Button */}
          {commentsStatus === 'CanLoadMore' && (
            <div className="flex justify-center pt-1">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => onLoadMoreComments?.(15)}
                className="text-xs text-muted-foreground hover:text-foreground h-7 px-3 cursor-pointer"
              >
                Load older comments
              </Button>
            </div>
          )}

          {/* Exhausted State Indicator */}
          {commentsStatus === 'Exhausted' && comments.length >= 10 && (
            <p className="text-[11px] text-muted-foreground/60 py-2 text-center font-mono">
              No older comments
            </p>
          )}
        </div>
      </div>

      {/* Delete Comment Confirmation Dialog */}
      <DeleteCommentDialog
        commentId={deletingCommentId}
        isOpen={Boolean(deletingCommentId)}
        onClose={() => setDeletingCommentId(null)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  )
}
