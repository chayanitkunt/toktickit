# Lab 3 Test Plan — TokTickIT

Written before/alongside implementation, per Test-Driven / Behavior-Driven Development (TDD/BDD). "Final" status was updated as each test was implemented and verified during feature-branch PRs, forming the living source of truth for `reviewer.md` and Part 3 of the submission evidence.

**Final test run evidence (main branch, after `lab3-staging` → `main` merge on 16 Sep 2026):**
- Server (Vitest): `16 passed (16 files) / 201 passed (201 tests)`
- Client E2E (Playwright): `101 passed, 1 skipped (102 total)` — 9.1m runtime

> **Note on Skipped Test:** 1 Playwright test (`client/tests/e2e/lab-03/authentication.spec.ts` — raw fixture reset test) is intentionally marked `.skip()` because database reset is executed globally by the pre-test environment runner in the pipeline. This is documented in the Definition of Done (DoD).

---

## Unit tests

| Test ID | Type | Req/AC | What It Tests | Expected Result | File | Final |
|---|---|---|---|---|---|---|
| UNIT-01 | Unit | BR-11 | Password hashing helper | Hash never equals plaintext; verifies correctly | `server/tests/lab-03/password.unit.test.ts` | Pass |
| UNIT-02 | Unit | BR-08 | Status transition matrix function | Legal transitions allowed, illegal ones rejected | `server/tests/lab-03/status-transitions.unit.test.ts` | Pass |
| UNIT-03 | Unit | AC (password policy) | Password strength validator | Rejects weak passwords, accepts compliant ones | `server/tests/lab-03/password.unit.test.ts` | Pass |

---

## API / integration tests

| Test ID | Type | Req/AC | What It Tests | Expected Result | File | Final |
|---|---|---|---|---|---|---|
| API-01 | API | AC-01 | Valid login | Authenticated response; safe user data | `server/tests/lab-03/auth.api.test.ts` | Pass |
| API-02 | API | BR-01/BR-10 | Invalid password, unknown email, inactive account | Same generic 401 for all three | `server/tests/lab-03/auth.api.test.ts` | Pass |
| API-03 | API | AC-02/BR-02 | mustChangePassword blocks other routes | 403 `password_change_required` until changed | `server/tests/lab-03/auth.api.test.ts` | Pass |
| API-04 | API | FR-02/BR-12 | Logout invalidates session | Reused cookie after logout → 401 | `server/tests/lab-03/auth.api.test.ts` | Pass |
| API-05 | API | AC-03/BR-03 | Client-supplied requesterId ignored | Server uses session identity only | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| API-06 | API | FR-07 | Requester posts Public Comment on own ticket | 201, comment visible on GET | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| API-07 | API | BR-05 | Requester attempts to set currentStatus | 403; only `problemAppearsResolved` settable | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| API-08 | API | AC-04/BR-04 | Requester requests Internal Notes | 403; no note content returned | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| API-09 | API | FR-09 | Staff queue search/filter/sort/pagination | Correct subset & order returned; invalid params → 400 | `server/tests/lab-03/staff-queue.api.test.ts` | Pass |
| API-10 | API | FR-11/AC-05/BR-06 | Claim/reassign ownership | Success for active IT Staff/Admin target; 422 for inactive/Requester target | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| API-11 | API | FR-12/BR-07 | Set IT Priority | Updates independently of Requested Priority; forbidden for Requester | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| API-12 | API | AC-06/BR-08 | Illegal status transition | 422; status unchanged | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| API-13 | API | BR-09 | Empty/whitespace comment or note | 400 rejected | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| API-14 | API | FR-15 | Admin user list search/role filter | Correct filtered results | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-15 | API | FR-16/AC-08/BR-13 | Create user with duplicate email | 409 conflict | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-16 | API | FR-19/AC-07/BR-14 | Admin deactivates own account | 409 rejected | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-17 | API | FR-19/AC-07/BR-15 | Deactivate/change role of last active Admin | 409 rejected | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-18 | API | FR-18 | Reset password sets mustChangePassword | Next login for that user requires change | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-19 | API | BR-16 | Inactive user login / assignment as owner | Login rejected; can't be set as Ticket Owner | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| API-20 | API | (non-admin access) | Non-Admin calls `/api/admin/users` | 403 forbidden | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| API-21 | API | FR-17/AC-19 | Admin edits user's name, email, role, activation state | All four fields updated correctly and reflected on next list fetch | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-22 | API | FR-05/AC-23/§5.2 | Cross-role authorization matrix (Requester→Staff Queue/Detail/IT Priority/Internal Notes; IT Staff→User Management; unauthenticated→any protected route) | Every combination not permitted by Authorization Matrix returns 403 (or 401 if unauthenticated); response body does not leak data | `server/tests/lab-03/authorization.api.test.ts` | Pass |

