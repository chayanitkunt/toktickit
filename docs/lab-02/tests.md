# Lab 2 Test Plan and Traceability Matrix

## 1. Test Strategy

The Lab 2 testing strategy combines Unit, API/Integration, React Component UI,
and End-to-End (E2E, run across desktop/tablet/mobile viewports) automated
tests to verify the engineering contract.

Every path in this document is a real file in this repository, and every
command in Section 4 is a real npm/npx script. This table is regenerated
against actual test output — a row is only marked **Pass** after that exact
command has been run against the current `main` branch.

## 2. Planned Automated Tests

| Test ID | Level | AC Ref | What It Tests | Expected Result | Automated Test File Path |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **UNIT-01** | Unit | AC-01 | Ticket Number Generator | Returns a string matching `TKT-\d{4}-\d{6}` and varies across calls | `server/tests/lab-02/ticket-number.unit.test.ts` |
| **UNIT-02** | Unit | AC-04, AC-05 | Attachment mime-type & size validators | Accepts JPG/PNG/WEBP/PDF ≤ 5 MB; rejects everything else | `server/tests/lab-02/attachment-validator.unit.test.ts` |
| **API-01** | API | AC-01 | Ticket Creation API | 201 Created; ticket number matches format; `currentStatus` is `NEW` | `server/tests/lab-02/create-ticket.test.ts` |
| **API-02** | API | AC-01 | Ticket Creation validation | 400 on missing header, inactive requester, short summary/description, invalid priority, unknown category | `server/tests/lab-02/create-ticket.test.ts` |
| **API-03** | API | AC-08, AC-09 | My Tickets list, search & pagination | Returns only the requester's own tickets, correct pagination metadata, and matches search term | `server/tests/lab-02/my-tickets.test.ts` |
| **API-04** | API | — | Active Development Requester list | Returns only active requesters, ordered by id | `server/tests/lab-02/requesters.test.ts` |
| **API-05** | API | AC-03 | Ticket Detail ownership guard | 200 for the owning requester; 404 for any other requester; 400 for missing/invalid id | `server/tests/lab-02/ticket-detail.test.ts` |
| **API-06** | API | AC-01 (attachments) | Attachment download / add / soft-remove | Download streams the file; add respects the 5-attachment cap; soft-remove requires a reason and hides the item from GET detail | `server/tests/lab-02/ticket-detail.test.ts` |
| **UI-01** | UI Component | AC-02 | Dev Requester Selection Context | Loads and displays active requesters; selecting one updates current requester | `client/tests/lab-02/requester.test.tsx` |
| **E2E-01** | E2E | AC-02 | Development Requester selection | Selecting a requester updates the visible "Current requester" label | `client/tests/e2e/requester.spec.ts` |
| **E2E-02** | E2E | AC-01 | Create Ticket happy path | Requester submits a valid ticket and returns to My Tickets | `client/tests/e2e/create-ticket.spec.ts` |
| **E2E-03** | E2E | AC-04 | Attachment selection at creation time | A valid file is accepted by the file input before submission | `client/tests/e2e/create-ticket.spec.ts` |
| **E2E-04** | E2E | AC-08, AC-09 | My Tickets search/filter/sort/pagination | Search, category/priority/status filters, sort asc & desc, pagination, and Clear Filters all update the visible list | `client/tests/e2e/my-tickets.spec.ts` |
| **E2E-05** | E2E | AC-01 | Ticket Detail view mode | Opening a ticket from My Tickets shows its read-only fields and returns via Back | `client/tests/e2e/ticket-detail.spec.ts` |
| **E2E-06** | E2E | AC-01 (attachments) | Attachment download | Clicking Download on the seeded attachment triggers a browser download | `client/tests/e2e/ticket-detail.spec.ts` |
| **E2E-07** | E2E | AC-07 | Attachment soft removal | Adding then soft-removing an attachment (with a required reason) removes it from the active list | `client/tests/e2e/ticket-detail.spec.ts` |
| **E2E-08** | E2E | AC-03 | Ownership protection (API) | A direct request for another requester's ticket ID returns 404 | `client/tests/e2e/ticket-detail.spec.ts` |
| **E2E-09** | E2E | AC-03 | Ownership protection (UI) | A ticket created by Requester A never appears in Requester B's My Tickets, including via search | `client/tests/e2e/ticket-detail.spec.ts` |
| **VISUAL-01** | Visual/Responsive | AC-10 | Screenshot capture | Captures Requester Selection, My Tickets, Create Ticket (initial + validation error), and Ticket Detail at desktop/tablet/mobile viewports | `client/tests/e2e/visual-qa.spec.ts` |

