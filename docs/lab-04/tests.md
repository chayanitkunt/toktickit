# Lab 4 Test Plan — TokTickIT

Written alongside `specification.md`, `ui-spec.md`, and `api-spec.md`, before the main Lab 4
implementation PRs, per the Test DD requirement. Every Acceptance Criterion in `specification.md`
§9 (AC-01..AC-17) has at least one row below. "Final" is filled in as `Pass`/`Fail` once the
automated suite actually runs on `main`; it starts blank/`Planned`.

## 1. Unit Tests
| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| UNIT-01 | Unit | BR-06 | Follow-up validation helper: `followUpRequired=true` + empty `followUpNote` | Returns invalid | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| UNIT-02 | Unit | BR-06 | Follow-up validation helper: `followUpRequired=false` + non-empty `followUpNote` | Returns invalid | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| UNIT-03 | Unit | BR-10 | Resolution-gate helper: Ticket with 0 Actions Taken requesting `RESOLVED` | Returns blocked | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| UNIT-04 | Unit | BR-13 | Concurrency-token compare helper: stale vs. current `updatedAt` | Returns mismatch for stale, match for current | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| UNIT-05 | Unit | §5.1 matrix | Transition-matrix lookup for every (from, to) pair in the finalized table | Allowed pairs return true, all others false | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |

## 2. API / Integration Tests — Actions Taken
| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| API-01 | API | AC-01 | Create a valid Action Taken as IT Staff | 201; saved under correct Ticket; `performedBy` = authenticated user; server-set `actionAt` | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-02 | API | AC-01 | Create a valid Action Taken as Administrator | 201; same guarantees as API-01 | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-03 | API | AC-03 | Create with `followUpRequired=true`, empty `followUpNote` | 400; nothing persisted | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-04 | API | AC-03 | Create with `followUpRequired=false`, non-empty `followUpNote` | 400; nothing persisted | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-05 | API | BR-05 | Create with empty `description` or empty `result` | 400; nothing persisted | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-06 | API | BR-05 | Create with `description`/`result` over 2,000 chars | 400; nothing persisted | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-07 | API | AC-04 | Requester calls `POST .../actions` | 403; nothing created | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-08 | API | AC-01 | Create on a nonexistent Ticket id | 404 | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-09 | API | AC-06 / BR-02 / BR-07 | Two different IT Staff members each create an Action Taken on a Ticket owned by neither of them | Both succeed; both rows saved with the correct distinct `performedBy` | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-10 | API | AC-07 / BR-08 | Edit Description/Result/Follow-Up fields on an existing Action Taken | 200; fields updated; `ticketId`, `performedById`, `actionAt` unchanged | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-11 | API | BR-08 | Edit request body includes `ticketId`/`performedById`/`actionAt` overrides | 200; those keys are ignored, not applied | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-12 | API | AC-04 | Requester calls `PATCH .../actions/:id` | 403; nothing changed | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-13 | API | AC-10 / BR-13 | Edit with stale `expectedUpdatedAt` | 409 `stale_action_taken`; nothing changed | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-14 | API | FR-08 | Edit with current `expectedUpdatedAt` after a prior stale attempt | 200; succeeds | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-15 | API | AC-05 | `GET /api/tickets/:id/actions` as the owning Requester | 200; full list, ordered `actionAt asc` | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-16 | API | BR-09 | `GET /api/tickets/:id/actions` as a Requester who does not own the Ticket | 404 (existence hidden) | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-17 | API | FR-04 | `GET /api/tickets/:id/actions` as IT Staff/Admin on any Ticket | 200; full list returned regardless of Ticket Owner | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-18 | API | AC-17 / BR-07 | IT Staff who is not the Ticket Owner creates an Action Taken | 201; succeeds | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |

## 3. API / Integration Tests — Ticket Workflow
| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| API-19 | API | AC-08 / BR-10 | Transition to `RESOLVED` with 0 Actions Taken on the Ticket | 422 `resolution_requires_action_taken`; status unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| API-20 | API | AC-08 / BR-10 | Same Ticket after ≥1 Action Taken is recorded, transition to `RESOLVED` | 200; status becomes Resolved | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| API-21 | API | AC-09 / BR-12 | Illegal transition, e.g. `NEW → CLOSED` directly | 422 `illegal_status_transition`; status unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| API-22 | API | §5.1 matrix | Every legal transition pair in the finalized matrix, run as a table-driven test | 200 for each; status becomes the requested value | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| API-23 | API | AC-10 / BR-13 | Status change with stale `expectedUpdatedAt` | 409 `stale_ticket`; status unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| API-24 | API | FR-08 | Status change with current `expectedUpdatedAt` after a prior stale attempt | 200; succeeds | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| API-25 | API | Workflow / role | Requester calls `PATCH .../status` | 403; status unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| API-26 | API | FR-07 / BR-11 | Requester sets "Problem Appears Resolved" | 200; `problemAppearsResolved=true`; `currentStatus` unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |

