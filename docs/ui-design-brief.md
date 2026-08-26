# UI Design Brief — Realtime Board App ("Trello Clone")

A handoff document for the designer building the product's interface. It defines *what* must exist and *how the product behaves*, and leaves *how it looks* open to your creative direction. Please read Section 2 (Vocabulary) and Section 8 (Freedom) before you start sketching.

---

## 1. The product

A realtime, collaborative project-management tool for small teams. People organize work into **Boards** made of vertical **Lists** that hold **Cards**. Multiple people can view and edit the same Board at once — moving Cards, writing Comments, changing assignments — and every change appears on everyone's screen instantly.

It is deliberately smaller than Trello. It does one thing (realtime board collaboration) and does it cleanly. The personality should be **polished, minimal, production-grade** — a calm, focused work tool, not a toy, not a pastiche of Trello.

**A short tour of the experience:**

1. A person signs in with email + password (managed by Clerk).
2. On the **dashboard** they see the Boards they own or were invited to.
3. They open a Board: a wide horizontal canvas of Lists, each a stack of Cards.
4. They drag a Card to another List; every other viewer sees it move the same moment.
5. Clicking a Card opens a detail view — description, Labels, Due date, assignees, Comments.
6. The Board header shows who else is viewing right now (presence avatars).
7. Everything anyone does is summarized in the Board's **Activity** feed.

---

## 2. Vocabulary (use these words in the UI and in your annotations)

This is the product's official language. Names shown to users should use these terms, not the avoided ones. It keeps the interface and the domain consistent.

| Term | Means | Avoid |
|---|---|---|
| **User** | A person with an account | Account, person, individual |
| **Board** | A collaborative space for organizing work, owned by a User who invites Members | Project, workspace, team, space |
| **Member** | A User who belongs to a Board; the unit of access control | Collaborator, participant, team member |
| **Owner** | The User who created a Board; holds lifecycle powers (rename, invite/remove Members, delete) | Admin, manager, creator |
| **List** | A vertical column of Cards within a Board | Column, lane, stage |
| **Card** | The smallest unit of work in a List; carries description, Labels, Due date, assigned Members, Comments | Task, ticket, item, to-do |
| **Label** | A named, colored marker from the Board's palette that Cards reference | Tag, badge, category |
| **Due date** | An optional date/time on a Card; shown as overdue once passed; no completion semantics | Deadline, scheduled date |
| **Comment** | Text a Member attaches to a Card, shown chronologically; author may edit/remove it | Note, reply, message |
| **Archive** | A soft-deleted state a Card can move to and restore from; never destroys data | Delete, trash, remove |
| **Activity** | A record of a change made to a Board or Card, shown in the Board's feed | Log, event, audit trail |

---

## 3. Permission model (drives what you show whom)

- **Owner** can: rename the Board, invite Members by email, remove Members, delete the Board (permanent, requires confirmation), and do everything a Member can.
- **Member** can: create/rename/reorder Lists; create/edit/move/archive/restore Cards; add/edit/delete their own Comments; manage Labels on Cards.

Design implication: the interface must make it obvious when a viewer *can't* do something — a non-Owner should simply not see lifecycle controls (rename, invite/remove Members, delete, edit Labels palette). No dead buttons, no "you don't have permission" screens mid-flow.

---

## 4. Screens to design

### 4.1 Authentication (sign-in / sign-up)

- Identity is handled by **Clerk** — the app embeds Clerk's prebuilt forms in a simple centered shell.
- Design the shell that frames it: app mark/wordmark, background treatment, sign-in vs sign-up switching, error states. Keep it minimal — the product is a work tool, not a consumer brand site.

### 4.2 Dashboard ("Your Boards")

- The post-login home. Lists every Board the User is an **Owner** or **Member** of.
- Each Board tile/card shows at minimum its **name**; a natural addition is the Member avatars and a small "you own this" affordance.
- **Create Board** flow — an inline name input (modal or inline form). This is the only way a Board comes into existence.
- **Empty state**: the first-time user with no Boards. This is a launch moment — make it encouraging and tell them exactly what to do.
- No realtime behavior needed here.

### 4.3 The Board view (the star of the product)

