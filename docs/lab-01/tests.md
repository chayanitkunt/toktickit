# Lab 1 — Test Plan and Evidence  (fill this in)

All test files live under server/tests/lab-01/ and client/tests/lab-01/.

| # | Tool | Test | Result |
|---|------|------|--------|
| 1 | Supertest | GET /api/health returns 200, status=ok | |
| 2 | Supertest | GET /api/categories returns 4 seeded categories in id order | |
| 3 | Vitest | Heading renders | |
| 4 | Vitest | Success state shows Online + category list | |
| 5 | Vitest | Error state shows Offline + message | |

Paste your passing terminal output / screenshot below.
# Lab 1 — Test Evidence

| Test ID | Tool | Test File | Description |
|---|---|---|---|
| API-01 | Supertest | server/tests/lab-01/health.test.ts | Health endpoint returns HTTP 200 and expected JSON |
| API-02 | Supertest | server/tests/lab-01/categories.test.ts | Categories endpoint returns the four seeded categories |
| UI-01 | Vitest | client/tests/lab-01/App.test.tsx | TokTickIT heading renders |
| UI-02 | Vitest | client/tests/lab-01/App.test.tsx | Loading/success/error UI state behaves correctly |