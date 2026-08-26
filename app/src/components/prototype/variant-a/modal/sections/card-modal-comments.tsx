import { useState } from 'react'
import type { FormEvent } from 'react'
import { MessageSquare, Edit2, Trash2 } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { ACTIVITY_VERB_FORMATTERS } from '../../constants'
import type {
  ActivityItem,
  CardComment,
  Member,
} from '#/components/prototype/types'

export interface CardModalCommentsProps {
  cardTitle: string
  comments: CardComment[]
  activity: ActivityItem[]
  members: Member[]
  currentUserId: string
  onAddComment: (text: string) => void
  onEditComment: (commentId: string, newText: string) => void
  onDeleteComment: (commentId: string) => void
}

function formatRelativeTime(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'just now'
    if (diffMins === 1) return '1 minute ago'
    if (diffMins < 60) return `${diffMins} minutes ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours === 1) return '1 hour ago'
    if (diffHours < 24) return `${diffHours} hours ago`
    return new Date(isoString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return 'recently'
  }
}

type FeedItem =
  | { kind: 'comment'; data: CardComment; timestamp: number }
  | { kind: 'activity'; data: ActivityItem; timestamp: number }

export function CardModalComments({
  cardTitle,
  comments,
  activity,
  members,
  currentUserId,
  onAddComment,
  onEditComment,
  onDeleteComment,
}: CardModalCommentsProps) {
  const [text, setText] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [showDetails, setShowDetails] = useState(true)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  const currentUser = members.find((m) => m.id === currentUserId)

  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault()
    if (text.trim()) {
      onAddComment(text.trim())
      setText('')
      setIsFocused(false)
    }
  }

  const handleSaveEdit = (commentId: string) => {
    if (editText.trim()) {
      onEditComment(commentId, editText.trim())
      setEditingCommentId(null)
    }
  }

  // Filter activities relevant to this card
  const cardActivities = activity.filter(
    (act) =>
      act.targetTitle === cardTitle ||
      (act.details && act.details.includes(cardTitle)),
  )

  // Merge comments and activity in reverse chronological order (newest first)
  const feedItems: FeedItem[] = [
    ...comments.map((c): FeedItem => ({
      kind: 'comment',
      data: c,
      timestamp: new Date(c.createdAt).getTime(),
    })),
    ...(showDetails
      ? cardActivities.map((a): FeedItem => ({
          kind: 'activity',
          data: a,
          timestamp: new Date(a.createdAt).getTime(),
        }))
      : []),
  ].sort((a, b) => b.timestamp - a.timestamp)

  return (
    <div className="space-y-4">
      {/* Header: Title + Show/Hide details toggle */}
      <div className="flex items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <MessageSquare className="size-4 text-muted-foreground" />
          <span>Comments and activity</span>
        </h4>
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="rounded-lg border border-border/60 bg-card hover:bg-muted/70 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors shadow-2xs"
        >
          {showDetails ? 'Hide details' : 'Show details'}
        </button>
      </div>

      {/* Top Comment Composer (Matching Trello layout) */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex items-start gap-2.5">
          <img
            src={
              currentUser?.avatarUrl ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
            }
            alt={currentUser?.name || 'Your avatar'}
            className="size-7 rounded-full object-cover shrink-0 mt-0.5 ring-1 ring-border"
          />
          <div className="flex-1">
            {!isFocused && !text ? (
              <input
                type="text"
                placeholder="Write a comment..."
                onFocus={() => setIsFocused(true)}
                className="w-full rounded-xl border border-border/80 bg-background px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground hover:border-border hover:bg-muted/20 focus:outline-none transition-all shadow-2xs"
              />
            ) : (
              <div className="space-y-2 rounded-xl border border-border bg-background p-2.5 shadow-2xs focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/20 transition-all">
                <textarea
                  autoFocus
                  rows={3}
                  placeholder="Write a comment..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault()
                      handleSubmit()
                    }
                  }}
                  className="w-full resize-none bg-transparent text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none break-all"
                />
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      type="submit"
                      disabled={!text.trim()}
                      className="text-xs h-7 px-3"
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      type="button"
                      onClick={() => {
                        setText('')
                        setIsFocused(false)
                      }}
                      className="text-xs h-7 px-3"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </form>

      {/* Chronological Feed of Comments and Card Activities */}
      <div className="space-y-3.5 pt-1">
        {feedItems.map((item) => {
          if (item.kind === 'comment') {
            const cm = item.data
            const author = members.find((m) => m.id === cm.memberId)
            const isAuthor = cm.memberId === currentUserId
            const isEditing = editingCommentId === cm.id

            return (
              <div key={cm.id} className="flex items-start gap-2.5 group">
                <img
                  src={
                    author?.avatarUrl ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
                  }
                  alt={author?.name || 'User'}
                  className="size-7 rounded-full object-cover shrink-0 mt-0.5 ring-1 ring-border"
                />
                <div className="flex-1 space-y-1 min-w-0">
                  {/* Author line with relative timestamp */}
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-sm text-foreground truncate">
                      {author?.name || 'Team Member'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(cm.createdAt)}
                    </span>
                  </div>

                  {isEditing ? (
                    <div className="space-y-2 rounded-xl border border-ring bg-background p-2.5 shadow-2xs">
                      <textarea
                        autoFocus
                        rows={2}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full resize-none bg-transparent text-sm text-foreground focus:outline-none break-all"
                      />
                      <div className="flex items-center gap-1.5 pt-1">
                        <Button
                          size="xs"
                          onClick={() => handleSaveEdit(cm.id)}
                          className="h-6 text-xs px-2.5"
                        >
                          Save
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => setEditingCommentId(null)}
                          className="h-6 text-xs px-2.5"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* White / Card Speech Bubble (Trello style) */}
                      <div className="rounded-xl border border-border/70 bg-card p-3 shadow-2xs text-sm leading-relaxed text-foreground whitespace-pre-wrap break-all">
                        {cm.text}
                      </div>

                      {/* Edit / Delete actions */}
                      {isAuthor && (
                        <div className="flex items-center gap-2 pt-0.5 text-xs text-muted-foreground">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCommentId(cm.id)
                              setEditText(cm.text)
                            }}
                            className="hover:text-foreground flex items-center gap-1 hover:underline"
                          >
                            <Edit2 className="size-3" />
                            <span>Edit</span>
                          </button>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={() => onDeleteComment(cm.id)}
                            className="hover:text-destructive flex items-center gap-1 hover:underline"
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

          // Activity item
          const act = item.data
          const actor = members.find((m) => m.id === act.actorId)
          const actionText = ACTIVITY_VERB_FORMATTERS[act.type](
            act.targetTitle,
            act.details,
          )

          return (
            <div key={act.id} className="flex items-start gap-2.5 text-sm">
              <img
                src={
                  actor?.avatarUrl ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
                }
                alt={actor?.name || 'Member'}
                className="size-7 rounded-full object-cover shrink-0 mt-0.5 ring-1 ring-border"
              />
              <div className="flex-1 space-y-0.5 min-w-0">
                <p className="leading-snug text-foreground text-sm">
                  <span className="font-semibold text-foreground">
                    {actor?.name || 'A team member'}
                  </span>{' '}
                  <span className="text-muted-foreground">{actionText}</span>
                </p>
                <span className="text-xs text-muted-foreground block">
                  {formatRelativeTime(act.createdAt)}
                </span>
              </div>
            </div>
          )
        })}

        {feedItems.length === 0 && (
          <p className="text-sm text-muted-foreground py-3 text-center italic">
            No activity or comments yet.
          </p>
        )}
      </div>
    </div>
  )
}
