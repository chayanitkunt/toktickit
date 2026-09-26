# Lab 4 UI Specification — TokTickIT

Reuses Zen Green tokens, buttons, badges, form/validation conventions, and responsive breakpoints
established in `docs/lab-02/ui-spec.md` and extended in `docs/lab-03/ui-spec.md`. Only new/changed
screens and components are detailed below.

## 0. Navigation Changes
- Every authenticated role gains a **Dashboard** nav link and it becomes the default post-login
  landing route (replacing a direct drop into My Tickets / My Queue).
  - Requester nav: **Dashboard**, My Tickets, Create Ticket.
  - IT Staff nav: **Dashboard**, My Queue, Create Ticket (unchanged optional item from Lab 3).
  - Administrator nav: **Dashboard** (reuses the IT Staff dashboard, see §2), My Queue, Admin
    (Users).
- Active-page indication (underline/bold + `aria-current="page"`) is required on every nav item,
  including the new Dashboard link, per handout §7.

## 1. IT Staff / Administrator Dashboard
Concise operational starting point. Approved metric cards, plus a "My Recent Tickets" list and
Quick Actions, each linking into the existing Ticket Queue / Ticket Detail.

- **Header**: "Welcome back, {name}!" subtitle, **Refresh** button (re-fetches all dashboard data
  without a full page reload).
- **Metric cards** (each: label, value, and a drill-down affordance — the whole card is a link/
  button, not just decorative text):
  1. **New** — Tickets with status New. Drill-down → Ticket Queue filtered `status=NEW`.
  2. **Open** — status Open. → `status=OPEN`.
  3. **In Progress** — status In Progress. → `status=IN_PROGRESS`.
  4. **Waiting for Requester** — status Waiting for Requester. → `status=WAITING_FOR_REQUESTER`.
  5. **Unassigned** — `ownerId IS NULL` and not Closed/Cancelled. → Ticket Queue filtered
     `ownerId=unassigned`. *(Required by handout §6 Dashboard Rules; not present in the stakeholder
     mockup — see §7 Mockup Corrections.)*
  6. **My Assigned** — owned by the current user, not Closed/Cancelled/Resolved. → Ticket Queue
     filtered `ownerId=me`.
  7. **By IT Priority** — three small counts (Low/Medium/High) among open Tickets, rendered as one
     compact card with three badge+count pairs, not three separate cards. → Ticket Queue filtered
     `priority={value}`. *(Required by handout §6; not present in the mockup — see §7.)*
- **My Recent Tickets** — list of up to 5 Tickets owned by the current user, most recently updated
  first: Ticket No. (link), Summary, Status badge, Last Updated. "View all" → My Queue filtered
  `ownerId=me`, sorted `updatedAt desc`.
- **Quick Actions**: Create Ticket, Search Tickets (→ My Queue with search focused), My Queue.
- **States**: loading (skeleton cards), empty (zero Tickets exist yet — first-run message, no
  error), safe-failure (retry banner, no raw error text), forbidden (Requester redirected before
  this route renders).
- **Responsive**: metric cards wrap from a 5–7-across grid (desktop) to 2-across (tablet) to a
  single column (mobile); My Recent Tickets and Quick Actions stack vertically below the cards on
  tablet/mobile, matching the two-column-to-stacked pattern already used elsewhere.
- Administrator reuses this screen unmodified (handout §4.6); no separate Administrator dashboard
  is built.

## 2. Requester Dashboard
Summarizes only the authenticated Requester's own Tickets; helps them see what needs attention,
what changed recently, and what was resolved — without duplicating the full My Tickets screen.

- **Header**: "Welcome, {name}!" subtitle.
- **Metric cards**:
  1. **My Open Tickets** — status in New, Open, In Progress, Reopened. → My Tickets filtered to
     that status set.
  2. **Waiting for Requester** — status Waiting for Requester. *(Required by handout §6; the
     stakeholder mockup omits this card — see §7.)* → My Tickets filtered `status=WAITING_FOR_REQUESTER`.
  3. **Resolved** — status Resolved. → My Tickets filtered `status=RESOLVED`.
  4. **Closed** — status Closed. → My Tickets filtered `status=CLOSED`.
  - Each card shows "View all" beneath the count, same as the stakeholder mockup.
- **My Recent Tickets** — up to 5 of the Requester's own Tickets, most recently updated first:
  Ticket No. (link), Summary (truncated), Status badge, Last Updated.
- **Quick Actions**: Create Ticket, View My Tickets.
- **States**: loading, empty (no Tickets created yet — points at Create Ticket), safe-failure,
  forbidden (non-Requester roles never reach this route).
- **Ownership protection**: every number and every listed Ticket comes from a backend query scoped
  to `requesterId = session.userId`; the client never supplies or can override that scope (BR-16).
- **Responsive**: same grid-to-stack rules as §1.

## 3. Actions Taken (Ticket Detail — both IT Staff and Requester views)
Added as a new section/tab on the existing Ticket Detail screen, positioned after
Comments/Notes/Attachments. Reuses the existing tab styling from Lab 3 (the "Service Actions" tab
that was reserved-and-disabled in Lab 3 is now enabled and renamed **Actions Taken**).

- **List/table** (desktop): columns Action Date/Time, Description, Result, Performed By, Follow-Up
  (badge: "Yes — see note" / "No"), Attachment Notes. Sorted oldest first, newest at the bottom
  (append-only convention, matching Comments/Notes).
- **Card layout** (tablet/mobile): one card per Action Taken, same fields stacked, no horizontal
  scroll.
