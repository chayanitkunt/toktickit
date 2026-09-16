# Lab 3 Engineering Specification — TokTickIT

## 1. Sprint Goal
Sprint 3 replaces the temporary Development Requester selector with real authentication and
role-based authorization, and delivers the first operational IT Staff Ticket workflow and a
minimalist Administrator user-management screen, without breaking any completed Lab 2 behavior.

## 2. Stakeholder Request (interpreted)
Users must log in with an email/password instead of picking a fake Requester. Anyone whose
password was set by an Administrator must change it before doing anything else. Requesters keep
using the ticket features from Lab 2, but ownership now comes from the logged-in account. IT Staff
get a shared queue to find tickets, claim them, set an internal priority, talk to the Requester
through Public Comments, keep private Internal Notes, and move the ticket through its status
workflow. Requesters can flag a ticket as "looks resolved" but only IT Staff/Admin can actually
resolve or close it. Administrators get one simple screen to manage accounts: create, edit, assign
a role, activate/deactivate, and reset a password. Every rule above must be enforced by the server,
not just hidden in the UI.

## 3. Scope

### In scope
- Email/password authentication, mandatory first-login password change, logout, current-user.
- Server-side role-based authorization (Requester, IT Staff, Administrator) + ownership checks.
- Migration of Lab 2 `Requester` records into a real `User` model; removal of the Dev Requester selector.
- IT Staff Ticket Queue (search/filter/sort/pagination) + Ticket Detail (claim/reassign, IT Priority,
  status transitions, Public Comments, Internal Notes).
- Requester Ticket Detail regression: Public Comments + "Problem Appears Resolved" flag.
- Minimalist Administrator User Management screen (list/search/filter, create, edit, activate/deactivate,
  reset initial password).

### Explicitly excluded (per handout §4.2)
Email invitations/password-reset emails, MFA, social login/SSO, self-registration, Actions Taken,
SLA/escalation/notifications, dashboards/KPI analytics, multi-tenant/department structures,
production deployment changes, multiple roles per user, user deletion/bulk ops/import-export/audit
history, extended profile fields, account unlocking/approval workflows, pagination/multi-sort/multi-filter
beyond the minimum described here.

## 4. Functional Requirements

**Authentication**
- FR-01 A user can log in with email + password and receive an authenticated session.
- FR-02 A user can log out, which invalidates the session immediately.
- FR-03 A user can fetch their current identity, role, and password-change requirement.
- FR-04 A user flagged `mustChangePassword` is blocked from all other authenticated routes until
  they submit a valid new password.

**Authorization / navigation**
- FR-05 The client shows only navigation and actions permitted for the current role; the server
  independently enforces every permission regardless of what the client sends or hides.

**Requester (regression + additions)**
- FR-06 All Lab 2 Requester ticket/attachment functions work unchanged, using the authenticated
  identity instead of a selected Development Requester.
- FR-07 A Requester can post a Public Comment on their own ticket.
- FR-08 A Requester can mark a ticket "Problem Appears Resolved" without changing `currentStatus`.

**IT Staff**
- FR-09 IT Staff can list/search/filter/sort/paginate the shared Ticket Queue.
- FR-10 IT Staff can open Ticket Detail for any Ticket in the system, per the Authorization Matrix
  (§5.2) — access is not limited to tickets the IT Staff member currently owns.
- FR-11 IT Staff can claim an unassigned Ticket, or reassign a Ticket to another eligible active
  Ticket Owner (active IT Staff or Administrator, per §5.2), regardless of who currently owns it.
- FR-12 IT Staff can set IT Priority independently of Requested Priority.
- FR-13 IT Staff can change `currentStatus` following the permitted transition matrix (§5.1).
- FR-14 IT Staff can post Public Comments and Internal Notes.

**Administrator**
- FR-15 An Administrator can list users with search (name/email) and an optional role filter.
- FR-16 An Administrator can create a user with name, email, one role, active state, and an initial
  password.
- FR-17 An Administrator can edit a user's name, email, role, and active state.
- FR-18 An Administrator can set a new initial password that forces a change at next login.
- FR-19 The server rejects duplicate emails, self-deactivation, and removing the last active Admin.

## 5. Business Rules
- BR-01 Only an active user with valid credentials may authenticate.
- BR-02 A user with `mustChangePassword = true` cannot access any route other than
  `/auth/change-password` and `/auth/me`/`/auth/logout` until a valid new password is saved.
- BR-03 Ownership of every Requester operation is derived from the authenticated session's user id,
  never from a client-supplied id.
