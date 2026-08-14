import { useState, useMemo } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { MessageSquare, Edit2, Trash2 } from 'lucide-react'
import { Button } from '#/components/ui/button.tsx'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar.tsx'
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
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return 'recently'
  }
}

function formatCardActivityMessage(act: EnrichedActivityDoc): string {
  const payload = act.payload
  switch (act.type) {
    case 'card_created':
      return `created this card in ${payload.listTitle ?? 'list'}`
    case 'card_archived':
      return 'archived this card'
    case 'card_restored':
      return 'restored this card'
    case 'description_changed':
      return 'updated the description'
    case 'due_date_set':
      return 'set the due date'
    case 'due_date_changed':
      return 'changed the due date'
    case 'due_date_cleared':
      return 'removed the due date'
    case 'label_added':
      return `added label "${payload.labelName ?? 'Label'}"`
    case 'label_removed':
      return `removed label "${payload.labelName ?? 'Label'}"`
    case 'assignee_added':
      return `assigned ${payload.memberName ?? 'a member'}`
    case 'assignee_removed':
      return `unassigned ${payload.memberName ?? 'a member'}`
    case 'comment_added':
      return 'left a comment'
    case 'card_moved':
      return 'moved this card'
    default:
      return act.type.replace(/_/g, ' ')
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
}: CardModalCommentsProps) {
  const [composerText, setComposerText] = useState('')
  const [isComposerFocused, setIsComposerFocused] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showDetails, setShowDetails] = useState(true)

  const [editingCommentId, setEditingCommentId] = useState<
    CommentDoc['_id'] | null
  >(null)
  const [editText, setEditText] = useState('')
  const [isEditingSubmitting, setIsEditingSubmitting] = useState(false)

  const handleAddSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault()
    const trimmed = composerText.trim()
    if (!trimmed || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onAddComment(trimmed)
      setComposerText('')
      setIsComposerFocused(false)
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
      setIsComposerFocused(false)
    }
  }

  const handleEditSubmit = async (commentId: CommentDoc['_id']) => {
    const trimmed = editText.trim()
    if (!trimmed || isEditingSubmitting) return

    setIsEditingSubmitting(true)
    try {
      await onUpdateComment(commentId, trimmed)
      setEditingCommentId(null)
      setEditText('')
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
                onChange={(e) => setComposerText(e.target.value)}
                onKeyDown={handleComposerKeyDown}
                className="w-full resize-none bg-transparent text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none break-words"
              />
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <Button
                    size="xs"
                    onClick={() => handleAddSubmit()}
                    disabled={!composerText.trim() || isSubmitting}
                    className="h-7 px-3 text-xs cursor-pointer"
                  >
                    Save
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    type="button"
                    onClick={() => {
                      setComposerText('')
                      setIsComposerFocused(false)
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

      {/* Feed of Comments and Card Activities */}
      <div className="flex flex-col gap-4 pt-1">
        {feedItems.map((item) => {
          if (item.kind === 'comment') {
            const comment = item.data
            const isAuthor = Boolean(
              currentUserId && comment.authorId === currentUserId,
            )
            const isEditing = editingCommentId === comment._id

            return (
              <div key={comment._id} className="flex items-start gap-3 group">
                <Avatar className="size-7 ring-1 ring-border shrink-0 mt-0.5">
                  <AvatarImage
                    src={comment.author.imageUrl}
                    alt={comment.author.name}
                  />
                  <AvatarFallback className="text-[10px] font-semibold bg-primary/15 text-primary">
                    {getInitials(comment.author.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                  {/* Author Header Line */}
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-sm text-foreground truncate">
                      {comment.author.name}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {formatRelativeTime(comment._creationTime)}
                    </span>
                  </div>

                  {isEditing ? (
                    <div className="flex flex-col gap-2 rounded-xl border border-ring bg-background p-3 shadow-2xs">
                      <textarea
                        autoFocus
                        rows={2}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => handleEditKeyDown(e, comment._id)}
                        className="w-full resize-none bg-transparent text-sm leading-relaxed text-foreground focus:outline-none break-words"
                      />
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="xs"
                            onClick={() => handleEditSubmit(comment._id)}
                            disabled={!editText.trim() || isEditingSubmitting}
                            className="h-6 px-2.5 text-xs cursor-pointer"
                          >
                            Save
                          </Button>
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => {
                              setEditingCommentId(null)
                              setEditText('')
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
                            }}
                            className="hover:text-foreground flex items-center gap-1 hover:underline cursor-pointer"
                          >
                            <Edit2 className="size-3" />
                            <span>Edit</span>
                          </button>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={() => onDeleteComment(comment._id)}
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

        {feedItems.length === 0 && (
          <p className="text-xs sm:text-sm text-muted-foreground py-4 text-center italic">
            No comments or activity yet on this card.
          </p>
        )}
      </div>
    </div>
  )
}
