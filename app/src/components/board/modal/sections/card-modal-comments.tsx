import { useState, useMemo } from 'react'
import type { FormEvent, KeyboardEvent, RefObject } from 'react'
import { MessageSquare, Edit2, Trash2, Loader2 } from 'lucide-react'
import { Button } from '#/components/ui/button.tsx'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar.tsx'
import { useInfiniteScroll } from '#/hooks/use-infinite-scroll.ts'
import {
  formatCardActivityMessage,
  formatRelativeTime,
  getCardFeedItems,
  getInitials,
} from '../../board-transforms.ts'
import type { FeedItem } from '../../board-transforms.ts'
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
  const [showDetails, setShowDetails] = useState(true)
  const [deletingCommentId, setDeletingCommentId] = useState<
    CommentDoc['_id'] | null
  >(null)

  const feedItems = useMemo(
    () =>
      getCardFeedItems(comments, activities, cardId, cardTitle, showDetails),
    [comments, activities, cardId, cardTitle, showDetails],
  )

  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: () => onLoadMoreComments?.(15),
    canLoadMore: commentsStatus === 'CanLoadMore',
    isLoading: Boolean(isCommentsLoading),
    disabled: !onLoadMoreComments,
  })

  const handleDeleteConfirm = async () => {
    if (deletingCommentId) {
      await onDeleteComment(deletingCommentId)
      setDeletingCommentId(null)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <CommentsSectionHeader
          showDetails={showDetails}
          onToggleDetails={() => setShowDetails((prev) => !prev)}
        />

        <CommentComposer
          currentUserProfile={currentUserProfile}
          onSubmit={onAddComment}
        />

        <CardActivityFeed
          feedItems={feedItems}
          currentUserId={currentUserId}
          commentsStatus={commentsStatus}
          onUpdateComment={onUpdateComment}
          onDeleteComment={(id) => setDeletingCommentId(id)}
        />

        <CardCommentsPagination
          status={commentsStatus}
          commentsCount={comments.length}
          sentinelRef={sentinelRef}
          onLoadMore={() => onLoadMoreComments?.(15)}
        />
      </div>

      <DeleteCommentDialog
        commentId={deletingCommentId}
        isOpen={Boolean(deletingCommentId)}
        onClose={() => setDeletingCommentId(null)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  )
}

function CommentsSectionHeader({
  showDetails,
  onToggleDetails,
}: {
  showDetails: boolean
  onToggleDetails: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <MessageSquare className="size-4 text-muted-foreground" />
        <span>Comments and activity</span>
      </h4>
      <Button
        type="button"
        variant="outline"
        size="xs"
        onClick={onToggleDetails}
        className="text-xs h-7 px-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
      >
        {showDetails ? 'Hide details' : 'Show details'}
      </Button>
    </div>
  )
}

interface CommentComposerProps {
  currentUserProfile?: BoardMemberUser | null
  onSubmit: (body: string) => Promise<void> | void
}

function CommentComposer({
  currentUserProfile,
  onSubmit,
}: CommentComposerProps) {
  const [text, setText] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentUserName = currentUserProfile?.name || 'You'
  const currentUserAvatar = currentUserProfile?.imageUrl

  const handleFormSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || isSubmitting) return

    setIsSubmitting(true)
    setError(null)
    try {
      await onSubmit(trimmed)
      setText('')
      setIsFocused(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post comment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleFormSubmit()
    }
    if (e.key === 'Escape') {
      setText('')
      setError(null)
      setIsFocused(false)
    }
  }

  return (
    <div className="flex items-start gap-3">
      <Avatar className="size-7 ring-1 ring-border shrink-0 mt-0.5">
        <AvatarImage src={currentUserAvatar} alt={currentUserName} />
        <AvatarFallback className="text-[10px] font-semibold bg-primary/15 text-primary">
          {getInitials(currentUserName)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        {!isFocused && !text ? (
          <button
            type="button"
            onClick={() => setIsFocused(true)}
            className="w-full text-left rounded-xl border border-border/80 bg-background px-3.5 py-2 text-sm text-muted-foreground hover:border-border hover:bg-muted/20 focus:outline-none transition-all shadow-2xs cursor-text"
          >
            Write a comment...
          </button>
        ) : (
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-background p-3 shadow-2xs focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/20 transition-all">
            <textarea
              aria-label="New comment"
              autoFocus
              rows={3}
              placeholder="Write a comment..."
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                setError(null)
              }}
              onKeyDown={handleKeyDown}
              disabled={isSubmitting}
              className="w-full resize-none bg-transparent text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none wrap-break-word"
            />

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <Button
                  size="xs"
                  onClick={() => handleFormSubmit()}
                  disabled={!text.trim() || isSubmitting}
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
                    setIsFocused(false)
                    setText('')
                    setError(null)
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
  )
}

interface CardActivityFeedProps {
  feedItems: FeedItem[]
  currentUserId?: string
  commentsStatus?: string
  onUpdateComment: (
    commentId: CommentDoc['_id'],
    body: string,
  ) => Promise<void> | void
  onDeleteComment: (commentId: CommentDoc['_id']) => void
}

function CardActivityFeed({
  feedItems,
  currentUserId,
  commentsStatus,
  onUpdateComment,
  onDeleteComment,
}: CardActivityFeedProps) {
  return (
    <div className="flex flex-col gap-4 pt-2">
      {feedItems.map((item) =>
        item.kind === 'comment' ? (
          <CommentFeedItem
            key={item.data._id}
            comment={item.data}
            currentUserId={currentUserId}
            onUpdateComment={onUpdateComment}
            onDeleteComment={onDeleteComment}
          />
        ) : (
          <ActivityFeedItem key={item.data._id} activity={item.data} />
        ),
      )}

      {commentsStatus === 'LoadingFirstPage' && feedItems.length === 0 && (
        <FeedLoadingSkeleton />
      )}

      {feedItems.length === 0 && commentsStatus !== 'LoadingFirstPage' && (
        <p className="text-xs sm:text-sm text-muted-foreground py-4 text-center italic">
          No comments or activity yet on this card.
        </p>
      )}
    </div>
  )
}

interface CommentFeedItemProps {
  comment: EnrichedComment
  currentUserId?: string
  onUpdateComment: (
    commentId: CommentDoc['_id'],
    body: string,
  ) => Promise<void> | void
  onDeleteComment: (commentId: CommentDoc['_id']) => void
}

function CommentFeedItem({
  comment,
  currentUserId,
  onUpdateComment,
  onDeleteComment,
}: CommentFeedItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(comment.body)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const author = comment.author
  const isAuthor = Boolean(currentUserId) && currentUserId === comment.authorId
  const authorName = author.name || 'Anonymous User'
  const authorAvatar = author.imageUrl

  const handleSave = async () => {
    const trimmed = editText.trim()
    if (!trimmed || isSubmitting) return

    setIsSubmitting(true)
    setError(null)
    try {
      await onUpdateComment(comment._id, trimmed)
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update comment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditText(comment.body)
    setError(null)
  }

  return (
    <div className="flex items-start gap-3 group/comment">
      <Avatar className="size-7 ring-1 ring-border shrink-0 mt-0.5">
        <AvatarImage src={authorAvatar} alt={authorName} />
        <AvatarFallback className="text-[10px] font-semibold bg-secondary text-secondary-foreground">
          {getInitials(authorName)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0 flex flex-col gap-1">
        {/* Author & Timestamp */}
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-foreground">{authorName}</span>
          <span className="text-muted-foreground font-mono text-[11px]">
            {formatRelativeTime(comment._creationTime)}
          </span>
        </div>

        {isEditing ? (
          <CommentEditor
            value={editText}
            isSubmitting={isSubmitting}
            error={error}
            onChange={(val) => {
              setEditText(val)
              setError(null)
            }}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        ) : (
          <>
            <div className="rounded-xl border border-border/70 bg-card p-3 shadow-2xs text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words">
              {comment.body}
            </div>

            {isAuthor && (
              <CommentAuthorActions
                onEdit={() => {
                  setIsEditing(true)
                  setEditText(comment.body)
                  setError(null)
                }}
                onDelete={() => onDeleteComment(comment._id)}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

interface CommentEditorProps {
  value: string
  isSubmitting: boolean
  error: string | null
  onChange: (val: string) => void
  onSave: () => void
  onCancel: () => void
}

function CommentEditor({
  value,
  isSubmitting,
  error,
  onChange,
  onSave,
  onCancel,
}: CommentEditorProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      onSave()
    }
    if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-ring bg-background p-2.5 shadow-2xs">
      <textarea
        aria-label="Edit comment"
        autoFocus
        rows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isSubmitting}
        className="w-full resize-none bg-transparent text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none wrap-break-word"
      />

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5">
          <Button
            size="xs"
            onClick={onSave}
            disabled={!value.trim() || isSubmitting}
            className="h-6 px-2.5 text-xs cursor-pointer"
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
            onClick={onCancel}
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
  )
}

function CommentAuthorActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-2 pt-0.5 text-xs text-muted-foreground">
      <button
        type="button"
        onClick={onEdit}
        className="hover:text-foreground flex items-center gap-1 hover:underline cursor-pointer"
      >
        <Edit2 className="size-3" />
        <span>Edit</span>
      </button>
      <span>•</span>
      <button
        type="button"
        onClick={onDelete}
        className="hover:text-destructive flex items-center gap-1 hover:underline cursor-pointer"
      >
        <Trash2 className="size-3" />
        <span>Delete</span>
      </button>
    </div>
  )
}

function ActivityFeedItem({ activity }: { activity: EnrichedActivityDoc }) {
  const actorName = activity.actor?.name || 'A team member'
  const actionText = formatCardActivityMessage(activity)

  return (
    <div className="flex items-start gap-3 text-xs sm:text-sm text-foreground">
      <Avatar className="size-7 ring-1 ring-border shrink-0 mt-0.5">
        <AvatarImage src={activity.actor?.imageUrl} alt={actorName} />
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
          {formatRelativeTime(activity._creationTime)}
        </span>
      </div>
    </div>
  )
}

function FeedLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-3 py-2 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="size-7 rounded-full bg-muted shrink-0" />
        <div className="flex-1 flex flex-col gap-2">
          <div className="h-3 w-24 rounded bg-muted" />
          <div className="h-12 w-full rounded-xl bg-muted/60" />
        </div>
      </div>
    </div>
  )
}

interface CardCommentsPaginationProps {
  status?: string
  commentsCount: number
  sentinelRef: RefObject<HTMLDivElement | null>
  onLoadMore: () => void
}

function CardCommentsPagination({
  status,
  commentsCount,
  sentinelRef,
  onLoadMore,
}: CardCommentsPaginationProps) {
  return (
    <>
      {status === 'LoadingMore' && (
        <div className="flex items-center justify-center py-2 text-xs text-muted-foreground gap-2">
          <Loader2 className="size-3.5 animate-spin text-primary" />
          <span>Loading older comments...</span>
        </div>
      )}

      {status === 'CanLoadMore' && (
        <>
          <div ref={sentinelRef} className="h-2 w-full" />
          <div className="flex justify-center pt-1">
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={onLoadMore}
              className="text-xs text-muted-foreground hover:text-foreground h-7 px-3 cursor-pointer"
            >
              Load older comments
            </Button>
          </div>
        </>
      )}

      {status === 'Exhausted' && commentsCount >= 10 && (
        <p className="text-[11px] text-muted-foreground/60 py-2 text-center font-mono">
          No older comments
        </p>
      )}
    </>
  )
}