- BR-04 Public Comments are visible to the ticket's Requester, all IT Staff, and all Administrators.
  Internal Notes are visible only to IT Staff and Administrators.
- BR-05 A Requester may set `problemAppearsResolved = true` but cannot set `currentStatus` to
  Resolved or Closed.
- BR-06 Only an active IT Staff or Administrator user may be a Ticket Owner.
- BR-07 IT Priority defaults to Requested Priority on ticket creation and may only be changed by
  IT Staff or Administrator afterward.
- BR-08 Allowed statuses are New, Open, In Progress, Waiting for Requester, Resolved, Closed,
  Reopened, Cancelled; only the transitions in §5.1 are permitted, and only for IT Staff/Admin
  (except the Requester's resolved-flag in BR-05).
- BR-09 A Public Comment or Internal Note with empty/whitespace-only content is rejected; content is
  capped at 2,000 characters and rendered as plain text (no HTML execution).
- BR-10 Login attempts do not reveal whether the failure was a bad email or a bad password
  ("Invalid email or password" for both) or that an account exists but is inactive beyond a generic
  "account is inactive" message.
- BR-11 Passwords are never stored or logged in plaintext; they are hashed with bcrypt at a work
  factor ≥ 10. Rationale: bcrypt is already compatible with the course's Node/Express stack, is
  deliberately slow against brute-force attempts, and needs no extra infrastructure — sufficient for
  this local lab's threat model (see §11).
- BR-12 Logging out invalidates the session/token server-side; a reused token after logout is
  rejected.
- BR-13 An email address is unique across all users (case-insensitive) regardless of role.
- BR-14 An Administrator cannot deactivate their own account.
- BR-15 The server rejects any operation that would leave zero active Administrators.
- BR-16 Deactivated users cannot authenticate, even with correct credentials, and cannot be assigned
  as a new Ticket Owner.
- BR-17 Requester regression: existing Ticket/Attachment ownership checks from Lab 2 continue to
  apply keyed on `User.id` (formerly `Requester.id`).

### 5.1 Ticket Status Transition Matrix
Requesters never change `currentStatus` directly — see BR-05; they may only set
`problemAppearsResolved = true`. All transitions below are IT Staff/Administrator only.

| Current Status | Allowed Next Status | Confirmation Required |
|---|---|---|
| New | Open, Cancelled | No |
| Open | In Progress, Waiting for Requester, Cancelled | No |
| In Progress | Waiting for Requester, Resolved, Cancelled | No |
| Waiting for Requester | In Progress, Resolved, Cancelled | No |
| Resolved | Closed, Reopened | Yes |
| Closed | Reopened | Yes |
| Reopened | In Progress, Resolved, Cancelled | No |
| Cancelled | Reopened | Yes |

Any transition not listed for a given Current Status is rejected with 422 (BR-08). "Confirmation
Required" means the UI must show a confirm dialog before submitting the change (§ `ui-spec.md`);
the server enforces the matrix regardless of whether the client confirmed.

### 5.2 Authorization Matrix
Per handout §4.3, Administrator and IT Staff responsibilities are conceptually separate, but this
team's decision is that Administrators **may** perform IT Staff ticket operations (an Administrator
is a superset operator for Lab 3, since the course excludes a separate "IT Staff supervisor" role).
This is a deliberate, documented choice, not a default.

| Operation | Requester | IT Staff | Administrator |
|---|:---:|:---:|:---:|
| Login / logout / current user | ✓ | ✓ | ✓ |
| View own Tickets | ✓ | – | – |
| Create Ticket | ✓ | – | – |
| Manage own Attachments | ✓ | – | – |
| Post Public Comment | ✓ (own Ticket) | ✓ | ✓ |
| Set "Problem Appears Resolved" | ✓ (own Ticket) | – | – |
| View IT Staff Ticket Queue | – | ✓ | ✓ |
| Open any Ticket Detail (staff view) | – | ✓ | ✓ |
| Claim / reassign Ticket ownership | – | ✓ | ✓ |
| Set IT Priority | – | ✓ | ✓ |
| Change Ticket status | – | ✓ | ✓ |
| Create Internal Note | – | ✓ | ✓ |
| View Internal Notes | – | ✓ | ✓ |
| User Management (create/edit/activate/reset password) | – | – | ✓ |

Every row above is enforced server-side by `requireRole(...)` on the corresponding route (see
`api-spec.md`), independent of what the client UI shows or hides.

