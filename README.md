# TokTickIT

TokTickIT is a full-stack IT Service Desk application developed for CPE334 Lab 1.

## Technology Stack

- Frontend: React + TypeScript + Vite + Bootstrap
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL
- ORM: Prisma
- Testing: Vitest + Supertest

## Project Structure

```text
toktickit/
├── client/
├── server/
│   ├── prisma/
│   ├── src/
│   └── tests/
├── docs/
│   └── lab-01/
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

#### Backend Tests

```bash
cd server
npm test
```

Expected result: **2 tests passed**

#### Frontend Tests

```bash
cd client
npm test
```

Expected result: **3 tests passed**

## Lab 1 Features

- Project foundation with React, Express, TypeScript, and PostgreSQL
- Backend health check endpoint: `GET /api/health`
- IT request category database model and seed data
- Categories API: `GET /api/categories`
- Frontend category list display
- Loading, success, and error states
- Automated backend and frontend tests

## Documentation

Lab 1 documentation is available in:

```text
docs/lab-01/
```

Including:

- Test Plan and Evidence
- Peer Review Record
- AI Use Documentation
