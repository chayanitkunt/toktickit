# Lab 4 Engineering Specification — TokTickIT

## 1. Sprint Goal
Sprint 4 completes the core TokTickIT service-desk workflow. It adds an auditable Actions Taken
record under each Ticket so IT Staff can plan and track the actual work performed, adds a hard
backend gate so a Ticket cannot be marked Resolved without evidence of that work, gives Requesters
and IT Staff concise role-appropriate dashboards linked back to the detailed screens they already
have, and hardens the complete application — built across Labs 1 to 3 — for final demonstration,
without losing any previously delivered behavior.

## 2. Stakeholder Request (interpreted)
The service desk can already receive Tickets and IT Staff can already talk to Requesters, but there
is still no reliable record of what work was actually done. Every Ticket needs an Actions Taken log:
who did what, when, with what result, and whether the Requester needs to hear back from IT Staff
again. The Ticket Owner still coordinates the Ticket as a whole, but any IT Staff member may log
work on it. A Requester saying "this looks fixed" is a helpful signal, not a decision — only IT
Staff/Administrator can actually resolve the Ticket, and they must have something on record showing
they reviewed the work before they do. Both Requesters and IT Staff want a short dashboard — not a
new report, just a faster way into the lists and tickets they already use. Finally, everything built
in Labs 1–3 needs to keep working, look consistent under Zen Green, and be demo-ready.

## 3. Scope

### In scope
- Actions Taken: create, view, and edit under a Ticket (Action Date/Time, Action Description,
  Result, Performed By, Follow-Up Required?, Follow-up Note, Attachment Notes).
- A backend gate requiring at least one Action Taken before a Ticket can be marked Resolved.
- Finalized, re-verified Ticket status transition matrix (unchanged from Lab 3) and optimistic
  concurrency on status changes and Action Taken edits.
- Requester Dashboard and IT Staff/Administrator Dashboard: concise metrics with drill-down into
  the existing Ticket Queue / My Tickets / Ticket Detail screens.
- Final regression and hardening pass across every Lab 1–3 screen and API.

### Explicitly excluded (per handout §4.2)
Automatic SLA clocks, escalation engines, on-call scheduling, breach notifications; email/SMS/LINE/
push notifications; spare-parts/inventory/purchasing/cost accounting; time-sheet billing/payroll/
labor-cost calculation; multi-level approval workflows and e-signatures; custom report builders/BI
tools/export warehouses; multi-tenant organizations and production-scale cloud operations; any new
feature not named in this document; real file upload attached to an Action Taken (Attachment Notes
is a text pointer only — see §11).

## 4. Functional Requirements

**Actions Taken**
- FR-01 An active IT Staff or Administrator can create an Action Taken on any Ticket, recording
  Action Description, Result, Follow-Up Required?, Follow-up Note (conditionally), and Attachment
  Notes; Action Date/Time and Performed By are always set by the server.
- FR-02 An active IT Staff or Administrator can edit Description, Result, Follow-Up Required,
  Follow-up Note, and Attachment Notes of an existing Action Taken.
- FR-03 A Requester can view every Action Taken recorded on their own Ticket, read-only, in stable
  chronological order.
- FR-04 IT Staff/Administrator can view every Action Taken recorded on any Ticket in the same
  stable order.

**Ticket workflow**
- FR-05 The backend enforces the finalized status transition matrix (§5.1) for every status-change
  request, independent of which client screen (or lack of one) sent it.
- FR-06 A Ticket cannot transition to Resolved unless at least one Action Taken already exists on
  it; the API rejects the attempt with a safe, specific error.
- FR-07 A Requester can continue to set "Problem Appears Resolved" without changing `currentStatus`
  (Lab 3 regression, BR-11).
- FR-08 A status change or Action Taken edit submitted against a stale copy of the record is
  rejected with a safe 409 conflict instead of silently overwriting a more recent change.

**Dashboards**
- FR-09 An authenticated Requester can view a personal dashboard: open Ticket count, Tickets
  waiting on the Requester, recently updated Tickets, and recently resolved Tickets — scoped
  strictly to that Requester.