## 6. UI Specification Summary
See `ui-spec.md`. Screens: Login, Change Password (forced), authenticated App Shell
(role-aware nav + logout), Requester Ticket Detail (+ Public Comments, resolved flag), IT Staff
Ticket Queue (table + responsive card list), IT Staff Ticket Detail (ownership, IT Priority, status,
Public Comments tab, Internal Notes tab, Attachments), Administrator User Management (list +
create/edit side panel). All screens reuse Zen Green tokens, badges, and form conventions from
Lab 2 and cover loading/empty/no-results/forbidden/validation/safe-failure states.

## 7. Data Changes
- New `User` model replaces `Requester` as the identity table: `id, name, email (unique, ci),
  passwordHash, role (Requester|ItStaff|Administrator), isActive, mustChangePassword, createdAt,
  updatedAt`.
- `Ticket.requesterId` now references `User.id` (role = Requester at creation time).
- `Ticket` gains: `ownerId Int?` (FK → User, nullable), `itPriority RequestedPriority?`
  (defaults to `requestedPriority` on create), `problemAppearsResolved Boolean @default(false)`.
- `CurrentStatus` enum extended to: NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED,
  CLOSED, REOPENED, CANCELLED (existing PENDING data mapped to WAITING_FOR_REQUESTER on migration).
- New `TicketComment` model: `id, ticketId, authorId, content, createdAt` (Public Comments).
- New `TicketNote` model: `id, ticketId, authorId, content, createdAt` (Internal Notes, IT Staff/Admin
  only).
- Indexes on `Ticket.ownerId`, `User.email`, `User.role`.
- **Migration**: existing `Requester` rows are copied into `User` with role=Requester,
  `isActive` preserved, and a documented seeded initial password (must-change=true); `Ticket.requesterId`
  is repointed to the new `User.id` values (ids preserved via a 1:1 migration so no ticket ownership
  changes). The old `Requester` table and the client's `DevelopmentRequesterContext` are removed
  after migration.
- **Seed data**: idempotent (upsert by email); 4 active + 1 inactive Requester, 3 active + 1 inactive
  IT Staff, 1 active Administrator; sample tickets across statuses/priorities/ownership; a few sample
  Public Comments and Internal Notes. All seeded passwords are documented in `README.md` as fake,
  local-development-only credentials — never reused as real credentials and never containing any
  team member's personal password or secret.

## 8. API Contract
See `api-spec.md` for full request/response shapes. Summary of endpoint groups:
`POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`,
`POST /api/auth/change-password`; existing Lab 2 Ticket/Attachment routes now read the user from
the session instead of a `requesterId` query/body param; `GET /api/staff/tickets` (queue, with
`q, status, priority, ownerId, sort, page, pageSize`), `GET /api/staff/tickets/:id`,
`POST /api/staff/tickets/:id/claim`, `PATCH /api/staff/tickets/:id/priority`,
`PATCH /api/staff/tickets/:id/status`, `POST /api/staff/tickets/:id/comments`,
`POST /api/staff/tickets/:id/notes`; `GET /api/admin/users`, `POST /api/admin/users`,
`PATCH /api/admin/users/:id`, `POST /api/admin/users/:id/reset-password`. Public Comments use a
single shared endpoint (`/api/tickets/:id/comments`) for Requester, IT Staff, and Administrator
alike — see `api-spec.md §Comments` for the authorization rule that governs it, rather than a
duplicate staff-only comments endpoint.

## 9. Acceptance Criteria

**Authentication**
- AC-01 (FR-01/BR-01) Valid credentials + active account → 200 with user id/name/role.
- AC-02 (FR-04/BR-02) `mustChangePassword=true` → any non-allowlisted route returns 403 with a
  `password_change_required` code until a valid new password is saved.
- AC-03 (BR-10) Wrong password, unknown email, and an inactive account's correct credentials all
  return the same generic 401 "Invalid email or password" — no case reveals which one occurred.
- AC-04 (FR-02/BR-12) After logout, replaying the previous session cookie against any protected
  route returns 401.
- AC-05 (FR-03) `GET /api/auth/me` returns the caller's own id/name/role/mustChangePassword and
  never another user's data.

**Requester ownership & regression**
- AC-06 (BR-03) Authenticated Requester sends a different `requesterId` in the body → server
  ignores it and only returns/affects the caller's own data.
- AC-07 (FR-06/BR-17) All Lab 2 create/list/detail/attachment operations succeed for the
  authenticated Requester and are still scoped to tickets that Requester owns.
- AC-08 (FR-07) A Requester can post a Public Comment on their own ticket and it appears with their
  name, role badge, and timestamp.
