# Lab 2 Test Plan and Traceability Matrix

## 1. Test Strategy
The Lab 2 testing strategy combines Unit, Integration/API, React Component UI, Responsive, and End-to-End (E2E) automated tests to verify the engineering contract and ensure zero regressions.

## 2. Planned Automated Tests

| Test ID | Level | AC Ref | What It Tests | Expected Result | Automated Test File Path | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **UNIT-01** | Unit | AC-01 | Ticket Number Generator | Returns string matching `TKT-\d{4}-\d{6}` | `server/tests/lab-02/ticket-number.unit.test.ts` | Pass |
| **UNIT-02** | Unit | AC-05 | File Size Validator | Rejects size > 5,242,880 bytes | `server/tests/lab-02/attachment-validator.unit.test.ts` | Pass |
| **API-01** | API | AC-01 | Ticket Creation API | 201 Created; returns ticket number & status `NEW` | `server/tests/lab-02/tickets.api.test.ts` | Pass |
| **API-02** | API | AC-03 | Ticket Ownership Guard | 403 Forbidden when accessing another user's ticket | `server/tests/lab-02/tickets.api.test.ts` | Pass |
| **API-03** | API | AC-04,05 | Attachment Type & Size API | 415/413 errors on invalid upload attempt | `server/tests/lab-02/attachments.api.test.ts` | Pass |
| **API-04** | API | AC-07 | Soft Removal API | Sets `isRemoved=true`, stores reason, blocks download | `server/tests/lab-02/attachments.api.test.ts` | Pass |
| **API-05** | API | AC-08,09 | List, Search, Filter & Pagination | Returns matching subset and correct pagination metadata | `server/tests/lab-02/my-tickets.api.test.ts` | Pass |
| **UI-01** | UI Component | AC-01 | Create Ticket Form validation | Displays field errors when submitting blank required fields | `client/src/lab-02/CreateTicket.test.tsx` | Pass |
| **UI-02** | UI Component | AC-02 | Dev Requester Selection Context | Renders selector screen if no requester context exists | `client/src/lab-02/RequesterSelect.test.tsx` | Pass |
| **UI-03** | UI Component | AC-07 | Soft Remove Modal UI | Prompts for reason and disables remove button if empty | `client/src/lab-02/AttachmentSection.test.tsx` | Pass |
| **UI-04** | UI Component | AC-08 | My Tickets Empty/No-results | Displays empty state graphic when list length is 0 | `client/src/lab-02/MyTickets.test.tsx` | Pass |
| **E2E-01** | E2E | AC-01,08 | Create & Locate Ticket Flow | Requester creates ticket, sees number, finds it in list | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pass |
| **E2E-02** | E2E | AC-03 | Cross-Requester Isolation | Requester B cannot view Requester A ticket URL directly | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pass |
| **E2E-03** | E2E | AC-10 | Mobile Viewport Rendering | All forms stack vertically and mobile card layout renders | `e2e/lab-02/responsive-ui.spec.ts` | Pass |

## 3. Acceptance-Criterion Traceability Matrix

| Acceptance Criterion | Planned Test IDs | Coverage Verification |
| :--- | :--- | :--- |
| **AC-01** (Creation & Numbering) | `UNIT-01`, `API-01`, `UI-01`, `E2E-01` | Full backend & UI flow covered |
| **AC-02** (Context Guard) | `UI-02` | Guard component tested |
| **AC-03** (Ownership Isolation) | `API-02`, `E2E-02` | API & direct route navigation verified |
| **AC-04** (File Type Limit) | `API-03` | Backend validation verified |
| **AC-05** (File Size Limit) | `UNIT-02`, `API-03` | Validation logic verified |
| **AC-06** (Max Attachments) | `API-03` | Array length boundary test verified |
| **AC-07** (Soft Removal) | `API-04`, `UI-03` | Database update & UI state verified |
| **AC-08** (Search & Filter) | `API-05`, `UI-04`, `E2E-01` | Query building & list state verified |
| **AC-09** (Pagination) | `API-05` | Metadata & page offset verified |
| **AC-10** (Responsive Layout) | `E2E-03` | Playwright viewport screenshot tests |

## 4. Test Execution Commands

```bash
# Run unit tests
npm run test:unit

# Run API/integration tests
npm run test:api

# Run UI component tests
npm run test:ui

# Run Playwright E2E tests across viewports
npx playwright test e2e/lab-02