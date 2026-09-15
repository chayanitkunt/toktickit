# Lab 3 Responsive & Visual QA Checklist — Issue 8 / GitHub Issue #35

This checklist is completed by walking every major Lab 3 screen at three
viewports (desktop 1280×720, tablet 768×1024, mobile 390×844) and recording
the result. Screenshots are captured automatically by
`client/tests/e2e/visual.spec.ts` (run via `npx playwright test visual.spec.ts`
from `client/`) and saved to `artifacts/lab-03/screenshots/<screen>/`.

Run once per Playwright project (`chromium`, `tablet`, `mobile`) to produce
all three viewport captures per screen — the project name is appended to
each file (e.g. `list-chromium.png`, `list-tablet.png`, `list-mobile.png`).

## Screens covered

| Screen | Screenshot folder | Spec |
|---|---|---|
| Login | `authentication/` | `visual.spec.ts` |
| My Tickets | `my-tickets/` | `visual.spec.ts` |
| Create Ticket (empty + validation error) | `create-ticket/` | `visual.spec.ts` |
| Requester Ticket Detail | `ticket-detail/` | `visual.spec.ts` |
| IT Staff Ticket Queue | `staff-queue/` | `visual.spec.ts` |
| IT Staff Ticket Detail (Public Comments + Internal Notes) | `staff-ticket-detail/` | `visual.spec.ts` |
| Administrator User Management (list + Create User panel) | `user-management/` | `visual.spec.ts` |

## Checklist

Mark each row Pass / Issue for **every** screen above, at **every** viewport.
Note the screen + viewport in the Notes column for anything marked Issue.

Completed by reviewing all 30 captured screenshots in
`artifacts/lab-03/screenshots/` on 2026-09-15. Row 8 (focus states) cannot be
judged from a static screenshot — it was left unchecked pending a manual
keyboard pass (see note below) rather than assumed to pass.