- AC-09 (FR-08/BR-05) A Requester can set `problemAppearsResolved=true`; attempting to set
  `currentStatus` on the same route is rejected with 403 and the status is unchanged.

**IT Staff queue & ticket operations**
- AC-10 (FR-09) Queue search/filter/sort/pagination each narrow or order results correctly;
  unsupported query parameter values return 400.
- AC-11 (FR-11/BR-06) Claiming an unassigned ticket succeeds; assigning an inactive or
  Requester-role user as owner is rejected with 422.
- AC-12 (FR-12/BR-07) Setting IT Priority updates it independently of the (unchanged) Requested
  Priority; a Requester attempting this gets 403.
- AC-13 (BR-08/§5.1) An illegal status transition (e.g., New → Closed directly) is rejected with
  422 and the ticket status is unchanged; a listed transition marked "Confirmation Required" still
  succeeds via the API once submitted (confirmation is a client-side UX gate, not a server rule).
- AC-14 (FR-14/BR-04) A Public Comment is visible to the ticket's Requester, IT Staff, and
  Administrator; an Internal Note is visible only to IT Staff/Administrator.
- AC-15 (AC target for BR-04) A Requester calling the Internal Notes endpoint gets 403 and no note
  content is present anywhere in the response body.
- AC-16 (BR-09) Posting an empty or whitespace-only Public Comment or Internal Note is rejected
  with 400 and nothing is persisted.

**Administrator user management**
- AC-17 (FR-15) The user list can be searched by partial name/email and filtered by role, returning
  only matching users.
- AC-18 (FR-16/BR-13) Creating a user with an existing email (any case) → 409 conflict; a valid
  create sets `mustChangePassword=true`.
- AC-19 (FR-17) Editing a user's name, email, role, and active state persists all four fields
  correctly and is reflected on the next `GET /api/admin/users`.
- AC-20 (FR-18) Resetting a user's password sets a new hash and `mustChangePassword=true`; that
  user's next login is forced into the Change Password flow.
- AC-21 (FR-19/BR-14) An Administrator attempting to deactivate their own account is rejected with
  409 and their account remains active.
- AC-22 (FR-19/BR-15) Deactivating or changing the role of the last active Administrator is
  rejected with 409.

**Cross-role authorization**
- AC-23 (FR-05/§5.2) For every protected route, a role not listed as permitted in the Authorization
  Matrix receives 403 (or 401 if unauthenticated), regardless of client-side navigation state.

**Migration & regression**
- AC-24 (§7 Data Changes) After migration, every pre-existing Ticket's `requesterId` resolves to
  the correct migrated `User` record, and no Ticket or Attachment row is lost or reassigned.

## 10. Definition of Done
- All FR/BR/AC above implemented and covered by at least one automated test in
  `server/tests/lab-03/*`, `client/tests/lab-03/*`, and `client/tests/e2e/lab-03/*`.
- `npm run build` and full test suites (unit/API/UI/E2E) pass on `main`.
- Lab 2 regression suite still passes unmodified (or updated only for the auth-context swap).
- Seed script runs idempotently against a fresh database.
- Screenshots captured for desktop/tablet/mobile for every new/changed screen.
- `docs/lab-03/*.md`, `reviewer.md`, and `ai-use.md` complete and linked from the submission PDF.

## 11. Assumptions and Decisions
- Session strategy: signed, httpOnly cookie session (server-side session store) rather than JWT —
  simplest to invalidate on logout and adequate for a local course lab (see `api-spec.md §Auth`).
- Case-insensitive email uniqueness enforced at the application layer plus a citext/lower-index at
  the DB layer.
- `PENDING` (Lab 2) is renamed/mapped to `WAITING_FOR_REQUESTER` during migration; no ticket loses
  data.
- IT Priority is stored as its own nullable column rather than overloading `requestedPriority`, so
  the original Requester value is always preserved for audit/comparison in the UI.
- Per §5.2, this team chose to let Administrators perform IT Staff ticket operations (queue,
  claim, priority, status, notes) in addition to user management, rather than restricting
  Administrators to user management only — Lab 3 has no separate "supervisor" role, and requiring a
  second Admin login just to unblock a stuck queue would add friction with no corresponding
  requirement to prevent it.
- Comments use one shared endpoint (`/api/tickets/:id/comments`) for all three roles rather than
  parallel Requester/Staff endpoints, to avoid two implementations of the same visibility rule
  (BR-04) drifting out of sync; see `api-spec.md`.