The canvas where everyone collaborates. Spend most of your effort here.

**Header (persistent top bar):**
- Board **name** — inline-editable (Owner only). Must read as *part of the canvas*, not a browser tab.
- **Presence strip** — avatars of Members currently viewing the Board, live-updating. Suggest counts beyond a small number. This is the app's signature "we're here together" signal; make it feel alive.
- **Menu** entry point (ellipsis or similar) revealing: Members management, Labels management, Activity feed, and Owner-only settings (rename, delete).

**Canvas:**
- One horizontal scrollable row of **Lists**, each a distinct column with a subtle surface of its own.
- A **List** has: an editable title, a vertical stack of Cards, a "add a card" affordance, and a drag handle for reordering the List itself.
- A trailing "add another list" affordance at the end of the row.
- **Card** (resting state): title; optional **Label** chips; optional **Due date** badge (distinct when overdue); optional assignee avatar(s); optional comment count. Cards should read as compact, scannable units.
- **Drag & drop**: Cards within a List and between Lists; Lists reorderable. Needs an obvious drop indicator, a clear "dragging" state for the source and dragged element, and a hover affordance that hints cards are movable.

**States on this screen (design every one):**
- Empty Board (no Lists yet) and empty List.
- A Board the current user only views vs. owns (control visibility).
- Presence: several avatars; a Member joining/leaving live.
- Cards arriving/moving/disappearing from *other users'* actions in realtime.
- Realtime connection state (connected / reconnecting) — a subtle, unalarming signal.

### 4.4 Card detail

Opened by clicking a Card — a **modal or side panel** (your call, be opinionated). Contents:

- **Title** — editable inline.
- **Description** — a free-text block, editable inline.
- **Labels** — pick from the Board's palette (multi-select). Adding/removing should update the Card on the Board behind the panel in realtime.
- **Due date** — set/clear date and optional time; show overdue clearly when past (including overdue state *while the panel is open* and in the compact badge on the Board).
- **Assignees** — pick from the Board's Members (multi-select); avatars sync to the Card on the Board.
- **Comments** — a chronological thread, oldest first, newest appended at the bottom. Author can edit and delete their own. Composer at the bottom. Live: a Comment from another Member while the panel is open must slide in without a refresh.
- **Archive** action — moves the Card to archive; restorable. (No permanent delete anywhere in the product.)

**Realtime wrinkle to design for:** the panel may be open on two screens at once. If someone edits the Description you're looking at, the text updates live. Don't design for complex merge visuals — the product is last-write-wins — just reflect the new server state gracefully.

### 4.5 Board menu panels

- **Members**: list of Members with online/offline signal (ties to presence); **invite by email** (Owner); **remove** (Owner). The invite flow and its empty/unresolved-email states need design.
- **Labels**: the Board's **Label palette** — 8 slots, each a name + a color from a fixed color set. Owner manages the palette; Members just use it on Cards.
- **Activity**: reverse-chronological feed of the fixed verb set: List created/renamed; Card created, moved between Lists, archived/restored; Description edited; Label added/removed; Due date set/changed; assignee added/removed; Comment added; Member added/removed; Board renamed. Each entry: who, what, when — scannable, quiet, not noisy.
- **Owner settings**: rename and **delete** (permanent, destructive — needs a real confirmation pattern: explicit, typed, clearly irreversible).

---

## 5. Realtime behavior — design with this in mind

The app's defining trait is that **everyone sees everything live**. Your design must make this feel natural, not surprising:

- **Instant local echo** — when I act, my UI updates before the server confirms. Nothing should feel like a round-trip.
- **Live remote updates** — other users' Cards move, titles change, Comments land on screen *as they happen*, with no refresh.
- **Rollback** — if the server rejects a change, the client gently reverts. Design for the *rejected* moment to be quiet and non-jarring (a subtle nudge, not a modal).
- **Presence** — the header avatars are the live heartbeat of the Board.
- **Last-write-wins** — concurrent edits to the same field resolve to the later write. The UI should not pretend to merge; it just reflects current truth.

---

## 6. Design the full state inventory

