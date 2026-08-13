# Trello Clone

A simplified project-management platform for organizing work through boards, lists, and cards, with real-time collaboration.

## Language

**User**:
A person with an account, identified by email and password, who can sign in to the application.
_Avoid_: Account, person, individual

**Board**:
A collaborative space for organizing work, owned by a User who invites Members to it.
_Avoid_: Project, workspace, team, space

**Member**:
A User who belongs to a Board. Membership is the unit of access control on a Board.
_Avoid_: Collaborator, participant, team member

**Owner**:
The User who created a Board and holds its lifecycle powers: renaming it, inviting and removing Members, and deleting it.
_Avoid_: Admin, manager, creator

**List**:
A vertical column of Cards within a Board.
_Avoid_: Column, lane, stage

**Card**:
The smallest unit of work in a List, carrying a description, Labels, a due date, assigned Members, and Comments.
_Avoid_: Task, ticket, item, to-do

**Label**:
A named, colored marker from a Board's palette that Cards reference. Labels are a shared vocabulary within a Board.
_Avoid_: Tag, badge, category

**Due date**:
An optional date and time on a Card, shown as overdue once it has passed. It carries no completion semantics.
_Avoid_: Deadline, scheduled date

**Comment**:
A piece of text a Member attaches to a Card, shown chronologically. Its author may edit or remove it.
_Avoid_: Note, reply, message

**Archive**:
A soft-deleted state a Card can be moved to and restored from. Archiving never destroys data.
_Avoid_: Delete, trash, remove

**Activity**:
A record of a change made to a Board or Card, shown in the board's activity feed.
_Avoid_: Log, event, audit trail
