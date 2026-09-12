# Lab 3 API Contract — TokTickIT

## Auth mechanism
- Server-side session, stored in Postgres (e.g. `express-session` + a `connect-pg-simple`/Prisma
  session store), issued as a signed `httpOnly`, `sameSite=lax`, `secure` (prod) cookie
  `toktickit.sid`. No token is ever exposed to client JS.
- Password hashing: bcrypt, cost 10+.
- CSRF: same-site cookie + requiring `Content-Type: application/json` mitigates basic CSRF for this
  lab's scope; documented as a known limitation (no CSRF token issuance required by the handout).
- Every response distinguishes: 401 (not authenticated), 403 (authenticated, forbidden — including
  `password_change_required`), 400 (invalid input), 404 (not found — never reveals existence of a
  resource you can't access; use 404 instead of 403 when the resource is outside your ownership
  scope and existence itself is sensitive), 409 (conflict, e.g. duplicate email / last admin),
  500 (safe generic message, no stack traces/internals).

## Authentication
| Method | Path | Body | Notes |
|---|---|---|---|
| POST | /api/auth/login | `{ email, password }` | 200 `{ id, name, role, mustChangePassword }` + session cookie. 401 generic "Invalid email or password" for bad creds OR inactive account. |
| POST | /api/auth/logout | – | Destroys session. 204. |
| GET | /api/auth/me | – | 200 current user, or 401. |
| POST | /api/auth/change-password | `{ currentPassword, newPassword }` | Validates policy (≥8 chars, upper+lower, number, special). Clears `mustChangePassword`. 200 on success. |

All routes below require an active session and `mustChangePassword=false` (except the two above).

## Requester (Lab 2 regression)
Same paths as Lab 2 (`/api/tickets`, `/api/tickets/:id`, `/api/tickets/:id/attachments`, etc.)
but `requesterId` is now taken from `req.session.userId`; any `requesterId` in the request body/query
is ignored. New:
| Method | Path | Body | Notes |
|---|---|---|---|
| POST | /api/tickets/:id/comments | `{ content }` | Requester (owner only), IT Staff, or Admin. Creates a Public Comment. |
| GET | /api/tickets/:id/comments | – | Same visibility as above. |
| PATCH | /api/tickets/:id/resolution-flag | `{ problemAppearsResolved: true }` | Owning Requester only. Does not change `currentStatus`. |

**§Comments — one shared endpoint, not two.** IT Staff and Administrators also use
`/api/tickets/:id/comments` (not a separate `/api/staff/...` path) to post/read Public Comments —
see `specification.md` §11 for why. Authorization is: Requester may act only on a ticket they own;
IT Staff/Admin may act on any ticket. Internal Notes remain a **separate** IT-Staff/Admin-only
resource (`/api/staff/tickets/:id/notes` below) since their visibility rule (BR-04) is different
from Public Comments and must never share a code path with it.

## IT Staff Ticket Queue & Detail
| Method | Path | Query/Body | Notes |
|---|---|---|---|
| GET | /api/staff/tickets | `q, status, priority, ownerId ("me"/"unassigned"/id), sort (createdAt\|updatedAt\|priority), dir, page, pageSize` | Role: IT Staff, Admin. Default sort `updatedAt desc`, `pageSize=10` (max 50). Invalid params → 400. |
| GET | /api/staff/tickets/:id | – | Full ticket + comments + notes + attachments. |
| POST | /api/staff/tickets/:id/claim | `{ ownerId? }` | Omit `ownerId` to self-claim; provide to reassign to another active IT Staff/Admin. 422 if target isn't active IT Staff/Admin. |
| PATCH | /api/staff/tickets/:id/priority | `{ itPriority }` | IT Staff/Admin only. |
| PATCH | /api/staff/tickets/:id/status | `{ currentStatus }` | Validated against transition matrix (see `specification.md` §5.1/BR-08). 422 on illegal transition. |
| POST | /api/staff/tickets/:id/notes | `{ content }` | IT Staff/Admin only. |
| GET | /api/staff/tickets/:id/notes | – | IT Staff/Admin only; 403 for Requester. |

## Administrator User Management
| Method | Path | Query/Body | Notes |
|---|---|---|---|
| GET | /api/admin/users | `q, role, page, pageSize` | Admin only. Search matches name or email (case-insensitive substring). |
| POST | /api/admin/users | `{ name, email, role, isActive, initialPassword }` | 409 on duplicate email; 400 on invalid role/missing fields. Sets `mustChangePassword=true`. |
| PATCH | /api/admin/users/:id | `{ name?, email?, role?, isActive? }` | 409 duplicate email; 409 if it would deactivate self or remove the last active Admin. |
| POST | /api/admin/users/:id/reset-password | `{ newInitialPassword }` | Sets hash + `mustChangePassword=true`; does not otherwise change the account. |

## Safe error shape (all endpoints)
```json
{ "error": "human_readable_safe_message", "code": "machine_readable_code" }
```
No stack traces, SQL text, or internal ids beyond what the caller is already authorized to see.