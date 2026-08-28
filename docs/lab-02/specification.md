# Lab 2 Sprint Engineering Specification

## 1. Sprint Goal
Deliver a professional and responsive Requester-facing IT support ticketing application for TokTickIT. The sprint provides a temporary Development Requester selection mechanism for testing requester-specific behavior and enables the selected Requester to create tickets, upload permitted supporting attachments, receive a backend-generated unique Ticket Number, browse and manage their own tickets through search, filtering, sorting, and pagination, view Ticket Details, and manage permitted attachments. The implementation establishes reusable Zen Green UI conventions and a foundation that can later be extended with real authentication and role-based authorization in Lab 3.

## 2. Stakeholder Request Interpretation
TokTickIT needs a Requester-facing application that allows end users to submit and manage their own IT support requests. Because real authentication is outside the scope of Lab 2, the application uses a Development Requester Selection screen to simulate the current user during testing. The selected Requester determines which tickets can be created, listed, viewed, and used for attachment management.

The system must persist ticket and attachment data in PostgreSQL through the backend and must generate the official Ticket Number on the server. Requesters must be able to locate their own tickets using search, filters, sorting, and pagination, while the backend must prevent one selected Requester from retrieving or managing another Requester's ticket or attachment. The application must provide clear validation, loading, empty, success, and failure states and use a consistent responsive Zen Green design that can be reused in later labs.

## 3. Scope
### Included
* Development Requester Selection for Lab 2 testing.
* Loading and displaying active Development Requesters.
* Changing the current Development Requester and reloading requester-specific data.
* Creating a new IT support Ticket.
* Backend-generated unique Ticket Numbers.
* Backend-generated Ticket Date and initial Current Status (`NEW`).
* Category and Related System reference data.
* Requested Priority selection (`LOW`, `MEDIUM`, `HIGH`).
* Ticket Summary and Description validation.
* Attachment validation and upload (JPG, JPEG, PNG, WEBP, PDF; max 5MB; max 5 active attachments per ticket).
* My Tickets list for the currently selected Requester.
* Search, filtering, sorting, and pagination.
* Requester-owned Ticket Detail retrieval.
* Attachment metadata retrieval and display.
* Downloading active attachments.
* Adding permitted attachments to an existing owned Ticket.
* Soft removal of owned attachments with a recorded removal reason.
* Backend ownership checks for Tickets and Attachments.
* Loading, validation, empty, no-results, success, and failure states.
* Responsive desktop, tablet, and mobile layouts.
* Reusable Zen Green UI components and conventions.
* Automated unit, API, UI, responsive, visual, and end-to-end testing.

### Excluded
* Real authentication, login, logout, passwords, password hashing, sessions, tokens, and authenticated identities.
* Role-based authorization.
* IT Staff dashboards, queues, ticket claiming, reassignment, or IT Priority changes.
* Public Comments, Internal Notes, and Actions Taken.
* Ticket lifecycle changes after the initial `NEW` status.
* Resolving, closing, reopening, or cancelling Tickets.
* Administrator management of users, Requesters, roles, Categories, or Related Systems.
* Any Lab 3 authentication or authorization functionality.

## 4. Functional Requirements
* **FR-01 (Requester Selection):** The system shall allow selecting an active Development Requester to set the testing user context.
* **FR-02 (Context Persistence):** The system shall persist the selected Requester in frontend context and allow changing the Requester at any time.
* **FR-03 (Reference Data):** The system shall fetch active Categories and Related Systems from the backend database.
* **FR-04 (Ticket Creation):** The system shall allow the selected Requester to submit a Ticket with Summary, Description, Category, Related System, Requested Priority, and optional attachments.
* **FR-05 (Backend Generation):** The backend shall generate a unique Ticket Number (e.g., `TKT-2026-XXXXXX`), creation date, and initial status `NEW`.
* **FR-06 (Attachment Upload):** The system shall accept attachments meeting file type (JPG, JPEG, PNG, WEBP, PDF) and size (<= 5MB) constraints, up to 5 active attachments per ticket.
* **FR-07 (My Tickets Retrieval):** The system shall retrieve only tickets owned by the currently selected Requester.
* **FR-08 (Search, Filter, Sort, Page):** The ticket list shall support text search (Ticket Number or Summary), category/priority/status filtering, sorting, and pagination.
* **FR-09 (Ticket Detail):** The system shall display read-only details of an owned ticket for the current Requester.
* **FR-10 (Attachment Soft Removal):** The system shall allow soft removal of an attachment on an owned ticket upon providing a removal reason.
* **FR-11 (Attachment Download):** The system shall allow downloading active attachments, while preventing downloads of soft-removed attachments.
* **FR-12 (Ownership Protection):** The backend shall reject any attempt to read or modify tickets/attachments belonging to another Requester with an appropriate error (403 Forbidden).