- **Create mode** (IT Staff/Administrator only): "+ Add Action Taken" button opens an inline form
  or slide-over with fields: Action Description (textarea, required), Result (textarea, required),
  Follow-Up Required? (Yes/No toggle), Follow-up Note (textarea, appears/required only when
  Follow-Up Required = Yes; disabled and cleared when No), Attachment Notes (text input, optional,
  helper text "e.g. IMG_0231.jpg on shared drive"). Action Date/Time and Performed By are shown as
  read-only, auto-filled placeholders ("will be recorded automatically") — never editable inputs.
- **Edit mode** (IT Staff/Administrator only): same form pre-filled, opened via an "Edit" action per
  row; Action Date/Time and Performed By render read-only exactly as in create mode and are never
  submitted as editable fields, matching BR-08.
- **Requester view**: identical list, fully read-only — no Add/Edit affordances render at all (not
  just disabled) since Requesters cannot perform this action server-side either.
- **Validation**: inline field errors (Description/Result required; Follow-up Note required exactly
  when Follow-Up Required = Yes) shown before submit attempts where possible, and re-shown from the
  server's 400 response otherwise.
- **Conflict feedback**: if an edit's `expectedUpdatedAt` is stale (someone else edited it first),
  show a non-destructive banner — "This action was updated by someone else. Reload to see the
  latest version before editing." — and do not submit; the in-progress edit's text stays visible so
  nothing is lost.
- **Empty state**: "No Actions Taken recorded yet" with, for IT Staff/Administrator, an inline
  "+ Add Action Taken" affordance in the empty state itself.
- **Duplicate-submit protection**: the Add/Save button disables itself and shows a spinner for the
  duration of the request (same pattern as Create Ticket's Submit button), preventing a double
  click from creating two rows (FR-15).

## 4. Ticket Workflow and Resolution Feedback
- The Current Status control (IT Staff/Administrator Ticket Detail, from Lab 3) continues to show
  only permitted next statuses per the transition matrix.
- **New gate feedback**: if the caller attempts **Resolved** while zero Actions Taken exist, the
  Resolved option in the status dropdown is disabled with an inline hint — "Add an Action Taken
  before resolving this Ticket" — that links directly to the Actions Taken section's Add form. The
  UI hint is a convenience; the server enforces BR-10 regardless (handout §8.4: "the backend remains
  the authority").
- **Conflict feedback**: if a status change's `expectedUpdatedAt` is stale, show the same
  non-destructive conflict banner pattern as §3 rather than silently applying or discarding the
  change; the Ticket summary is refreshed from the server response before the user can retry.
- Successful changes refresh the Ticket summary status immediately (Lab 3 regression, re-verified).

## 5. Final Regression and Product Hardening (visual/UX checklist)
- All Requester, IT Staff, and Administrator screens from Labs 1–3 remain reachable to their
  permitted roles, with unchanged navigation, ownership, comments, notes, attachments, user
  management, and authentication behavior.
- Loading, validation, success, empty/no-results, forbidden, conflict, not-found, and safe
  API-failure feedback use one consistent visual pattern (banner/toast/inline style) across every
  Lab 1–4 screen, not a mix of ad-hoc styles introduced sprint-by-sprint.
- Duplicate actions from repeated clicking or network retry are prevented or safely handled
  everywhere a mutating action exists (Create Ticket, Claim, status change, comments, notes,
  Actions Taken).
- Important forms (Create Ticket, Change Password, Actions Taken create/edit, Admin create/edit
  user) preserve entered data after a recoverable failure so nothing has to be retyped.
- No console errors, broken links, placeholder/lorem-ipsum text, or disabled-but-unlabeled controls
  remain anywhere in the application.

## 6. Responsive and Accessibility Requirements
Same as Labs 2 and 3 (`docs/lab-02/ui-spec.md` §Responsive/Accessibility, reaffirmed in
`docs/lab-03/ui-spec.md`): usable at desktop/tablet/mobile breakpoints, keyboard-navigable forms,
menus, and dashboard cards (each card/drill-down is a real `<button>`/`<a>`, not a `div` with an
`onClick`), visible focus states, labeled form controls (including the Follow-Up Required toggle
and every dashboard metric card, via `aria-label`), non-color status cues (icon or text alongside
every badge, not color alone), sufficient contrast, and no clipped content, overlapping controls, or
horizontal page scrolling on any new screen.

## 7. Mockup Corrections (vs. stakeholder mid-fidelity mockups)
Documented here before build, per Spec DD, so the discrepancy is intentional rather than missed:

1. **Product name in the mockup header** — the provided mockups render the wordmark "TikTockIT".
   The application's actual name, used everywhere else in this repository and in every prior lab
   (`README.md`, Labs 1–3 docs), is **TokTickIT**. The built header must say TokTickIT.
2. **IT Staff Dashboard is missing required cards** — the mockup shows New/Open/In
   Progress/Waiting for Requester/My Assigned only. Handout §6 Dashboard Rules explicitly requires
   **Unassigned Tickets** and **Tickets by status or IT Priority** as well; both are added per §1
   above even though the mockup does not show them.
3. **Requester Dashboard is missing a required card** — the mockup shows My Open/In Progress/
   Resolved/Closed only. Handout §6 explicitly requires **"Tickets waiting for the Requester"**;
   it is added per §2 above.
4. **Requester Dashboard mockup nav shows "My Tickets" as the active/only item** — per §0 above,
   the Requester's default landing route becomes **Dashboard**, with **My Tickets** as a separate,
   still-present nav item; the mockup's nav is a cropped/earlier-state screenshot and should not be
   read as removing the Dashboard entry point.
5. **No "Service Actions" placeholder remains** — Lab 3's reserved-and-disabled "Service Actions"
   tab (`docs/lab-03/ui-spec.md` §5) is now the live, enabled **Actions Taken** section per §3
   above; no disabled placeholder tab may remain anywhere in the built UI.