## 4. API / Integration Tests — Dashboards
| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| API-27 | API | AC-02 / BR-16 | `GET /api/dashboard/requester` for a Requester with a mix of Tickets | 200; every count and list scoped only to that Requester's Tickets | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| API-28 | API | AC-16 | `GET /api/dashboard/requester` for a Requester with zero Tickets | 200; every count is 0; both arrays `[]`; no error | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| API-29 | API | BR-16 | `GET /api/dashboard/requester` — attempt to pass another user's id as a parameter | Ignored; response still scoped to the caller's own session | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| API-30 | API | Dashboard role | IT Staff calls `GET /api/dashboard/requester` | 403 | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| API-31 | API | AC-12 | `GET /api/dashboard/staff` counts (`unassigned`, `myAssigned`, `byStatus`, `byItPriority`) against a seeded dataset | Each count matches the equivalent direct Ticket Queue filter query exactly | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| API-32 | API | AC-13 / BR-15 | Response body size/shape of both dashboard endpoints | Never includes a full Ticket collection; only documented fields present | `server/tests/lab-04/staff-dashboard.api.test.ts`, `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| API-33 | API | Dashboard role | Requester calls `GET /api/dashboard/staff` | 403 | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| API-34 | API | FR-10 | `GET /api/dashboard/staff` for a user who owns zero Tickets | 200; `myAssigned=0`, `myRecentTickets=[]`; org-wide counts still populate | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |

## 5. UI Component Tests
| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| UI-01 | UI Component | AC-05 | ActionsTaken list renders for a Requester | Read-only rows, no Add/Edit controls in the DOM | `client/.../lab-04 tests/ActionsTaken.test.tsx` | Planned |
| UI-02 | UI Component | FR-01 | ActionsTaken create form for IT Staff | Description/Result required; Follow-up Note field appears only when toggle = Yes | `client/.../lab-04 tests/ActionsTaken.test.tsx` | Planned |
| UI-03 | UI Component | AC-07 | ActionsTaken edit form | Action Date/Time and Performed By render as read-only text, never as inputs | `client/.../lab-04 tests/ActionsTaken.test.tsx` | Planned |
| UI-04 | UI Component | AC-14 / FR-15 | Double-click on Add/Save | Button disables after first click; only one submit request fires | `client/.../lab-04 tests/ActionsTaken.test.tsx` | Planned |
| UI-05 | UI Component | ui-spec §3 | Stale-edit conflict banner | Banner shown on 409; in-progress form text preserved, not cleared | `client/.../lab-04 tests/ActionsTaken.test.tsx` | Planned |
| UI-06 | UI Component | ui-spec §3 | Empty Actions Taken list, IT Staff role | Empty-state message with inline "+ Add Action Taken" affordance | `client/.../lab-04 tests/ActionsTaken.test.tsx` | Planned |
| UI-07 | UI Component | ui-spec §4 | Status dropdown when 0 Actions Taken exist | "Resolved" option disabled with inline hint linking to Actions Taken | `client/.../lab-04 tests/TicketWorkflow.test.tsx` | Planned |
| UI-08 | UI Component | ui-spec §4 | Status dropdown after ≥1 Action Taken exists | "Resolved" option enabled | `client/.../lab-04 tests/TicketWorkflow.test.tsx` | Planned |
| UI-09 | UI Component | ui-spec §4 | Status-change conflict banner | Banner shown on 409; Ticket summary refetched from server response | `client/.../lab-04 tests/TicketWorkflow.test.tsx` | Planned |
| UI-10 | UI Component | AC-11 / FR-11 | Each IT Staff dashboard metric card | Renders as a real link/button with correct `href`/handler to the matching filtered queue view | `client/.../lab-04 tests/StaffDashboard.test.tsx` | Planned |
| UI-11 | UI Component | ui-spec §1 | IT Staff dashboard loading/empty/safe-failure states | Correct state renders for each fixture; no raw error text on failure | `client/.../lab-04 tests/StaffDashboard.test.tsx` | Planned |
| UI-12 | UI Component | AC-11 | Each Requester dashboard metric card | Renders as a real link/button to the matching filtered My Tickets view | `client/.../lab-04 tests/RequesterDashboard.test.tsx` | Planned |
| UI-13 | UI Component | AC-16 | Requester dashboard empty state | All cards show 0; empty-state message; Create Ticket CTA present | `client/.../lab-04 tests/RequesterDashboard.test.tsx` | Planned |

