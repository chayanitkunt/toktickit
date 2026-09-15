# Lab 3 Test Plan — TokTickIT

Written before/alongside implementation, per Test DD/TDD. "Final" is filled in as each test is
actually written and passing during its issue's PR — this table is the living source of truth
referenced from `reviewer.md` and the submission PDF (Part 3).

## Unit tests

| Test ID | Type | Req/AC | What It Tests | Expected Result | File | Final |
|---|---|---|---|---|---|---|
| UNIT-01 | Unit | BR-11 | Password hashing helper | Hash never equals plaintext; verifies correctly | `server/tests/lab-03/password.unit.test.ts` | |
| UNIT-02 | Unit | BR-08 | Status transition matrix function | Legal transitions allowed, illegal ones rejected | `server/tests/lab-03/status-transitions.unit.test.ts` | |
| UNIT-03 | Unit | AC (password policy) | Password strength validator | Rejects weak passwords, accepts compliant ones | `server/tests/lab-03/password.unit.test.ts` | |

## API / integration tests

| Test ID | Type | Req/AC | What It Tests | Expected Result | File | Final |
|---|---|---|---|---|---|---|
| API-01 | API | AC-01 | Valid login | Authenticated response; safe user data | `server/tests/lab-03/auth.api.test.ts` | |
| API-02 | API | BR-01/BR-10 | Invalid password, unknown email, inactive account | Same generic 401 for all three | `server/tests/lab-03/auth.api.test.ts` | |
| API-03 | API | AC-02/BR-02 | mustChangePassword blocks other routes | 403 `password_change_required` until changed | `server/tests/lab-03/auth.api.test.ts` | |
| API-04 | API | FR-02/BR-12 | Logout invalidates session | Reused cookie after logout → 401 | `server/tests/lab-03/auth.api.test.ts` | |
| API-05 | API | AC-03/BR-03 | Client-supplied requesterId ignored | Server uses session identity only | `server/tests/lab-03/authorization.api.test.ts` | |
| API-06 | API | FR-07 | Requester posts Public Comment on own ticket | 201, comment visible on GET | `server/tests/lab-03/authorization.api.test.ts` | |
| API-07 | API | BR-05 | Requester attempts to set currentStatus | 403; only `problemAppearsResolved` settable | `server/tests/lab-03/authorization.api.test.ts` | |
| API-08 | API | AC-04/BR-04 | Requester requests Internal Notes | 403; no note content returned | `server/tests/lab-03/comments-notes.api.test.ts` | |
| API-09 | API | FR-09 | Staff queue search/filter/sort/pagination | Correct subset & order returned; invalid params → 400 | `server/tests/lab-03/staff-queue.api.test.ts` | |
| API-10 | API | FR-11/AC-05/BR-06 | Claim/reassign ownership | Success for active IT Staff/Admin target; 422 for inactive/Requester target | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | |
| API-11 | API | FR-12/BR-07 | Set IT Priority | Updates independently of Requested Priority; forbidden for Requester | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | |
| API-12 | API | AC-06/BR-08 | Illegal status transition | 422; status unchanged | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | |
| API-13 | API | BR-09 | Empty/whitespace comment or note | 400 rejected | `server/tests/lab-03/comments-notes.api.test.ts` | |
| API-14 | API | FR-15 | Admin user list search/role filter | Correct filtered results | `server/tests/lab-03/users-admin.api.test.ts` | |
| API-15 | API | FR-16/AC-08/BR-13 | Create user with duplicate email | 409 conflict | `server/tests/lab-03/users-admin.api.test.ts` | |
| API-16 | API | FR-19/AC-07/BR-14 | Admin deactivates own account | 409 rejected | `server/tests/lab-03/users-admin.api.test.ts` | |
| API-17 | API | FR-19/AC-07/BR-15 | Deactivate/change role of last active Admin | 409 rejected | `server/tests/lab-03/users-admin.api.test.ts` | |
| API-18 | API | FR-18 | Reset password sets mustChangePassword | Next login for that user requires change | `server/tests/lab-03/users-admin.api.test.ts` | |
| API-19 | API | BR-16 | Inactive user login / assignment as owner | Login rejected; can't be set as Ticket Owner | `server/tests/lab-03/authorization.api.test.ts` | |
| API-20 | API | (non-admin access) | Non-Admin calls `/api/admin/users` | 403 forbidden | `server/tests/lab-03/authorization.api.test.ts` | |
| API-21 | API | FR-17/AC-19 | Admin edits user's name, email, role, activation state | All four fields updated correctly and reflected on next list fetch | `server/tests/lab-03/users-admin.api.test.ts` | |
| API-22 | API | FR-05/AC-23/§5.2 | Cross-role authorization matrix (Requester→Staff Queue/Detail/IT Priority/Internal Notes; IT Staff→User Management; unauthenticated→any protected route) | Every combination not permitted by the Authorization Matrix returns 403 (or 401 if unauthenticated); nothing in the response body leaks the blocked resource's content | `server/tests/lab-03/authorization.api.test.ts` | |

