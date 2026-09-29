# Lab 4 API Contract — TokTickIT

Extends `docs/lab-03/api-spec.md`. Auth mechanism, password hashing, CSRF posture, and the safe
error shape below are unchanged from Lab 3 and repeated here only where a Lab 4 route needs them.

## Safe error shape (all endpoints, unchanged)
```json
{ "error": "human_readable_safe_message", "code": "machine_readable_code" }
```
No stack traces, SQL text, or internal ids beyond what the caller is already authorized to see.
Status codes used in this document: 400 (invalid input), 401 (not authenticated), 403
(authenticated, forbidden), 404 (not found / outside caller's ownership scope), 409 (conflict —
stale write, or a business conflict such as the resolution gate's alternate path), 422 (semantically
invalid — illegal status transition or the resolution gate), 500 (safe generic message).

## Actions Taken
All Actions Taken routes require an active session with `mustChangePassword=false` (Lab 3 §Auth).

| Method | Path | Role | Body | Notes |
|---|---|---|---|---|
| POST | /api/staff/tickets/:id/actions | IT Staff, Admin | `{ description, result, followUpRequired, followUpNote?, attachmentNotes? }` | Creates an Action Taken. `performedById` and `actionAt` are set by the server from the session and current time and are never read from the body. 201 with the created record. 404 if the Ticket doesn't exist. 400 if `description`/`result` are empty, over 2,000 chars, or the `followUpRequired`/`followUpNote` pairing is invalid (BR-06). |
| PATCH | /api/staff/tickets/:id/actions/:actionId | IT Staff, Admin | `{ description?, result?, followUpRequired?, followUpNote?, attachmentNotes?, expectedUpdatedAt }` | Edits an existing Action Taken. `expectedUpdatedAt` (ISO timestamp, the record's current `updatedAt` as last seen by the client) is required; a mismatch returns 409 `stale_action_taken` and changes nothing. `ticketId`, `performedById`, and `actionAt` can never be set by this request — any of those keys present in the body is ignored, not merged. 404 if `actionId` doesn't belong to `:id`. |
| GET | /api/tickets/:id/actions | Requester (owner only), IT Staff, Admin | – | Same shared-endpoint pattern as Lab 3's `/api/tickets/:id/comments` — see `specification.md` §5.2/§11 for why one endpoint serves all three roles instead of a duplicate staff-only path. Requester: 404 if the Ticket isn't theirs (existence hidden, per Lab 3 convention). IT Staff/Admin: any Ticket. Returns the list ordered `actionAt asc`. |

### Response shape — Action Taken
```json
{
  "id": 12,
  "ticketId": 88,
  "actionAt": "2026-09-20T09:14:00.000Z",
  "description": "Replaced laptop battery.",
  "result": "Battery now holds a full charge overnight.",
  "performedBy": { "id": 4, "name": "Michael Tan" },
  "followUpRequired": false,
  "followUpNote": null,
  "attachmentNotes": "Before/after photos: battery-before.jpg, battery-after.jpg",
  "createdAt": "2026-09-20T09:14:00.000Z",
  "updatedAt": "2026-09-20T09:14:00.000Z"
}
```

## Ticket Workflow — status change (extends Lab 3)
| Method | Path | Role | Body | Notes |
|---|---|---|---|---|
| PATCH | /api/staff/tickets/:id/status | IT Staff, Admin | `{ currentStatus, expectedUpdatedAt }` | `expectedUpdatedAt` is now **required** (Lab 3 had no concurrency check). Validated against the transition matrix (`specification.md` §5.1); 422 `illegal_status_transition` on an unlisted transition. A mismatched `expectedUpdatedAt` returns 409 `stale_ticket` and changes nothing, checked *before* the transition/gate logic runs. Transitioning into `RESOLVED` additionally requires at least one Action Taken on the Ticket (BR-10); if none exists, returns 422 `resolution_requires_action_taken` and the status is unchanged. |

All other Lab 2–3 Ticket/Attachment/Comment/Note/Admin routes are unchanged; see
`docs/lab-03/api-spec.md` for their full contract.

## Dashboards
Both endpoints require an active session with `mustChangePassword=false`. Neither ever returns a
full Ticket collection (BR-15) — only the documented counts and bounded recent-item lists.

### GET /api/dashboard/requester
Role: Requester. Scoped strictly to `requesterId = session.userId`; the caller cannot request
another Requester's data by any parameter.

| Field | Type | Calculation |
|---|---|---|
| `myOpenTickets` | number | Count where `requesterId = me` and `currentStatus` ∈ {NEW, OPEN, IN_PROGRESS, REOPENED} |
| `waitingForRequester` | number | Count where `requesterId = me` and `currentStatus = WAITING_FOR_REQUESTER` |
| `resolved` | number | Count where `requesterId = me` and `currentStatus = RESOLVED` |
| `closed` | number | Count where `requesterId = me` and `currentStatus = CLOSED` |
| `recentlyUpdatedTickets` | array (≤5) | `requesterId = me`, ordered `updatedAt desc`, `{ id, ticketNumber, summary, currentStatus, updatedAt }` |
| `recentlyResolvedTickets` | array (≤5) | `requesterId = me` and `currentStatus` ∈ {RESOLVED, CLOSED}, ordered `updatedAt desc`, same shape |

Empty account (no Tickets at all): every count is `0` and both arrays are `[]` — 200, not 404/204.

### GET /api/dashboard/staff
Role: IT Staff, Administrator. Organization-wide except where noted "current user."

| Field | Type | Calculation |
|---|---|---|
| `byStatus.new` / `.open` / `.inProgress` / `.waitingForRequester` | number | Org-wide count per `currentStatus` value |
| `unassigned` | number | Count where `ownerId IS NULL` and `currentStatus` ∉ {CLOSED, CANCELLED} |
| `myAssigned` | number | Count where `ownerId = session.userId` and `currentStatus` ∉ {CLOSED, CANCELLED, RESOLVED} |
| `byItPriority.low` / `.medium` / `.high` | number | Count of open Tickets (`currentStatus` ∉ {CLOSED, CANCELLED}) grouped by `itPriority` |
| `myRecentTickets` | array (≤5) | `ownerId = session.userId`, ordered `updatedAt desc`, `{ id, ticketNumber, summary, currentStatus, updatedAt }` |

"Recently updated"/"recently resolved" use top-N by `updatedAt desc`, not a calendar-day window
(see `specification.md` §11 for why); timestamps are returned in UTC ISO-8601 and formatted to the
viewer's local timezone client-side, same as every other timestamp in this API.

### Drill-down query parameters (both dashboards)
Each card's target screen accepts the following query parameters so a dashboard link can express
its filter directly in the URL (IT Staff Ticket Queue: `/staff/tickets`; Requester My Tickets:
`/tickets`):

| Parameter | Values | Applies to |
|---|---|---|
| `status` | One status, or a comma-separated list of statuses from `NEW\|OPEN\|IN_PROGRESS\|WAITING_FOR_REQUESTER\|RESOLVED\|CLOSED\|REOPENED\|CANCELLED` | Both; `GET /api/tickets` accepts a list for the Requester Dashboard's My Open Tickets drill-down. Invalid or empty list members return 400. |
| `ownerId` | `me\|unassigned\|<id>` | Staff queue only |
| `priority` | `LOW\|MEDIUM\|HIGH` | Staff queue only (filters `itPriority`) |

An unsupported value for any of these returns 400, matching the existing Lab 3 queue-filter
behavior.

## Concurrency summary
Every endpoint in this document that mutates an existing record (`PATCH .../status`,
`PATCH .../actions/:actionId`) requires `expectedUpdatedAt` and performs the compare-and-write
inside a single database transaction, so two callers racing on the same record can never both
"succeed" against the same stale value — see `specification.md` §7 and BR-13.