## 5. Business Rules
* **BR-01:** The official Ticket Number is generated by the backend and must be unique across all tickets.
* **BR-02:** A new Ticket begins with `Current Status = NEW`.
* **BR-03:** Lab 2 uses a Development Requester selector instead of login. The selected identity is for testing only and is not authentication.
* **BR-04:** Inactive Requesters must be excluded from the Development Requester selection dropdown.
* **BR-05:** Ticket Summary (10–150 chars) and Description (20–2000 chars) are mandatory and trimmed before validation.
* **BR-06:** Permitted attachment file types are strictly: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`.
* **BR-07:** Maximum file size per attachment is 5 MB (5,242,880 bytes).
* **BR-08:** A Ticket can have a maximum of 5 active (non-removed) attachments at any time.
* **BR-09:** Attachment removal is executed as a soft removal (`isRemoved = true`).
* **BR-10:** Soft-removed attachments require a mandatory removal reason (min 5 chars).
* **BR-11:** Soft-removed attachments remain visible in metadata view but cannot be downloaded or previewed.
* **BR-12:** Requesters can only view, create attachments for, and soft-remove attachments from Tickets that they own (`requesterId` matches current context).
* **BR-13:** When ticket creation succeeds, form inputs are reset and the user is redirected or shown the generated Ticket Number with next steps.
* **BR-14:** If ticket creation fails after file submission, uploaded files are not orphaned in storage (compensation handling).
* **BR-15:** Switching the selected Development Requester must immediately clear cached ticket data and reload data for the new Requester.

## 6. UI Specification Summary
The UI adheres strictly to the **Zen Green Theme** visual language:
* **Colors:** Primary Green (`#006B3C`), Secondary Green (`#0B7A46`), Pale Green (`#EAF6EF`), Background (`#F5F7F6`), Surface (`#FFFFFF`), Text (`Dark Charcoal Green`).
* **Form Controls:** Labels above controls, red asterisk for required fields, consistent input heights, field-level validation messages.
* **Layouts:** Responsive vertical stacking on mobile (<768px), 2-column on tablet (768-991px), multi-column centered container on desktop (>=992px).
* **States:** Full support for loading spinners, skeleton states, clear empty-list & no-results states, inline field errors, banner API error notices, and success confirmation cards.

## 7. Data Changes
### Prisma Schema Concepts
* **RequesterUser:** `id`, `name`, `email`, `department`, `isActive`, `createdAt`, `updatedAt`
* **Category:** `id`, `name`, `code`, `isActive`
* **RelatedSystem:** `id`, `name`, `code`, `isActive`
* **Ticket:** `id`, `ticketNumber` (unique), `requesterId` (FK), `categoryId` (FK), `relatedSystemId` (FK), `summary`, `description`, `requestedPriority` (ENUM: LOW, MEDIUM, HIGH), `currentStatus` (ENUM: NEW, IN_PROGRESS, RESOLVED, CLOSED, PENDING; default: NEW), `createdAt`, `updatedAt`
* **Attachment:** `id`, `ticketId` (FK), `fileName`, `fileSize`, `mimeType`, `storagePath`, `isRemoved` (Boolean, default: false), `removedAt` (DateTime optional), `removedReason` (String optional), `createdAt`