## UI component tests

| Test ID | Type | Req/AC | What It Tests | Expected Result | File | Final |
|---|---|---|---|---|---|---|
| UI-01 | Component | Login screen | Validation, busy state, error banner render | Matches ui-spec.md | `client/.../lab-03 tests/Login.test.tsx` | |
| UI-02 | Component | Change Password | Live rule checklist, confirm-match validation | Matches ui-spec.md | `client/.../lab-03 tests/ChangePassword.test.tsx` | |
| UI-03 | Component | Staff Ticket Queue | Loading/empty/no-results/forbidden states render | Matches ui-spec.md | `client/.../lab-03 tests/StaffTicketQueue.test.tsx` | |
| UI-04 | Component | Staff Ticket Detail | Comments vs Notes visually distinct; controls gated by role | Matches ui-spec.md | `client/.../lab-03 tests/StaffTicketDetail.test.tsx` | |
| UI-05 | Component | User Management | Create/edit panel validation, safety-rule banners | Matches ui-spec.md | `client/.../lab-03 tests/UserManagement.test.tsx` | |

## Migration / regression tests

| Test ID | Type | Req/AC | What It Tests | Expected Result | File | Final |
|---|---|---|---|---|---|---|
| MIG-01 | Migration | §5.2 | Requester → User migration | Existing ticket ownership unchanged after migration | `server/tests/lab-03/migration.test.ts` | |
| REG-01 | Regression | FR-06 | Lab 2 ticket/attachment behavior after the Dev-Requester → authenticated-identity migration | All required Lab 2 behaviors remain correct, using the authenticated session instead of the removed selector | `server/tests/lab-02/*` (rerun/updated for the auth swap) + `server/tests/lab-03/authorization.api.test.ts` | |

## End-to-end tests

| Test ID | Type | Req/AC | What It Tests | Expected Result | File | Final |
|---|---|---|---|---|---|---|
| E2E-01 | E2E | AC-01 | Valid + invalid login | Correct redirect / error shown | `e2e/lab-03/authentication.spec.ts` | |
| E2E-02 | E2E | AC-02 | Initial password login and change | Normal app opens only after valid change | `e2e/lab-03/authentication.spec.ts` | |
| E2E-03 | E2E | FR-02 | Logout then direct navigation | Redirected to Login, no data leak | `e2e/lab-03/authentication.spec.ts` | |
| E2E-04 | E2E | FR-09–FR-14 | Full staff flow: queue → claim → priority → status → comment → note | Ends in expected ticket state | `e2e/lab-03/staff-ticket-flow.spec.ts` | |
| E2E-05 | E2E | FR-15–FR-19 | Full admin flow: create → search → edit → reset password → deactivate | Ends in expected user state; safety rules enforced | `e2e/lab-03/user-administration.spec.ts` | |

## Responsive & visual

| Test ID | Type | Req/AC | What It Tests | Expected Result | File | Final |
|---|---|---|---|---|---|---|
| VIS-01 | Visual | §7/§9 | Desktop/tablet/mobile screenshots, all new screens | No clipping/overlap/horizontal overflow | `client/tests/e2e/visual.spec.ts` + `artifacts/lab-03/screenshots/` | |
| VIS-02 | Visual | §7/§9 | Manual checklist: Zen Green consistency, role nav, badges, editable/read-only fields, focus, clipping/overlap, horizontal overflow, responsive reflow | All rows Pass at desktop/tablet/mobile | `docs/lab-03/visual-checklist.md` | |

Every AC in `specification.md` maps to at least one row above. New rows are added as edge cases are
discovered during implementation, not removed after the fact.