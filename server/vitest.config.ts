import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // All test files share one real Postgres database (no per-test
    // transaction isolation), so running files in parallel lets unrelated
    // suites (e.g. create-ticket.test.ts) write Tickets/Users at the same
    // time as tests/lab-03/migration.test.ts and corrupt its row counts.
    // Lab 3, Issue 2 — see docs/lab-03/tests.md for the note on this.
    fileParallelism: false,
  },
});