| # | Check | Desktop | Tablet | Mobile | Notes |
|---|---|---|---|---|---|
| 1 | Zen Green consistency — same color tokens, buttons, cards, and typography as Lab 2 screens; new screens don't look like a different app | Pass | Pass | Pass | Header green, card/button/badge styling consistent across all 7 screens at every viewport. |
| 2 | Role navigation — only the current role's nav destinations are shown (Requester: My Tickets/Create Ticket; IT Staff: My Queue; Administrator: My Queue + Users); no unauthorized links visible | Pass | Pass | Pass | Confirmed per-role header nav in screenshots: Requester sees My Tickets/Create Ticket, IT Staff sees My Queue, Administrator sees My Queue + Users. |
| 3 | Status badges — consistent pill style/colors across Ticket Queue, Ticket Detail, and My Tickets for every status value | Pass | Pass | Pass | "New" (blue), "Active"/"Inactive" (green/red) render identically across My Tickets, Staff Queue, and both Ticket Detail screens. |
| 4 | Priority badges — Requested Priority and IT Priority use consistent, distinguishable colors (Low/Medium/High) | Pass | Pass | Pass | Low=green, Medium=amber, High=red, consistent everywhere they appear. |
| 5 | Role badges — author role badge (Requester/IT Support/Administrator) renders correctly next to Public Comments and Internal Notes authors | Pass | Pass | Pass | Requester (blue), IT Staff (green), Administrator (purple) badges are distinct in the User Management list; no comments/notes with multiple authors were present in the captured tickets to double-check author badges directly on a comment/note — re-verify next time a ticket with populated comments is captured. |
| 6 | Editable vs read-only fields — read-only fields (e.g. Requester's Current Status/IT Priority/Owner) are visually distinct from editable controls | Pass | Pass | Pass | Requester Ticket Detail uses shaded gray boxes for read-only fields vs. white bordered inputs/dropdowns for editable ones (Staff Ticket Detail). Clear and consistent. |
| 7 | Public Comments vs Internal Notes are visually distinct (background/badge/lock icon) so private content can't be mistaken for public | Pass | Pass | Pass | Internal Notes tab has a lock icon + amber "Internal — not visible to Requester" banner + an orange "Post Internal Note" button, vs. the plain green "Post Comment" button on Public Comments. Not color-only — the lock icon and banner text carry the distinction too. |
| 8 | Focus states — Tab through interactive controls (search, filters, buttons, tabs) and confirm a visible focus outline on each | ☐ *(not verifiable from screenshots — see note)* | ☐ | ☐ | Static screenshots capture default state, not mid-Tab focus. **Action needed:** manually tab through Login, Staff Queue filters, Staff Ticket Detail tabs, and User Management before marking this row. |
| 9 | Clipping / overlap — no text or controls are cut off, overlapping, or hidden behind another element | **Issue** | **Issue** | Pass | **User Management, Desktop, `create-panel-chromium.png`:** with the Create User panel open, the list column is squeezed and every row's "Edit" button is clipped to "Ed". **Staff Ticket Queue / My Tickets, Tablet:** badge text is sliced mid-word ("MEE", "LO", "HI") at the right edge of the table — see row 10. |
| 10 | Horizontal overflow — no unintended horizontal scrollbar on the page body (the Ticket Queue table's own internal horizontal scroll on narrow viewports is expected and acceptable) | Pass | **Issue** | Pass (cards, not table) | **Staff Ticket Queue (`list-tablet.png`) and My Tickets (`list-tablet.png`) at 768px:** table is cut off after the Requested/IT Priority columns (Status, Owner, Last Updated not reachable in the capture) with no visible scrollbar or scroll affordance. This is more than the "expected" internal scroll called out in this row's own description — it reads as content being lost, not scrollable. Needs a real horizontal-scroll container (or a `overflow-x: auto` + visible scrollbar/shadow cue) at this breakpoint, or switch to the card layout mobile already uses. |
| 11 | Responsive behavior — filters/table/panels reflow sensibly (e.g. Ticket Queue table scrolls horizontally instead of squashing columns unreadably; User Management Create panel stacks below the list on narrow viewports) | Pass | **Issue** | Pass | Mobile correctly switches both ticket tables to stacked cards, and the User Management Create panel correctly stacks below the list at both tablet and mobile. The one open item is the tablet-width *table* layout described in row 10 — it neither scrolls cleanly nor switches to cards. |
| 12 | Loading / empty / no-results / forbidden / safe-failure feedback renders as designed wherever it was captured or manually triggered | Pass | Pass | Pass | Create Ticket validation-error screenshots show red outlines + inline error text + error icons on every invalid field. Internal Notes screenshot happened to capture the loading spinner state, which renders as a clear green spinner. Empty states ("No public comments yet.", "No active attachments.") render with plain, readable copy. |

## How to run

```bash
cd client
npx playwright test visual.spec.ts --project=chromium
npx playwright test visual.spec.ts --project=tablet
npx playwright test visual.spec.ts --project=mobile
```

(Or `npx playwright test visual.spec.ts` to run all three projects in one
invocation, per `client/playwright.config.ts`.)

## Result

- [x] All screenshots captured for all three viewports under
      `artifacts/lab-03/screenshots/`.
- [ ] All checklist rows above are Pass. *(Rows 9, 10, 11 have open issues; row 8 needs a manual keyboard pass.)*
- [ ] No critical responsive or visual issues remain open.

**Overall status:** Issues found — see below. Not ready to close Issue #35 until the tablet table-overflow bug and the User Management Edit-button clipping bug are fixed (or explicitly accepted as known issues) and row 8 is manually verified.

**Open issues (if any):**
- **[Tablet, Staff Ticket Queue & My Tickets]** Table content (badge text and the rightmost columns) is cut off at 768px with no usable way to reach it — not just an "internal scroll," content appears lost. Fix: add a real scrollable container with a visible scroll cue at this breakpoint, or switch to the mobile card layout earlier.
- **[Desktop, User Management, Create panel open]** "Edit" button text is clipped to "Ed" in every list row because the list column is squeezed too narrow when the side panel is open. Fix: give the Name/Email columns a min-width or truncate with ellipsis instead of letting the Edit button shrink.
- **[All viewports]** Focus states (row 8) still need a manual keyboard-only pass — screenshots can't confirm this one.