For every interactive component, deliver: **default, hover, focus, active/selected, dragging, disabled, error, and loading/skeleton**. Plus the page-level states: **empty, populated, loading, offline/reconnecting, and permission-limited (viewer vs Owner)**.

Particularly design these edge moments well — they're where realtime apps feel cheap or polished:

- First visit to a Board with no Lists.
- An empty List in a busy Board.
- A Card that becomes overdue while a viewer is looking at it.
- A second Member's Comment landing at the bottom of an open thread.
- A Member leaving/joining while the Board is open.
- A rejected drag (rollback snap-back) — should feel firm, not broken.

---

## 7. Sample content to design with

Use this realistic Board in your mockups (vocabulary from Section 2, please):

> **Board: "Mobile App Launch"** — owned by Priya, Members: Priya, Marcus, Ana, Leo.

- **Backlog**
  - "Finalize onboarding copy" — Label *Content*, assignee Priya, due date overdue.
  - "Deep-link handling" — Label *Engineering*, assignee Marcus, 3 Comments.
  - "Beta feedback triage" — 1 Comment.
- **In Progress**
  - "Push-notification permissions" — Labels *Engineering*, *Blocked*, assignees Marcus + Ana.
  - "Press kit assets" — Label *Marketing*, assignee Ana, due date in 2 days.
- **Done**
  - "Design tokens" — Label *Design*, assignee Leo.
  - "Auth flow" — Labels *Engineering*, *Content*.

Dashboard for the same user: **Mobile App Launch** (owner), **Editorial Calendar** (joined), **Q3 Hiring** (joined), and the **Create Board** affordance.

---

## 8. Creative freedom (read this)

**Fixed — do not change:**
- The feature inventory and behavior in Sections 3–6.
- The vocabulary in Section 2.
- The product personality: minimal, polished, production-grade; calm and focused.
- The information hierarchy implied per screen (what must be visible vs. tucked in menus).

**Free — your canvas:**
- Visual direction, color palette, typography, spacing, radii, elevation, iconography, illustration style, motion. Explore **2–3 distinct visual directions** rather than one safe option. A strong identity is welcome — the app must not look like generic SaaS or a Trello skin.
- Light vs. dark (recommend: design **light first**, define the dark mapping as a stretch).
- Layout details: modal vs. side-panel for Card detail; Board canvas density; how Lists visually nest in the canvas.
- Icon system style; avatar treatment (initials vs. photo, with graceful fallback).

**Define a small token system** and name it: functional **Label colors** (8, fixed set), **overdue** red, status colors (success/error/warning), plus the core palette, type scale, spacing, radii, elevation, and motion durations/easing.

---

## 9. Standards & accessibility

- **Desktop-first**, since the Board canvas is a wide horizontal space. Design a graceful tablet state. A full phone board layout is a stretch goal — at minimum, note how it degrades.
- **Keyboard operability**: drag & drop needs a keyboard-usable alternative (reorder via menus/keys). All modals trap focus and dismiss on Escape.
- **Color contrast** at WCAG AA for text; focus states visible everywhere; tooltips for icon-only controls.
- **Reduced motion** honored; motion used sparingly and meaningfully (state changes, not decoration).
- Touch targets ≥ 44px for interactive elements on the Board.

---

## 10. Out of scope (please do not design for)

No notifications (in-app or external), no board-level search or card filters, no card covers/images, no checklists, no @-mentions, no card **deletion**, no board templates, no calendar/timeline views, no external integrations, no undo/redo history, no comments on Activity entries.

---

## 11. Deliverables we need back

1. **2–3 visual directions** (moodboards/high-fi home + Board view) before full execution.
2. Full high-fidelity designs for every screen in Section 4, in both a typical state and its empty/loading/permission variants.
3. The **state inventory** from Section 6 as a checkable list.
4. The **token system** (colors, type, spacing, radii, elevation, motion) with names ready to map to code.
5. Motion spec for: drag & drop, list/card add, presence avatar enter/leave, overdue flip, rollback snap-back, modal open/close.
6. **Sample board mockups** rendered with the Section 7 content so we can all speak the same language.
7. A short handoff note mapping your components to the product vocabulary (List, Card, Label, Due date, Comment, Activity, Archive, Presence strip) and to React components (Next.js implementation).