### Migration & Seeding
* Seed data includes 4 categories (*Account & Access*, *Hardware*, *Software*, *Network*).
* Seed data includes at least 6 related systems (*Email*, *Campus Wi-Fi*, *VPN*, *LEB2 App*, *Grade Submission App*, *Printer*, *Corporate Laptop*).
* Seed data includes at least 4 active requesters and 1 inactive requester.

## 8. API Contract Summary
Refer to `docs/lab-02/api-spec.md` for full endpoints details:
* `GET /api/requesters` - List active requesters
* `GET /api/categories` - List active categories
* `GET /api/related-systems` - List active related systems
* `POST /api/tickets` - Create new ticket
* `GET /api/tickets` - List owned tickets (with search, filter, sort, pagination)
* `GET /api/tickets/:id` - Get owned ticket detail
* `POST /api/tickets/:id/attachments` - Upload attachment to ticket
* `GET /api/attachments/:id/download` - Download active attachment
* `DELETE /api/attachments/:id` - Soft-remove attachment

## 9. Acceptance Criteria
* **AC-01 (Ticket Creation):** Given valid form inputs and a selected Requester, when the user submits Create Ticket, then a ticket record is created, a unique Ticket Number (e.g., `TKT-2026-XXXXXX`) is assigned, initial status is `NEW`, and the ticket number is displayed in the UI.
* **AC-02 (Requester Context Guard):** Given no Development Requester is selected, when the user attempts to access My Tickets or Create Ticket, then the Development Requester Selection screen is presented.
* **AC-03 (Ownership Isolation):** Given Requester B is currently selected, when requesting a ticket or attachment created by Requester A, then the API returns 403 Forbidden and no data is exposed.
* **AC-04 (Attachment Type Restriction):** Given an unsupported file format (e.g., `.exe` or `.zip`), when attached during ticket creation, then the UI shows a field-level error and submission is blocked.
* **AC-05 (Attachment Size Limit):** Given a file larger than 5 MB, when attached, then the system rejects the file with an explicit size limit error message.
* **AC-06 (Max Attachments Limit):** Given a ticket with 5 active attachments, when attempting to upload a 6th attachment, then the upload action is disabled or rejected by backend validation.
* **AC-07 (Soft Removal & Reason):** Given an active attachment on an owned ticket, when the user initiates soft removal and enters a valid reason, then `isRemoved` becomes true, the reason is recorded, and download is disabled.
* **AC-08 (My Tickets Filter & Search):** Given a list of tickets, when searching by summary keyword or filtering by category, then only matching tickets owned by the current requester are returned.
* **AC-09 (Pagination):** Given a total ticket count exceeding page size, when clicking page 2, then page 2 tickets are loaded with updated pagination metadata.
* **AC-10 (Responsive UI):** Given a mobile viewport width (<768px), when viewing My Tickets or Create Ticket, then forms stack vertically and tables transform into touch-friendly cards without horizontal page scroll.

## 10. Definition of Done
* [ ] All functional requirements (FR-01 to FR-12) and business rules (BR-01 to BR-15) implemented.
* [ ] Database migration and idempotent seed scripts run without error.
* [ ] All unit, API, UI, and Playwright E2E tests pass cleanly in `main`.
* [ ] Zen Green theme visual conventions satisfied across all screen sizes.
* [ ] Required documentation files (`specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`, `ai-use.md`, `reviewer.md`) completed.
* [ ] Peer review completed via GitHub PR flow into `lab2-staging` and then `main`.
* [ ] Final single PDF compiled following the exact "Answer Part 1" to "Answer Part 9" format.

## 11. Assumptions and Decisions
* **Decision:** SQLite / PostgreSQL schema handles soft removal via `isRemoved`, `removedAt`, and `removedReason` columns on the `Attachment` table.
* **Decision:** Ticket Numbers follow format `TKT-YYYY-XXXXXX` where YYYY is current year and XXXXXX is sequential zero-padded number or random string.
* **Decision:** Local disk storage or memory buffer is used for file upload testing in Lab 2 before S3 or cloud storage is introduced in future labs.