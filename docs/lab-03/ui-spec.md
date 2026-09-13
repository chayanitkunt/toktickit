# Lab 3 UI Specification — TokTickIT

Reuses Zen Green tokens, buttons, badges, form/validation conventions, and responsive breakpoints
established in `docs/lab-02/ui-spec.md`. Only new/changed screens are detailed below.

## Shared shell (all authenticated screens)
- Header: logo, role-appropriate nav links, `Profile ▾` menu with Logout.
  - Requester nav: "My Tickets", "Create Ticket".
  - IT Staff nav: "My Queue", "Create Ticket" (optional, if IT Staff may also raise tickets — otherwise omit).
  - Administrator nav: "Admin" (Users).
- Modes: **Authenticated** (normal), **Password-change-required** (nav hidden, only the Change
  Password form is reachable, attempting direct navigation redirects back to it).
- Feedback states used throughout: loading (skeleton/spinner), saving (disabled button + spinner),
  success (toast/banner), validation (inline field errors), empty, no-results, forbidden (403 page/
  banner), safe failure (generic retry banner, no raw error text).

## 1. Login
- Fields: Email, Password (show/hide toggle). Primary action: "Sign In".
- States: idle → busy (button disabled, spinner) → success (redirect) | error (inline banner:
  "Invalid email or password. Please try again." — used for bad credentials AND inactive accounts).
- Link: "Forgot your password?" renders but is disabled/non-functional with a tooltip "Contact your
  Administrator" (password-reset email is out of scope for Lab 3).

## 2. Change Password (forced)
- Shown immediately after login when `mustChangePassword=true`; blocks all other navigation.
- Fields: Current (temporary) password, New password, Confirm new password, live checklist
  (≥8 chars, upper+lower, number, special character), Confirm-match validation.
- On success: redirect into the normal app shell for the user's role.

## 3. Requester — Ticket Detail (regression + additions)
- Unchanged Lab 2 layout (Ticket info, Attachments) plus:
  - **Public Comments** tab/section: list (author, role badge, timestamp, content) + "Add Public
    Comment" box, newest last, scroll if long.
  - **"Problem Appears Resolved"** button/toggle near status; confirmation dialog on click; once
    set, shows a green "You indicated this appears resolved" badge (does not change Current Status
    badge, which remains IT Staff-controlled).
- Editable vs read-only: Requester can never edit Current Status, IT Priority, or Ticket Owner —
  those fields render in the existing Lab 2 read-only style.

## 4. IT Staff — Ticket Queue
- Header: search box ("Search by ticket number or summary…"), Filters button (Status, Category,
  Requested/IT Priority, Owner: Me/Unassigned/All), sort-toggle column headers.
- Desktop: table — Ticket No., Created Date, Summary, Category, Req. Priority (badge), IT Priority
  (badge), Status (badge), Owner. Row click → Ticket Detail.
- Tablet/mobile: card list — one card per ticket with the same fields stacked, same badges, tap to
  open detail. No horizontal scroll/mega-grid.
- Footer: pagination controls (Prev/Next + page numbers), "Showing X to Y of Z tickets".
- States: loading (skeleton rows/cards), empty (no tickets exist yet), no-results (filters/search
  matched nothing — "Clear filters" action), forbidden (non-staff redirected before this renders),
  failure (retry banner).

## 5. IT Staff — Ticket Detail
- Extends Lab 2's Ticket Detail with an operational panel:
  - **Ticket Owner**: dropdown of active IT Staff/Admin + "Unassigned"; "Claim" button when
    unassigned and current user isn't the owner.
  - **IT Priority**: dropdown (Low/Medium/High), separate from the read-only Requested Priority.
  - **Current Status**: dropdown restricted to statuses reachable from the current one (per the
    transition matrix in `specification.md`); a confirmation dialog appears for terminal
    transitions (Resolved, Closed, Cancelled).
  - **Resolution Summary**: optional text field, visible to Requester once set.
- Tabs: **Public Comments** | **Internal Notes** | **Attachments** | (Service Actions tab reserved,
  disabled in Lab 3 — "Available in Lab 4").
  - Public Comments and Internal Notes are visually distinct: different tab color/icon and a
    persistent "🔒 Internal — not visible to Requester" label above the Internal Notes composer, to
    prevent accidentally posting private info publicly.
- Editable vs read-only: Requester, Category, Related System, Summary, Description remain read-only
  for IT Staff (Lab 3 doesn't include ticket-content editing by staff).

## 6. Administrator — User Management
- Single screen, two-pane on desktop (list + slide-over create/edit panel), stacked on mobile.
- List: Name, Email, Role (badge), Status (Active/Inactive badge), Edit action. Search box (name or
  email) + optional Role filter dropdown. No pagination/multi-sort required (per scope), but the
  list is still capped to a sane page size internally to avoid an unbounded render.
- Create/Edit panel fields: Full Name, Email Address, Role (dropdown: Requester/IT Staff/
  Administrator), Active (toggle), Initial Password (create mode) / "Set new initial password"
  action (edit mode, opens a small confirm-and-enter-password sub-form).
- Safety-rule feedback (all rendered as inline validation/conflict banners, not silent no-ops):
  - Duplicate email → inline field error on Email.
  - Attempting to deactivate your own account → banner: "You can't deactivate your own account."
  - Attempting to remove the last active Administrator → banner: "At least one active Administrator
    is required."
- States: loading, empty (no users match search — shouldn't happen with seed data, but handled),
  validation, success (toast "User created"/"User updated"), forbidden (non-Admin never reaches this
  route), safe failure.

## Mockup corrections (vs. mid-fidelity mockups)
The team's mid-fidelity mockups (rendered from an AI image tool) contained a few deviations from
this spec and the handout. These are noted here so the discrepancy is documented before build, per
Spec DD:

1. **Status badge wording** — mockups show a "Pending" status. Per `specification.md` BR-08, the
   correct value/label is **"Waiting for Requester"**; "Pending" must not appear anywhere in the
   built UI.
2. **Requester Ticket Detail tabs** — mockups show live "Service Actions" and "Event Log" tabs.
   "Service Actions" (Actions Taken) is explicitly out of scope for Lab 3 (handout §4.2) and must
   render disabled/reserved only, per §5 above. "Event Log" is not part of the Lab 3 scope at all and
   must not be built.
3. **Admin Users list columns** — mockups omit the Email column. Handout §8.5 requires
   Name, Email, Role, Status, and an Edit action; the built list must include all five.
4. **Create/Edit User — initial password** — mockups show a "Send password reset email" checkbox.
   Email delivery of passwords/reset links is explicitly out of scope (handout §4.2). The built form
   must use a plain **Initial Password** text field that the Administrator sets directly, per §6
   above and `api-spec.md`.
5. **Change Password fields** — confirm the built form has all three fields (Current/temporary
   password, New password, Confirm new password); a cropped mockup should not be read as an
   intentional two-field design.

## Responsive & accessibility
Same rules as Lab 2 (`docs/lab-02/ui-spec.md` §Responsive/Accessibility): usable at desktop/tablet/
mobile breakpoints, keyboard-navigable forms and menus, visible focus states, labeled form controls,
sufficient color contrast for all new badges (role, status, priority).