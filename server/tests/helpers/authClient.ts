import request from "supertest";
import { app } from "../../src/app.js";

// ---------------------------------------------------------------------------
// Issue 4 — shared authenticated-agent helper
//
// Every Requester route now requires a real session (requireAuth +
// requirePasswordChangeComplete + requireRole("REQUESTER")) instead of the
// old X-Requester-Id header. This helper centralizes the login step so the
// migrated tests/lab-02 suites and tests/lab-03/authorization.api.test.ts
// don't each re-implement it.
// ---------------------------------------------------------------------------

// All seeded accounts share this fake, local-development-only password
// (see server/prisma/seed.ts). Never a real credential.
export const SEED_PASSWORD = "ChangeMe123!";

// Dedicated automation accounts (server/prisma/seed.ts, Issue 4) that are
// seeded with mustChangePassword=false, so tests can log in and immediately
// exercise ownership/authorization behavior without a change-password
// detour that would otherwise mutate shared demo-account credentials.
export const REQUESTER_A_EMAIL = "quinn.requester@example.com";
export const REQUESTER_B_EMAIL = "riley.requester@example.com";

// Seeded inactive Requester — still useful for confirming an inactive
// account cannot authenticate at all (covered primarily in
// tests/lab-03/auth.api.test.ts, referenced here for completeness).
export const INACTIVE_REQUESTER_EMAIL = "charlie@example.com";

export const ADMIN_EMAIL = "jennifer.anderson@tiktockit.com";

/**
 * Logs in as the given seeded user and returns a supertest agent that
 * carries the resulting session cookie on every subsequent request.
 * Throws if login does not return 200, so a bad email/password fails fast
 * with a clear error instead of silently continuing as "not authenticated".
 */
export async function loginAgent(
  email: string,
  password: string = SEED_PASSWORD
) {
  const agent = request.agent(app);

  const response = await agent
    .post("/api/auth/login")
    .send({ email, password });

  if (response.status !== 200) {
    throw new Error(
      `loginAgent: login failed for ${email} (status ${response.status}): ${JSON.stringify(
        response.body
      )}`
    );
  }

  return agent;
}

export async function loginAsRequesterA() {
  return loginAgent(REQUESTER_A_EMAIL);
}

export async function loginAsRequesterB() {
  return loginAgent(REQUESTER_B_EMAIL);
}