- FR-10 An authenticated IT Staff/Administrator can view an operational dashboard: unassigned
  Tickets, Tickets owned by the current user, Ticket counts by status and by IT Priority, and
  recently updated Tickets owned by the current user.
- FR-11 Every dashboard card has an accessible drill-down action that opens the corresponding
  filtered Ticket Queue, My Tickets, or Ticket Detail view.
- FR-12 Dashboard endpoints return concise, purpose-built summaries, never a full unfiltered Ticket
  collection.

**Hardening / regression**
- FR-13 All approved Lab 1–3 functionality (authentication, Requester ticket/attachment lifecycle,
  IT Staff queue and detail, Public Comments, Internal Notes, Administrator user management)
  continues to work unchanged.
- FR-14 Loading, validation, success, empty/no-results, forbidden, conflict, not-found, and safe
  API-failure feedback is consistent across every Lab 1–4 screen.
- FR-15 A duplicate Action Taken caused by a double click or a network retry is prevented or safely
  deduplicated rather than creating two records.

## 5. Business Rules
- BR-01 An Action Taken belongs to exactly one Ticket.
- BR-02 The Ticket Owner coordinates the Ticket, but an Action Taken may be recorded by a different
  IT Staff member.
- BR-03 Performed By is always the authenticated actor's identity; it is never accepted from the
  client and can never be changed after creation.
- BR-04 Action Date/Time is set by the server at creation and can never be changed after creation.
- BR-05 Action Description and Result are required, non-empty, and capped at 2,000 characters
  each; Attachment Notes is optional free text capped at 500 characters.
- BR-06 When Follow-Up Required is true, Follow-up Note is required and non-empty; when Follow-Up
  Required is false, Follow-up Note must be empty. A request violating either half is rejected.
- BR-07 Any active IT Staff or Administrator may create an Action Taken on any Ticket in the
  system; access is not limited to the Ticket's current Owner (consistent with Lab 3 §5.2).
- BR-08 Any active IT Staff or Administrator may edit Description, Result, Follow-Up Required,
  Follow-up Note, and Attachment Notes on an existing Action Taken; the Ticket it belongs to, its
  Performed By, and its Action Date/Time can never be changed by an edit.
- BR-09 Requesters have read-only access to all Actions Taken on their own Ticket; Requesters can
  never create or edit an Action Taken (handout §4.3).
- BR-10 A Ticket may transition to Resolved only if at least one Action Taken already exists for
  that Ticket. This is the server-enforced form of "IT Staff must review the work and formally
  update the Ticket" and applies even if a client bypasses the normal screen.
- BR-11 A Requester's "Problem Appears Resolved" flag is advisory only: it never creates, edits, or
  substitutes for an Action Taken, and it never changes `currentStatus` (carried over from Lab 3
  BR-05).
- BR-12 Ticket status transitions follow the matrix in §5.1; only IT Staff/Administrator may change
  `currentStatus`, and only along a listed transition (unchanged from Lab 3 BR-08, re-verified for
  Lab 4).
- BR-13 A status change or an Action Taken edit must include the caller's last-seen `updatedAt` for
  that record; if it no longer matches the current stored value, the write is rejected with 409 and
  nothing changes (optimistic concurrency; see §7).
- BR-14 All Lab 3 authorization, authentication, ownership, comment, note, attachment, and
  user-management rules (Lab 3 BR-01 through BR-17) remain in force unchanged.
- BR-15 Every dashboard metric is computed by the backend from live data at request time; no metric
  is cached on the client or maintained by hand.
- BR-16 The Requester Dashboard returns only counts and Ticket summaries owned by the authenticated
  Requester; the IT Staff/Administrator Dashboard returns organization-wide operational data and is
  reachable only by IT Staff and Administrator roles.

### 5.1 Ticket Status Transition Matrix (finalized, unchanged from Lab 3)
Requesters never change `currentStatus` directly (BR-11); they may only set
`problemAppearsResolved = true`. All transitions below remain IT Staff/Administrator only, and a
transition into **Resolved** additionally requires BR-10 (at least one Action Taken on the Ticket).

