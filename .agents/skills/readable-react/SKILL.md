---
name: readable-react
description: Write and refactor React code so the main component reads like a high-level description of the UI. Composition and readability are the primary goals — no giant JSX blobs mixing conditionals, .map() logic, event handlers, data transforms, and styling. Use this whenever the user asks you to write or rewrite a React component, or to make React code "clean", "readable", "better organized", "structured", "refactored", or mentions extracting components, composition, or code smells — even if they don't say the words aloud. Any time you're producing or revising a .tsx/.jsx file, consider whether this skill applies.
---

# Readable React

## The core principle

Write React code with **composition and readability as the primary goals**. Put the main component at the top so it reads like a high-level description of the UI, with the most important JSX and application flow immediately visible. Move implementation details into small, focused components and helper functions defined below it.

The goal: someone reading the top of a component can understand its structure and behavior without needing to immediately inspect the implementation of every child component or helper.

## Structure: the file is an outline

A well-written file reads top-to-bottom like an outline:

1. The **main component** first — a clear, high-level description of what the UI does.
2. Extracted **components and helper functions** below it, ordered by importance.

## Recognize the problem

A component is hard to read when its JSX nests several of these at once:

- conditional rendering
- `.map()` calls
- event handlers containing logic
- data transformations (formatting dates, deriving display values, filtering)
- styling decisions
- business logic

The fix is not bigger abstractions. It's giving meaningful names to the pieces.

## When to extract

Extract when it makes the parent easier to grasp at a glance:

- A self-contained entity rendered as JSX, e.g. `UserInfo`, `UserActions`, `TaskRow`, `PostCard`.
- A state branch that deserves a name: `EmptyState`, `LoadingState`, `ErrorState`.
- A derived value or class-name computation: `getStatusClassName`, `formatDate`, `getFilteredPosts`.

Name pieces for what they are: `UserInfo`, `EmptyState`, `getStatusClassName` — not `UserInfoComponent`, `StatusClass`, or `renderThing`.

## When NOT to extract

- Don't extract merely to reduce line count — extract for **semantic clarity**.
- Don't extract a piece used once if the parent reads fine with it inline.
- Avoid unnecessary abstractions: no premature generics, no config-driven mega-components, no render props to "reuse" a one-off layout.
- Keep related logic close together. If the extraction scatters a cohesive idea, don't do it.

## Event handlers

Handlers should delegate to named functions rather than holding logic inline.

```tsx
// good
<button onClick={handleDelete}>Delete</button>

// bad
<button
  onClick={(e) => {
    e.stopPropagation();
    setConfirming(true);
    trackEvent('delete-clicked');
  }}
>
  Delete
</button>
```

## JSX describes what, not how

Keep transforms, conditions, and derived values out of the JSX. Inline JSX should read as a list of named things, not a computation:

```tsx
// good
<UserInfo user={user} />
<UserActions user={user} onEdit={handleEdit} onDelete={handleDelete} />

// bad
<div className={hasPermission(user) ? 'actions' : 'actions-hidden'}>
  {user.permissions.includes('delete') && (
    <button onClick={handleDelete}>Delete</button>
  )}
</div>
```

## Small functions

Prefer small functions with one clear responsibility, descriptive names, and simple flat props. If a helper takes five props or a bundle of options, stop and reconsider — it's probably doing too much or the abstraction is premature.

Pick the most natural construct for the job: a small static lookup map (status → class name) is often clearer than an if/else chain, and a plain ternary beats a needless function. Extract for clarity, not for the sake of having a helper.

## Example

**Before** — everything crammed into one JSX tree:

```tsx
export default function UserDashboard() {
  const { user, isLoading, error } = useUser();
  const [filter, setFilter] = useState('all');

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Something went wrong: {error.message}</p>;

  const filteredPosts = user.posts
    .filter((post) => filter === 'all' || post.category === filter)
    .map((post) => ({ ...post, title: post.title.toUpperCase() }));

  return (
    <main>
      <h1>{user.name}</h1>
      <span className={user.role === 'admin' ? 'badge-admin' : 'badge'}>
        {user.role}
      </span>
      <div>
        {user.permissions.includes('edit') && (
          <button onClick={() => handleEdit(user)}>Edit</button>
        )}
        {user.permissions.includes('delete') && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              confirmDelete(user);
            }}
          >
            Delete
          </button>
        )}
      </div>
      <select value={filter} onChange={(e) => setFilter(e.target.value)}>
        <option value="all">All</option>
        <option value="news">News</option>
        <option value="reviews">Reviews</option>
      </select>
      {filteredPosts.map((post) => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.body}</p>
          <footer>{formatDate(post.createdAt)}</footer>
        </article>
      ))}
    </main>
  );
}
```

**After** — the top reads like an outline; details live below:

```tsx
export default function UserDashboard() {
  const { user, isLoading, error } = useUser();
  const [filter, setFilter] = useState('all');

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;

  const posts = getFilteredPosts(user.posts, filter);

  return (
    <main>
      <UserHeader user={user} />
      <UserActions user={user} onEdit={handleEdit} onDelete={confirmDelete} />
      <PostFilter value={filter} onChange={setFilter} />
      <PostList posts={posts} />
    </main>
  );
}

function UserHeader({ user }: { user: User }) {
  return (
    <>
      <h1>{user.name}</h1>
      <RoleBadge role={user.role} />
    </>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span className={role === 'admin' ? 'badge-admin' : 'badge'}>{role}</span>
  );
}

function UserActions({ user, onEdit, onDelete }: UserActionsProps) {
  if (!user.permissions.some((p) => p === 'edit' || p === 'delete')) return null;
  return (
    <div>
      {user.permissions.includes('edit') && <button onClick={onEdit}>Edit</button>}
      {user.permissions.includes('delete') && (
        <button onClick={onDelete}>Delete</button>
      )}
    </div>
  );
}

function PostFilter({ value, onChange }: PostFilterProps) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="all">All</option>
      <option value="news">News</option>
      <option value="reviews">Reviews</option>
    </select>
  );
}

function PostList({ posts }: { posts: Post[] }) {
  return (
    <section>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </section>
  );
}

function PostCard({ post }: { post: Post }) {
  return (
    <article>
      <h2>{post.title}</h2>
      <p>{post.body}</p>
      <footer>{formatDate(post.createdAt)}</footer>
    </article>
  );
}

function getFilteredPosts(posts: Post[], filter: string): Post[] {
  return posts.filter((post) => filter === 'all' || post.category === filter);
}
```

## Hooks

Keep hooks at the top of the component. If a component accumulates several related hooks and derived values that complicate the top of the file, extract the cohesive block into a single named hook (e.g. `useUserDashboard()`) and call it from the main component — but only when it genuinely sharpens the outline, not as a habit.

## Always end with a rationale

When refactoring existing code, always finish with a brief "What changed & why" — a few bullets naming what you extracted or removed and the readability win. This lets the reader accept or push back on your choices without re-reading both versions side by side. Keep it to a few bullets; the code is the star. Do this even when the user didn't ask for an explanation — it's part of delivering a refactor, not an optional extra.

## TypeScript

Use TS in examples by default. The same rules apply to plain JSX — just drop the type annotations.