All E2E and Visual tests above run once per Playwright project (`chromium`
1280px, `tablet` 768px, `mobile` 390px — see `client/playwright.config.ts`),
so each row represents three actual test runs, one per viewport.

## 3. Acceptance-Criterion Traceability Matrix

(Acceptance Criteria as numbered in `docs/lab-02/specification.md`.)

| Acceptance Criterion | Planned Test IDs | Coverage Verification |
| :--- | :--- | :--- |
| **AC-01** (Ticket Creation) | `UNIT-01`, `API-01`, `API-02`, `E2E-02`, `E2E-05` | Number format, validation, and full UI flow covered |
| **AC-02** (Requester Context Guard) | `UI-01`, `E2E-01` | Selector loads/updates correctly |
| **AC-03** (Ownership Isolation) | `API-05`, `E2E-08`, `E2E-09` | API and UI isolation both verified |
| **AC-04** (File Type Limit) | `UNIT-02`, `E2E-03` | Validator logic and UI acceptance verified |
| **AC-05** (File Size Limit) | `UNIT-02` | Boundary at 5 MB verified |
| **AC-06** (Max Attachments Limit) | `API-06` | 5-active-attachment cap verified at API level |
| **AC-07** (Soft Removal & Reason) | `API-06`, `E2E-07` | DB update, required-reason enforcement, and UI flow verified |
| **AC-08** (My Tickets Filter & Search) | `API-03`, `E2E-04` | Query building and UI list state verified |
| **AC-09** (Pagination) | `API-03`, `E2E-04` | Metadata and page navigation verified |
| **AC-10** (Responsive UI) | `VISUAL-01` | Desktop/tablet/mobile screenshots captured for manual visual QA |

## 4. Test Execution Commands

```bash
# Backend unit + API/integration tests (Vitest + Supertest)
cd server
npm test

# Frontend component tests (Vitest + Testing Library)
cd client
npm test

# End-to-end tests across all three viewport projects
# (requires the backend running on http://localhost:3000
#  and the frontend dev server, which Playwright starts automatically)
cd client
npx playwright test

# Just the Ticket Detail / attachment / ownership suite
npx playwright test ticket-detail.spec.ts

# Regenerate visual QA screenshots into artifacts/lab-02/screenshots/
npx playwright test visual-qa.spec.ts
```

## 5. Final Results

Run the commands above against the current `main` branch and paste the
actual terminal output here (test counts and pass/fail), then update this
section before submission. Do not mark a row "Pass" in Section 2 without a
corresponding run recorded here.

## 6. Known Limitations or Deferred Tests

- `client/tests/lab-02/` only has component-level coverage for the
  Development Requester selector. `CreateTicket`, `MyTickets`, and
  `TicketDetail` do not yet have dedicated React Testing Library component
  tests — their behavior is currently proven only through the Playwright
  E2E suite. This is an accepted gap for Lab 2, not a hidden one.
- The Requester Ticket Detail screen does not currently display
  soft-removed attachments (per `ui-spec.md`'s "strikethrough/gray metadata"
  requirement) — the API already returns only active attachments to the
  client. If this UI is implemented, add a corresponding E2E assertion to
  `ticket-detail.spec.ts`.
- `E2E-08`'s hardcoded requester IDs assume a first-run seed where
  `Alice Johnson` = id 1 and `Bob Smith` = id 2; the test itself looks these
  IDs up from `GET /api/requesters` by name rather than hardcoding them, so
  it stays correct even if seed IDs shift.