## 6. UI Style / Visual Consistency
| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| STYLE-01 | UI Style | ui-spec §6 | Zen Green tokens on Dashboard + Actions Taken components (color, spacing, radius) | Matches design tokens from `docs/lab-02/ui-spec.md`; no ad-hoc hex values | Manual + visual check, screenshots in `artifacts/lab-04/screenshots/` | Pass |
| STYLE-02 | UI Style | ui-spec §7 item 1 | App header wordmark | Reads "TokTickIT", not "TikTockIT" | Manual + screenshot | Pass |
| STYLE-03 | UI Style | ui-spec §3 | Follow-Up badge non-color cue | Badge shows icon/text ("Yes — see note" / "No"), not color alone | Manual + screenshot | Pass |
| STYLE-04 | UI Style | ui-spec §6 | Focus states on dashboard cards and Actions Taken form controls | Visible focus ring on keyboard Tab through every interactive element | Manual + screenshot | Pass |

## 7. Responsive Tests
| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| RESP-01 | Responsive | ui-spec §1 | IT Staff dashboard at desktop/tablet/mobile widths | Card grid: 5–7-across → 2-across → 1 column; no horizontal scroll | Manual + screenshots (`artifacts/lab-04/screenshots/staff-dashboard/`) | Pass |
| RESP-02 | Responsive | ui-spec §2 | Requester dashboard at desktop/tablet/mobile widths | Same grid-to-stack behavior; no horizontal scroll | Manual + screenshots (`.../requester-dashboard/`) | Pass |
| RESP-03 | Responsive | ui-spec §3 | Actions Taken table (desktop) vs. card layout (tablet/mobile) | Table on desktop, stacked cards on tablet/mobile; no clipped content | Manual + screenshots (`.../actions-taken/`) | Pass |
| RESP-04 | Responsive | ui-spec §3 | Actions Taken create/edit form on mobile width | Form fields stack; Follow-up Note reveal doesn't overflow viewport | Manual + screenshot | Pass |

## 8. Authorization Tests
| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| AUTHZ-01 | Authorization | §5.2 matrix | Every Lab 4 route × every role, table-driven (Requester/IT Staff/Admin × create/edit/view Actions Taken, both dashboards, status change) | Matches the authorization matrix exactly; no route relies on hidden UI controls alone | `server/tests/lab-04/actions-taken.api.test.ts`, `server/tests/lab-04/ticket-workflow.api.test.ts`, `server/tests/lab-04/*-dashboard.api.test.ts` | Planned |
| AUTHZ-02 | Authorization | BR-09 | Unauthenticated request to any Lab 4 route | 401 | (same files as AUTHZ-01) | Planned |
| AUTHZ-03 | Authorization | Lab 3 regression | `mustChangePassword=true` session calls any Lab 4 route | 403 (Lab 3 convention re-verified) | (same files as AUTHZ-01) | Planned |

## 9. Migration / Regression Tests
| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| MIGRATION-01 | Migration | §7 | Run the Lab 4 Prisma migration against a database seeded through Lab 3 only | Migration succeeds; all Lab 1–3 rows (Users, Tickets, Attachments, Comments, Notes) unchanged; `action_taken` table created empty | `server/prisma/migrations` (migration itself) + manual verification | Planned |
| MIGRATION-02 | Migration | §7 | Roll back the Lab 4 migration | `action_taken` table dropped; all Lab 1–3 tables/data untouched | Manual verification | Planned |
| MIGRATION-03 | Migration | §7 | Re-run the Lab 4 seed script twice in a row | Second run is a no-op / idempotent; no duplicate rows | `server/prisma/seed.ts` run twice + row-count assertion | Planned |
| REGRESSION-01 | Regression | FR-13 / AC-15 | Full Lab 1–3 automated suite (auth, Requester lifecycle, IT Staff queue/detail, Comments, Notes, Admin user management) | All pass unmodified on the Lab 4 branch | existing `server/tests/lab-01`..`lab-03`, `client/tests/lab-01`..`lab-03` suites | Planned |
| REGRESSION-02 | Regression | ui-spec §5 | Manual pass over every Lab 1–3 screen after Lab 4 merge | No console errors, broken links, placeholder text, or visual regressions | Manual checklist + screenshots | Planned |