| Current Status | Allowed Next Status | Confirmation Required | Extra Gate |
|---|---|---|---|
| New | Open, Cancelled | No | — |
| Open | In Progress, Waiting for Requester, Cancelled | No | — |
| In Progress | Waiting for Requester, Resolved, Cancelled | No | Resolved requires BR-10 |
| Waiting for Requester | In Progress, Resolved, Cancelled | No | Resolved requires BR-10 |
| Resolved | Closed, Reopened | Yes | — |
| Closed | Reopened | Yes | — |
| Reopened | In Progress, Resolved, Cancelled | No | Resolved requires BR-10 |
| Cancelled | Reopened | Yes | — |

Any transition not listed for a given Current Status is rejected with 422 (BR-12). A transition
into Resolved with zero Actions Taken is rejected with 422 and a distinct `resolution_requires_action_taken`
code (BR-10). Tickets that were already Resolved/Closed under Lab 3 seed/demo data before this rule
existed are not retroactively invalidated — see §11.

### 5.2 Authorization Matrix (Actions Taken and Dashboards only — extends Lab 3 §5.2)

| Operation | Requester | IT Staff | Administrator |
|---|:---:|:---:|:---:|
| Create Action Taken | – | ✓ (any Ticket) | ✓ (any Ticket) |
| Edit Action Taken | – | ✓ (any Ticket) | ✓ (any Ticket) |
| View Actions Taken | ✓ (own Ticket only) | ✓ (any Ticket) | ✓ (any Ticket) |
| Change Ticket status to Resolved | – | ✓ (requires BR-10) | ✓ (requires BR-10) |
| View Requester Dashboard | ✓ (own data only) | – | – |
| View IT Staff/Administrator Dashboard | – | ✓ | ✓ |

Every row is enforced server-side by `requireRole(...)` and ownership checks (see `api-spec.md`),
independent of what the client UI shows or hides. All Lab 3 rows (login, queue, claim, priority,
comments, notes, user management) continue unchanged.

## 6. UI Specification Summary
See `ui-spec.md`. New/changed screens: role-aware **Dashboard** landing page (separate Requester
and IT Staff/Administrator variants), an **Actions Taken** section added to the existing IT Staff
and Requester Ticket Detail screens (list + create mode + view/edit mode), and a refreshed Ticket
status control that surfaces the Resolved-requires-Action-Taken gate as an inline message rather
than a generic failure. All screens reuse Zen Green tokens, badges, cards, tables, and
loading/empty/no-results/forbidden/conflict/safe-failure conventions from Labs 2–3. Navigation adds
a **Dashboard** link as the default landing route for every authenticated role.

## 7. Data Changes
- New `ActionTaken` model: `id, ticketId (FK → Ticket), actionAt (DateTime, server-set at create,
  immutable), description (String), result (String), performedById (FK → User, server-set,
  immutable), followUpRequired (Boolean, default false), followUpNote (String?, required iff
  followUpRequired), attachmentNotes (String?), createdAt (DateTime @default(now())), updatedAt
  (DateTime @updatedAt — doubles as the optimistic-concurrency token, see below)`.
- `Ticket` gains relation `actionsTaken ActionTaken[]`; `User` gains relation
  `actionsPerformed ActionTaken[]` (named relation `ActionPerformedBy`).
- Indexes: `@@index([ticketId])` and `@@index([performedById])` on `ActionTaken`, matching the
  indexing pattern already used on `TicketComment`/`TicketNote`.
- No changes to `CurrentStatus`, `RequestedPriority`, `Role`, or any Lab 1–3 column; the Resolved
  gate (BR-10) is application logic, not a schema constraint, so it can be tested independently of
  migration correctness.
- **Optimistic concurrency**: no new "version" column. `Ticket.updatedAt` (already present,
  `@updatedAt`) and the new `ActionTaken.updatedAt` serve as the concurrency token. A status-change
  or Action Taken-edit request must include `expectedUpdatedAt`; the server compares it against the
  current stored value inside the same transaction as the write and rejects with 409 on mismatch.
- **Migration**: a new Prisma migration adds the `action_taken` table, its foreign keys, and
  indexes only; no existing table or column is altered. Existing Tickets simply have zero rows in
  the new relation. Rollback is the standard Prisma `down` migration (drop `action_taken`), which is
  safe because no other table depends on it.
