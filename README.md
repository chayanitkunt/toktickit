# TokTickIT

TokTickIT is a full-stack IT Service Desk ticketing application developed for
CPE 334, Introduction to Software Engineering in the Age of AI Agents.

- **Lab 1** delivered the project foundation (health check API, Categories
  model, and a first read-only screen).
- **Lab 2** delivers the Requester-facing ticketing MVP: Create Ticket, My
  Tickets, Requester Ticket Detail, and the Attachment lifecycle, built on a
  temporary Development Requester selector used in place of real login.

## Technology Stack

- Frontend: React + TypeScript + Vite + Bootstrap
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL
- ORM: Prisma
- Unit / API / UI Component Testing: Vitest + Supertest + React Testing Library
- End-to-End / Responsive / Visual Testing: Playwright (desktop, tablet, and
  mobile viewport projects)

## Project Structure

```text
toktickit/
├── client/
│   ├── src/
│   │   ├── components/       # CreateTicket, MyTickets, TicketDetail, RequesterSelector
│   │   ├── DevelopmentRequesterContext.tsx
│   │   └── api.ts
│   └── tests/
│       ├── lab-02/           # Vitest UI component tests
│       └── e2e/              # Playwright E2E, responsive, and visual QA specs
├── server/
│   ├── prisma/                # schema.prisma, migrations, seed.ts
│   ├── src/                   # Express app and routes
│   └── tests/
│       └── lab-02/            # Vitest + Supertest API tests
├── docs/
│   ├── lab-01/
│   └── lab-02/                # specification.md, tests.md, ui-spec.md,
│                               # api-spec.md, reviewer.md, ai-use.md
├── artifacts/
│   └── lab-02/screenshots/    # Desktop/tablet/mobile visual QA evidence
├── .gitignore
└── README.md
```

## Setup & Running Locally

### Prerequisites

- Node.js (v18+)
- PostgreSQL

### 1. Backend Setup

```bash
cd server
npm install
npx prisma db push
npx prisma db seed
npm run dev
```

Server runs on `http://localhost:3000`.

### 2. Frontend Setup

Open a new terminal:

```bash
cd client
npm install
npm run dev
```

Client runs on `http://localhost:5173`.

### 3. Running Automated Tests

#### Backend: Unit + API Tests

```bash
cd server
npm test
```

#### Frontend: Unit + UI Component Tests

```bash
cd client
npm test
```

#### End-to-End, Responsive, and Visual QA Tests (Playwright)

The dev servers above must be running (or configured via
`client/playwright.config.ts`'s `webServer`) before running:

```bash
cd client
npx playwright test
```

This suite runs every E2E, responsive-layout, and visual QA spec across
three Playwright projects — `chromium` (desktop, 1280px), `tablet` (768px),
and `mobile` (390px, table pagination check skipped by design since
pagination is already covered on desktop/tablet). Screenshots are written to
`artifacts/lab-02/screenshots/`.

```bash
npx playwright show-report
```

opens the last HTML report.

## Lab 2 Features

- **Development Requester Selection** — a temporary, clearly-labeled testing
  mechanism (not real authentication) for choosing which seeded Requester is
  "logged in." Loads only active Requesters from PostgreSQL.
- **Create Ticket** — Requesters describe a problem, choose Category and
  Related System, set a Requested Priority, write a Summary/Description, and
  attach supporting files. The backend generates the official Ticket Number
  and initial `NEW` status.
- **Attachment upload at creation** — JPG/JPEG/PNG/WEBP/PDF only, max 5 MB
  per file, max 5 active attachments per ticket, with field-level validation
  and safe failure/retry behavior.
- **My Tickets** — search, category/requested-priority/IT-priority/status
  filters, sortable columns, and pagination, scoped strictly to the selected
  Requester's own tickets. A single responsive table (CSS-only breakpoint
  transform, not a duplicated DOM) adapts from a full data table on
  desktop/tablet to a stacked card layout on mobile.
- **Requester Ticket Detail** — read-only ticket information plus the full
  Attachment lifecycle: add an attachment, download an active attachment,
  and soft-remove an attachment with a required reason. Removed attachments
  remain visible as metadata but can never be downloaded again.
- **Ownership protection** — a Requester can never view, list, or act on
  another Requester's tickets or attachments; cross-requester access returns
  a safe 404 at the API layer.
- **Zen Green UI foundation** — a documented, reusable design system
  (`docs/lab-02/ui-spec.md`) covering color tokens, editable/read-only field
  states, validation placement, button hierarchy, badges, and responsive
  rules, applied consistently across all Lab 2 screens.

## Documentation

Lab 2 documentation is available in:

```text
docs/lab-02/
```

Including:

- `specification.md` — Sprint goal, scope, functional requirements,
  business rules, data model, API contract, acceptance criteria, and
  Definition of Done.
- `tests.md` — Planned-test table, acceptance-criterion traceability,
  responsive/visual checklist, and final pass status.
- `ui-spec.md` — Zen Green Theme tokens, component states, and
  responsive/accessibility rules.
- `api-spec.md` — REST endpoint paths, request/response contracts,
  validation rules, and HTTP status codes.
- `reviewer.md` — Peer review record (PR links, comments given/received,
  responses, and approvals).
- `ai-use.md` — AI tool used, key prompt log, and reflection.

Lab 1 documentation remains available in `docs/lab-01/`.
