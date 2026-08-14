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

Setup & Running Locally
Prerequisites
Node.js (v18+)

PostgreSQL Database

1. Backend Setup

cd server
npm install
npx prisma db push
npx prisma db seed
npm run dev

Server runs on http://localhost:3000.


2. Frontend Setup

cd client
npm install
npm run dev

Client runs on http://localhost:5173.


3. Running Automated Tests
Backend Tests: cd server && npm test

Frontend Tests: cd client && npm test