- **Seed data**: idempotent (upsert by natural key / skip-if-exists), extending the Lab 3 seed
  without removing or renumbering existing rows. Adds Actions Taken so that: at least one Ticket has
  zero Actions Taken (regression/empty-state proof), at least one has exactly one, and at least one
  has multiple Actions Taken recorded by different IT Staff members (BR-02 proof) — including at
  least one already-Resolved Ticket with a qualifying Action Taken, so the Resolved gate can be
  demonstrated as both a pass and a block case (§11).
- Two justified design decisions (of several) are expanded in §11: (1) reusing `updatedAt` instead
  of adding a version column, and (2) keeping `actionAt` independent of `createdAt`/`updatedAt`.

## 8. API Contract
See `api-spec.md` for full request/response shapes. Summary of endpoint groups:
`POST /api/staff/tickets/:id/actions`, `PATCH /api/staff/tickets/:id/actions/:actionId`,
`GET /api/tickets/:id/actions` (shared Requester/IT Staff/Admin endpoint, same pattern as the Lab 3
Comments endpoint — see `api-spec.md §Actions Taken`); `PATCH /api/staff/tickets/:id/status` gains a
required `expectedUpdatedAt` field and the BR-10 gate; `GET /api/dashboard/requester`;
`GET /api/dashboard/staff`. All Lab 2–3 endpoints continue unchanged.

## 9. Acceptance Criteria
- AC-01 (FR-01/BR-01/BR-03/BR-04) Given a permitted IT Staff user and valid data, when an Actions
  Taken is created, then it is saved under the correct Ticket with the authenticated creator as
  Performed By and a server-set Action Date/Time.
- AC-02 (FR-09/BR-16) Given an authenticated Requester, when dashboard data is retrieved, then only
  metrics and recent Tickets owned by that Requester are returned.
- AC-03 (BR-06) Creating an Action Taken with Follow-Up Required = true and an empty Follow-up Note
  is rejected with 400 and nothing is persisted; the reverse (Follow-Up Required = false with a
  non-empty Follow-up Note) is also rejected with 400.
- AC-04 (BR-09) A Requester calling the create or edit Action Taken endpoint receives 403 and no
  Action Taken is created or changed.
- AC-05 (FR-03) A Requester viewing their own Ticket sees every recorded Action Taken, read-only,
  oldest first.
- AC-06 (BR-02/BR-07) Two different IT Staff members can each record an Action Taken on the same
  Ticket even though only one of them is the current Ticket Owner.
- AC-07 (FR-02/BR-08) Editing Description/Result/Follow-Up fields on an existing Action Taken
  succeeds and leaves Ticket, Performed By, and Action Date/Time unchanged.
- AC-08 (FR-06/BR-10) Attempting to transition a Ticket with zero Actions Taken to Resolved is
  rejected with 422/`resolution_requires_action_taken` and the status is unchanged; after at least
  one Action Taken is recorded, the same transition succeeds.
- AC-09 (BR-12/§5.1) An illegal status transition (e.g., New → Closed directly) is rejected with
  422 and the Ticket status is unchanged.
- AC-10 (FR-08/BR-13) Submitting a status change or Action Taken edit with a stale
  `expectedUpdatedAt` is rejected with 409 and the record is unchanged; resubmitting with the
  current value succeeds.
- AC-11 (FR-11) Each dashboard metric card's drill-down opens the correctly filtered Ticket Queue,
  My Tickets, or Ticket Detail view.
- AC-12 (FR-10) The IT Staff dashboard's Unassigned, My Assigned, and by-status counts exactly
  match the equivalent Ticket Queue filter query results.
- AC-13 (FR-12/BR-15) No dashboard endpoint ever returns a full, unfiltered Ticket collection.
- AC-14 (FR-15) Double-submitting the Actions Taken create form (double click or simulated network
  retry) results in at most one persisted Action Taken.