## 10. Performance Smoke Tests
| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| PERF-01 | Performance Smoke | FR-12 | `GET /api/dashboard/staff` response time against a seeded dataset (≥200 Tickets, ≥500 Actions Taken) | Responds well under 1s; response body stays within the documented concise shape (no full-collection leakage under load) | `server/tests/lab-04/staff-dashboard.api.test.ts` (timing assertion) | Planned |
| PERF-02 | Performance Smoke | FR-12 | `GET /api/dashboard/requester` response time under the same seeded dataset | Responds well under 1s | `server/tests/lab-04/requester-dashboard.api.test.ts` (timing assertion) | Planned |

## 11. End-to-End Tests
| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| E2E-01 | E2E | AC-01, AC-05, AC-07 | Full Actions Taken flow: IT Staff logs in, opens a Ticket, adds an Action Taken, edits it, Requester logs in and views it read-only | Every step succeeds through the real UI; final state matches what was entered | `e2e/lab-04/actions-taken-flow.spec.ts` | Planned |
| E2E-02 | E2E | AC-08 | Ticket resolution flow: attempt Resolve with 0 Actions Taken (blocked), add an Action Taken, Resolve succeeds | UI blocks first attempt with the inline hint, succeeds after an Action Taken exists | `e2e/lab-04/ticket-resolution.spec.ts` | Planned |
| E2E-03 | E2E | AC-09 | Attempt an illegal transition directly from the UI's available options | Illegal option is never offered by the UI; if forced via API, request is rejected | `e2e/lab-04/ticket-resolution.spec.ts` | Planned |
| E2E-04 | E2E | AC-02, AC-11, AC-16 | Requester dashboard flow: login → view dashboard → click a metric card → land on the correctly filtered My Tickets view | Filtered view matches the card clicked; counts match | `e2e/lab-04/dashboards.spec.ts` | Planned |
| E2E-05 | E2E | AC-11, AC-12 | IT Staff dashboard flow: login → view dashboard → click Unassigned / My Assigned / a status card → land on the correctly filtered Ticket Queue | Filtered view matches the card clicked; counts match | `e2e/lab-04/dashboards.spec.ts` | Planned |
| E2E-06 | E2E | FR-13 | Representative Lab 1–3 regression walked through the UI (create Ticket, claim, comment, add note, attach file, admin edits a user) | All succeed without error on the Lab 4 build | `e2e/lab-04/dashboards.spec.ts` or a dedicated regression spec | Planned |

## Traceability Summary
Every AC in `specification.md` §9 maps to at least one row above:

| AC | Covered by |
|---|---|
| AC-01 | API-01, API-02, API-08, E2E-01 |
| AC-02 | API-27, API-29, E2E-04 |
| AC-03 | API-03, API-04 |
| AC-04 | API-07, API-12 |
| AC-05 | API-15, UI-01, E2E-01 |
| AC-06 | API-09 |
| AC-07 | API-10, API-11, UI-03, E2E-01 |
| AC-08 | API-19, API-20, UI-07, UI-08, E2E-02 |
| AC-09 | API-21, E2E-03 |
| AC-10 | API-13, API-14, API-23, API-24, UI-05, UI-09 |
| AC-11 | UI-10, UI-12, E2E-04, E2E-05 |
| AC-12 | API-31, E2E-05 |
| AC-13 | API-32 |
| AC-14 | UI-04 |
| AC-15 | REGRESSION-01, REGRESSION-02, E2E-06 |
| AC-16 | API-28, UI-13, E2E-04 |
| AC-17 | API-18 |

## 12. Completed Visual and Accessibility Checklist

Completed for Issues #58 and #59 on 2026-09-29, with the corrective QA pass recorded below. Desktop is Playwright `chromium` (1280 × 720), tablet is
`tablet` (768 × 1024), and mobile is `mobile` (390 × 844). The screenshot tests load real Lab 4
dashboard and Actions Taken flows rather than static fixture pages.

### Screenshot evidence

