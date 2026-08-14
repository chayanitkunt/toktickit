# Lab 1 — Test Plan and Evidence

All test files live under server/tests/lab-01/ and client/tests/lab-01/.

| # | Tool | Test | Result |
|---|------|------|--------|
| 1 | Supertest | GET /api/health returns 200, status=ok | PASSED |
| 2 | Supertest | GET /api/categories returns 4 seeded categories in id order | PASSED |
| 3 | Vitest | Heading renders | PASSED |
| 4 | Vitest | Success state shows Online + category list | PASSED |
| 5 | Vitest | Error state shows Offline + message | PASSED |

# Lab 1 — Test Evidence

| Test ID | Tool | Test File | Description |
|---|---|---|---|
| API-01 | Supertest | server/tests/lab-01/health.test.ts | Health endpoint returns HTTP 200 and expected JSON |
| API-02 | Supertest | server/tests/lab-01/categories.test.ts | Categories endpoint returns the four seeded categories |
| UI-01 | Vitest | client/tests/lab-01/App.test.tsx | TokTickIT heading renders |
| UI-02 | Vitest | client/tests/lab-01/App.test.tsx | Success state shows Online and the seeded categories |
| UI-03 | Vitest | client/tests/lab-01/App.test.tsx | Offline error state shows when API is unavailable |

### Verification Command Summary
- Server (Backend): `2 passed (2)`
- Client (Frontend): `3 passed (3)`