- AC-15 (FR-13) Representative Lab 1–3 regression — authentication, Requester ticket/attachment
  lifecycle, IT Staff queue/detail, Public Comments, Internal Notes, and Administrator user
  management — all continue to pass unmodified.
- AC-16 (FR-09) A Requester with zero Tickets sees every dashboard metric as 0 with an appropriate
  empty state and no error.
- AC-17 (BR-07) An Action Taken can be created on a Ticket regardless of who its current Ticket
  Owner is, as long as the caller is an active IT Staff or Administrator.

## 10. Definition of Done
- All FR/BR/AC above are implemented and covered by at least one automated test in
  `server/tests/lab-04/*`, `client/tests/lab-04/*`, and `e2e/lab-04/*`.
- `npm run build` and the full unit/API/UI/E2E suites pass on `main`.
- The complete Lab 1–3 regression suite still passes unmodified (or updated only where this sprint's
  contract explicitly changes shared behavior, e.g. the `status` endpoint's new required field).
- Seed script runs idempotently against a fresh database and demonstrates both zero and non-zero
  values for every dashboard metric.
- Screenshots captured for desktop/tablet/mobile for every new/changed screen
  (`artifacts/lab-04/screenshots/`).
- No console errors, broken links, placeholder text, or unfinished controls remain anywhere in the
  application.
- `docs/lab-04/*.md`, `reviewer.md`, and `ai-use.md` are complete and linked from the submission
  PDF; this specification predates the merged implementation PRs (see `reviewer.md` for timestamps).

## 11. Assumptions and Decisions
- **Resolution gate is an added rule, not literal handout text.** The handout says only that "IT
  Staff must review the work and formally update the Ticket." This team operationalizes that as
  BR-10 (≥ 1 Action Taken required before Resolved) because it is the only way to make that
  requirement server-enforceable and testable rather than a UI convention.
- **Any active IT Staff/Administrator — not only the original author — may edit an Action Taken**
  (BR-08), matching the handout's plain "IT Staff and Administrators can create and update Actions
  Taken" rather than narrowing it to the creator. Ticket, Performed By, and Action Date/Time stay
  immutable so the audit trail of *who originally did the work and when* can never be rewritten.
- **Optimistic concurrency reuses the existing `updatedAt` timestamp** as the token (via a
  client-supplied `expectedUpdatedAt`) instead of adding a numeric `version` column. This needs no
  schema change beyond what Prisma's `@updatedAt` already provides, and millisecond-timestamp
  granularity is sufficient for this course lab's single-database, low-concurrency setting.
- **`actionAt` is kept independent of `createdAt`/`updatedAt`** even though they hold the same value
  at insert time in Lab 4 (Actions Taken cannot be backdated in this sprint). This keeps the
  business-meaning timestamp separate from Prisma's own audit columns, so a future sprint could
  allow a backdated `actionAt` without touching the audit trail — no behavior change today, but no
  migration needed later either.
- **Actions Taken are ordered oldest-first**, matching the existing Public Comments/Internal Notes
  convention and the handout's "append-only" framing for the Ticket workflow.
- **Dashboard "recently updated" / "recently resolved" means the top-N most recent by `updatedAt`**,
  not a calendar-day window, to avoid a server/client timezone mismatch that the handout explicitly
  flags as a team decision (§6.2). N = 5 for both dashboards' list widgets.
- **Attachment Notes stays a plain text pointer** ("what file to look for"), per the handout's own
  wording; Lab 4 does not add real file upload to an Action Taken. Actual files continue to use the
  existing Lab 2 Attachment model and lifecycle on the Ticket itself.
- **Legacy Resolved/Closed Tickets from Lab 3 seed/demo data are not retroactively invalidated** by
  BR-10; the gate is enforced only on new transition attempts going forward, so existing regression
  evidence from Labs 2–3 remains valid without doctoring old data.
- **Administrator continues as a superset operator** for Actions Taken and dashboards, consistent
  with the Lab 3 §5.2 decision — no new "supervisor" role is introduced in Lab 4.
- **The Requester Dashboard and IT Staff Dashboard are separate endpoints and separate landing
  routes** (not one endpoint with a role switch in the response body), so each response shape stays
  small and each route's authorization check stays a simple single-role check.