| Screen | Desktop | Tablet | Mobile |
|---|---|---|---|
| IT Staff dashboard | `artifacts/lab-04/screenshots/staff-dashboard/dashboard-chromium.png` | `artifacts/lab-04/screenshots/staff-dashboard/dashboard-tablet.png` | `artifacts/lab-04/screenshots/staff-dashboard/dashboard-mobile.png` |
| Requester dashboard | `artifacts/lab-04/screenshots/requester-dashboard/dashboard-chromium.png` | `artifacts/lab-04/screenshots/requester-dashboard/dashboard-tablet.png` | `artifacts/lab-04/screenshots/requester-dashboard/dashboard-mobile.png` |
| Dashboard keyboard focus | `artifacts/lab-04/screenshots/focus-state/dashboard-chromium.png` | `artifacts/lab-04/screenshots/focus-state/dashboard-tablet.png` | `artifacts/lab-04/screenshots/focus-state/dashboard-mobile.png` |
| Header keyboard focus | `artifacts/lab-04/screenshots/header-focus/dashboard-chromium.png` | `artifacts/lab-04/screenshots/header-focus/dashboard-tablet.png` | `artifacts/lab-04/screenshots/header-focus/dashboard-mobile.png` |
| Actions Taken list, validation, edit, and Requester read-only | `artifacts/lab-04/screenshots/actions-taken/*-chromium.png` | `artifacts/lab-04/screenshots/actions-taken/*-tablet.png` | `artifacts/lab-04/screenshots/actions-taken/*-mobile.png` |

### Completed checks

| # | Check | Result | Evidence / implementation |
|---|---|---|---|
| 1 | Zen Green visual consistency | Pass | New dashboard cards, buttons, panels, badges, and Actions Taken reuse the existing green palette, borders, spacing, and typography. |
| 2 | Status and IT priority are understandable without color | Pass | Shared dashboard status badges use the same blue/green/amber/red/neutral status mapping as Ticket Queue; every status and priority badge includes a text label. |
| 3 | Private versus shared content is distinct | Pass | Staff Ticket Detail labels the private tab `🔒 Internal Notes`; Public Comments and Attachments remain separately named. |
| 4 | Semantic controls and accessible names | Pass | Dashboard cards are native buttons with descriptive `aria-label`s; form fields have associated labels; Follow-Up is a labelled radio fieldset; status control has a visible label. |
| 5 | Keyboard operation and visible focus | Pass | Dashboard cards, Quick Actions, navigation, Actions Taken controls, form inputs, and status controls are native keyboard-focusable elements. `:focus-visible` uses a 3px dark-green outline (white in the green header) with an offset. Follow-Up radios share a `name`, enabling native arrow-key selection. Staff Detail tabs implement tab, tabpanel, `aria-controls`, roving `tabIndex`, and Arrow/Home/End navigation. |
| 6 | Dashboard drill-downs | Pass | Requester My Open Tickets routes to the documented New/Open/In Progress/Reopened set; other cards route to their matching status. Staff cards route to filtered My Queue; Search Tickets focuses the Queue Search input. Component and E2E tests cover these handlers. |
| 7 | Loading, empty, error, conflict, and validation feedback | Pass | Dashboards use skeleton/empty/retry states; Actions Taken uses labelled loading, validation, server-error, and stale-update feedback; workflow exposes resolution-gate and stale-update messages. |
| 8 | Responsive layout and no horizontal page overflow | Pass | Cards use desktop grids, tablet wrapping, and mobile stacking. Actions Taken switches from desktop table to stacked cards below the large breakpoint. Mobile header navigation uses compact no-wrap controls. Screenshot review at all three required viewports found no clipping or page-level horizontal overflow. |
| 9 | Existing workflow remains reachable | Pass | Dashboard is the authenticated landing screen; role navigation exposes My Tickets/Create Ticket to Requesters, My Queue to Staff, and Dashboard/My Queue/Users to Administrators. |
| 10 | Administrator dashboard behavior | Pass | Administrator reuses the Staff Dashboard and retains Users navigation; covered in `client/tests/e2e/lab-04/dashboards.spec.ts`. |

### Automated evidence

```bash
cd client
npm run build
npx vitest run tests/lab-04/RequesterDashboard.test.tsx tests/lab-04/StaffDashboard.test.tsx
npx playwright test tests/e2e/lab-04/actions-taken-flow.spec.ts --project=chromium --project=tablet --project=mobile
npx playwright test tests/e2e/lab-04/dashboards.spec.ts --project=chromium --project=tablet --project=mobile
```

The screenshot capture is built into the two Lab 4 E2E files above, so rerunning them refreshes the
evidence paths in this section. For final submission, reseed the database before recapturing
screenshots so dashboard counts are deterministic; E2E runs intentionally create test Tickets.

### Approved scope decisions

- The Staff Dashboard represents **Unassigned** as an actionable operational tile and IT Priority as
  three filter buttons. Both link to the required queue filters and are documented UI variations of
  the handout's compact metric-card requirement.
- Staff Create Ticket remains omitted. The backend authorization matrix permits Ticket creation only
  to Requesters, and exposing a Staff CTA that fails with 403 would be misleading. Lab 3 explicitly
  made that Staff navigation item optional.
