# Lab 2 REST API Specification

## Base URL

`/api`

## Common Headers

* Request: `Content-Type: application/json` (or `multipart/form-data` for attachments)
* Context Header (Lab 2 temporary simulation): `X-Requester-Id: <id>`

---

## 1. Reference Data & Context Endpoints

### 1.1 GET `/api/requesters`

**Description:** Retrieve all active Development Requesters for the selector screen.

**Response 200 (OK):**

```json
[
  {
    "id": 1,
    "name": "Alice Johnson",
    "email": "alice@example.com"
  },
  {
    "id": 2,
    "name": "Bob Smith",
    "email": "bob@example.com"
  }
]
```

### 1.2 GET `/api/categories`

**Description:** Retrieve all active ticket categories.

**Response 200 (OK):** List of active categories:

* `Account & Access`
* `Hardware`
* `Software`
* `Network`

### 1.3 GET `/api/related-systems`

**Description:** Retrieve all active related systems.

**Response 200 (OK):** List of active related systems.

---

## 2. Ticket Endpoints

### 2.1 POST `/api/tickets`

**Description:** Create a new ticket for the currently selected Requester.

**Headers:**

`X-Requester-Id: 1`

**Request Body:**

```json
{
  "categoryId": 2,
  "relatedSystemId": 7,
  "requestedPriority": "MEDIUM",
  "summary": "Laptop battery drains quickly",
  "description": "My laptop battery is draining much faster than usual even when idle."
}
```

**Response 201 (Created):**

```json
{
  "id": 101,
  "ticketNumber": "TKT-2026-001234",
  "createdAt": "2026-08-28T10:00:00.000Z",
  "requesterId": 1,
  "categoryId": 2,
  "relatedSystemId": 7,
  "requestedPriority": "MEDIUM",
  "currentStatus": "NEW",
  "summary": "Laptop battery drains quickly",
  "description": "My laptop battery is draining much faster than usual even when idle.",
  "attachments": []
}
```

**Response 400 (Bad Request):**

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": {
    "summary": "Summary must be at least 10 characters long"
  }
}
```

### 2.2 GET `/api/tickets`

**Description:** Retrieve paginated tickets owned by the currently selected Requester.

**Headers:**

`X-Requester-Id: 1`

**Query Parameters:**

* `search` (string, optional)
* `categoryId` (int, optional)
* `priority` (string, optional: `LOW` | `MEDIUM` | `HIGH`)
* `status` (string, optional)
* `sortBy` (string, optional, default: `createdAt`)
* `sortOrder` (string, optional: `asc` | `desc`, default: `desc`)
* `page` (int, default: `1`)
* `pageSize` (int, default: `10`, max: `50`)

**Response 200 (OK):**

```json
{
  "data": [
    {
      "id": 101,
      "ticketNumber": "TKT-2026-001234",
      "createdAt": "2026-08-28T10:00:00.000Z",
      "summary": "Laptop battery drains quickly",
      "categoryName": "Hardware",
      "relatedSystemName": "Corporate Laptop",
      "requestedPriority": "MEDIUM",
      "currentStatus": "NEW",
      "lastUpdated": "2026-08-28T10:00:00.000Z",
      "attachmentCount": 2
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1
  }
}
```

### 2.3 GET `/api/tickets/:id`

**Description:** Retrieve details of a specific ticket owned by the currently selected Requester.

**Headers:**

`X-Requester-Id: 1`

**Response 200 (OK):** Full ticket details including attachment metadata array.

**Response 403 (Forbidden):** Returned when the requested ticket belongs to another Requester.

---

## 3. Attachment Endpoints

### 3.1 POST `/api/tickets/:id/attachments`

**Description:** Upload an attachment to an owned ticket.

**Headers:**

* `X-Requester-Id: 1`
* `Content-Type: multipart/form-data`

**Form Data:**

* `file` (Binary)

**Response 201 (Created):**

```json
{
  "id": 55,
  "ticketId": 101,
  "fileName": "battery_screenshot.png",
  "fileSize": 1048576,
  "mimeType": "image/png",
  "isRemoved": false,
  "createdAt": "2026-08-28T10:05:00.000Z"
}
```

### 3.2 GET `/api/attachments/:id/download`

**Description:** Download an active attachment belonging to a ticket owned by the currently selected Requester.

**Headers:**

`X-Requester-Id: 1`

**Response 200 (OK):** Binary file stream.

**Response 403 (Forbidden):** Returned when the attachment is soft-removed or belongs to a ticket owned by another Requester.

### 3.3 DELETE `/api/attachments/:id`

**Description:** Soft-remove an attachment belonging to the currently selected Requester.

**Headers:**

`X-Requester-Id: 1`

**Request Body:**

```json
{
  "reason": "Uploaded wrong file by mistake"
}
```

**Response 200 (OK):**

```json
{
  "id": 55,
  "fileName": "battery_screenshot.png",
  "isRemoved": true,
  "removedAt": "2026-08-28T10:10:00.000Z",
  "removedReason": "Uploaded wrong file by mistake"
}
```