---

## UI component tests

| Test ID | Type | Req/AC | What It Tests | Expected Result | File | Final |
|---|---|---|---|---|---|---|
| UI-01 | Component | Login screen | Validation, busy state, error banner render | Matches ui-spec.md | `client/tests/lab-03/Login.test.tsx` | Pass |
| UI-02 | Component | Change Password | Live rule checklist, confirm-match validation | Matches ui-spec.md | `client/tests/lab-03/ChangePassword.test.tsx` | Pass |
| UI-03 | Component | Staff Ticket Queue | Loading/empty/no-results/forbidden states render | Matches ui-spec.md | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Pass |
| UI-04 | Component | Staff Ticket Detail | Comments vs Notes visually distinct; controls gated by role | Matches ui-spec.md | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Pass |
| UI-05 | Component | User Management | Create/edit panel validation, safety-rule banners | Matches ui-spec.md | `client/tests/lab-03/UserManagement.test.tsx` | Pass |

---

## Migration / regression tests

| Test ID | Type | Req/AC | What It Tests | Expected Result | File | Final |
|---|---|---|---|---|---|---|
| MIG-01 | Migration | §5.2 | Requester → User migration | Existing ticket ownership unchanged after migration | `server/tests/lab-03/migration.test.ts` | Pass |
| REG-01 | Regression | FR-06 | Lab 2 ticket/attachment behavior after Dev-Requester → authenticated-identity migration | All required Lab 2 behaviors remain correct using authenticated session | `server/tests/lab-02/*` + `server/tests/lab-03/authorization.api.test.ts` | Pass |

---

## End-to-end tests

| Test ID | Type | Req/AC | What It Tests | Expected Result | File | Final |
|---|---|---|---|---|---|---|
| E2E-01 | E2E | AC-01 | Valid + invalid login | Correct redirect / error shown | `client/tests/e2e/lab-03/authentication.spec.ts` | Pass |
| E2E-02 | E2E | AC-02 | Initial password login and change | Normal app opens only after valid change | `client/tests/e2e/lab-03/authentication.spec.ts` | Pass |
| E2E-03 | E2E | FR-02 | Logout then direct navigation | Redirected to Login, no data leak | `client/tests/e2e/lab-03/authentication.spec.ts` | Pass |
| E2E-04 | E2E | FR-09–FR-14 | Full staff flow: queue → claim → priority → status → comment → note | Ends in expected ticket state | `client/tests/e2e/lab-03/staff-ticket-flow.spec.ts` | Pass |
| E2E-05 | E2E | FR-15–FR-19 | Full admin flow: create → search → edit → reset password → deactivate | Ends in expected user state; safety rules enforced | `client/tests/e2e/lab-03/user-administration.spec.ts` | Pass |

---

## Responsive & visual

| Test ID | Type | Req/AC | What It Tests | Expected Result | File | Final |
|---|---|---|---|---|---|---|
| VIS-01 | Visual | §7/§9 | Desktop/tablet/mobile screenshots, all new screens | No clipping/overlap/horizontal overflow (30/30 snapshots verified across 10 scenarios × 3 viewports) | `client/tests/e2e/visual.spec.ts` + `artifacts/lab-03/screenshots/` | Pass |
| VIS-02 | Visual | §7/§9 | Manual checklist: Zen Green consistency, role nav, badges, editable/read-only fields, focus reflow | All rows Pass across desktop/tablet/mobile viewports | `docs/lab-03/visual-checklist.md` | Pass |

---

## Final Run Summary (Evidence for Submission Part 3)

```text
Server (Vitest):   Test Files  16 passed (16)   |   Tests  201 passed (201)

Client E2E (PW):   101 passed, 1 skipped (102)  |   Duration 9.1m
```

Server Suite: All 16 Vitest API/unit test files passed (201 total assertions).

Client E2E Suite: 101 tests passed successfully across Chromium, Firefox, and WebKit viewports.

Skipped Test: 1 test (client/tests/e2e/lab-03/authentication.spec.ts) intentionally skipped as initial database seeding is handled globally prior to test execution in CI/CD.

Visual Assurance: All 30 visual comparison snapshots (10 scenarios × 3 viewports: chromium/desktop, tablet, mobile) match reference baselines with zero layout regressions or overflow.