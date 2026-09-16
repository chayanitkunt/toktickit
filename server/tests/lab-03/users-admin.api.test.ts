import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { ADMIN_EMAIL, loginAgent } from "../helpers/authClient.js";

// ---------------------------------------------------------------------------
// Issue 7 — Administrator User Management
//
// Covers FR-15..FR-19, BR-13..BR-16, and AC-17..AC-22 against
// docs/lab-03/api-spec.md's four /api/admin/users routes. Non-Administrator
// access to these routes (AC-23/API-20) is covered separately in
// tests/lab-03/authorization.api.test.ts, per tests.md.
//
// The seeded Administrator (jennifer.anderson@tiktockit.com) is the only
// active Administrator in the seed data and is reused by other test files,
// so nothing here actually deactivates or demotes her — every test either
// creates its own disposable users via the API under test, or exercises the
// safety rules in a way that ends in a rejection (state unchanged).
// ---------------------------------------------------------------------------

async function loginAsAdmin() {
  return loginAgent(ADMIN_EMAIL);
}

function uniqueEmail(prefix: string) {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 100000)}@tiktockit.com`;
}

async function createTestUser(
  admin: request.Agent,
  overrides: Partial<{
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    initialPassword: string;
  }> = {}
) {
  const payload = {
    name: overrides.name ?? "Test Automation User",
    email: overrides.email ?? uniqueEmail("test-user"),
    role: overrides.role ?? "REQUESTER",
    isActive: overrides.isActive ?? true,
    initialPassword: overrides.initialPassword ?? "Initial123!",
  };

  const response = await admin.post("/api/admin/users").send(payload);

  if (response.status !== 201) {
    throw new Error(
      `createTestUser failed (status ${response.status}): ${JSON.stringify(response.body)}`
    );
  }

  return { ...response.body, plainPassword: payload.initialPassword };
}

describe("GET /api/admin/users — FR-15/AC-17", () => {
  it("searches by partial name/email and filters by role", async () => {
    const admin = await loginAsAdmin();

    const marker = Date.now();
    const staffUser = await createTestUser(admin, {
      name: `Searchable Staff ${marker}`,
      role: "IT_STAFF",
    });
    const requesterUser = await createTestUser(admin, {
      name: `Searchable Requester ${marker}`,
      role: "REQUESTER",
    });

    // Search by a marker unique to both freshly created users' names. Note:
    // this must be a literal substring of each *full* name ("Searchable
    // Staff <marker>" / "Searchable Requester <marker>") — the route does a
    // plain substring match, so "Searchable <marker>" would NOT match
    // either name (the role word sits in between).
    const byName = await admin.get(
      `/api/admin/users?q=${encodeURIComponent(String(marker))}`
    );
    expect(byName.status).toBe(200);
    const namesFound = byName.body.data.map((u: { id: number }) => u.id);
    expect(namesFound).toContain(staffUser.id);
    expect(namesFound).toContain(requesterUser.id);

    // Search by (part of) email.
    const byEmail = await admin.get(
      `/api/admin/users?q=${encodeURIComponent(staffUser.email.split("@")[0])}`
    );
    expect(byEmail.status).toBe(200);
    expect(byEmail.body.data.map((u: { id: number }) => u.id)).toContain(staffUser.id);

    // Role filter returns only that role.
    const roleFiltered = await admin.get("/api/admin/users?role=IT_STAFF");
    expect(roleFiltered.status).toBe(200);
    for (const user of roleFiltered.body.data) {
      expect(user.role).toBe("IT_STAFF");
    }
    expect(roleFiltered.body.data.map((u: { id: number }) => u.id)).toContain(
      staffUser.id
    );
    expect(roleFiltered.body.data.map((u: { id: number }) => u.id)).not.toContain(
      requesterUser.id
    );
  });

  it("never exposes passwordHash in any response", async () => {
    const admin = await loginAsAdmin();
    const response = await admin.get("/api/admin/users?pageSize=100");

    expect(response.status).toBe(200);
    for (const user of response.body.data) {
      expect(user).not.toHaveProperty("passwordHash");
    }
  });
});

describe("POST /api/admin/users — FR-16/AC-18/BR-13", () => {
  it("creates a user with mustChangePassword=true", async () => {
    const admin = await loginAsAdmin();
    const created = await createTestUser(admin, { role: "IT_STAFF" });

    expect(created.id).toBeDefined();
    expect(created.role).toBe("IT_STAFF");
    expect(created.mustChangePassword).toBe(true);
    expect(created).not.toHaveProperty("passwordHash");
  });

  it("rejects a duplicate email (case-insensitive) with 409", async () => {
    const admin = await loginAsAdmin();
    const email = uniqueEmail("dup-user");

    const first = await admin.post("/api/admin/users").send({
      name: "Original User",
      email,
      role: "REQUESTER",
      isActive: true,
      initialPassword: "Initial123!",
    });
    expect(first.status).toBe(201);

    const duplicate = await admin.post("/api/admin/users").send({
      name: "Second User",
      email: email.toUpperCase(),
      role: "REQUESTER",
      isActive: true,
      initialPassword: "Initial123!",
    });

    expect(duplicate.status).toBe(409);
    expect(duplicate.body.code).toBe("conflict");
  });

  it("rejects an invalid role with 400", async () => {
    const admin = await loginAsAdmin();
    const response = await admin.post("/api/admin/users").send({
      name: "Bad Role User",
      email: uniqueEmail("bad-role"),
      role: "SUPERVISOR",
      isActive: true,
      initialPassword: "Initial123!",
    });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("invalid_input");
  });

  it("rejects missing required fields with 400", async () => {
    const admin = await loginAsAdmin();
    const response = await admin.post("/api/admin/users").send({
      email: uniqueEmail("missing-name"),
      role: "REQUESTER",
      isActive: true,
      initialPassword: "Initial123!",
    });

    expect(response.status).toBe(400);
  });

  it("rejects a weak initial password with 400", async () => {
    const admin = await loginAsAdmin();
    const response = await admin.post("/api/admin/users").send({
      name: "Weak Password User",
      email: uniqueEmail("weak-pw"),
      role: "REQUESTER",
      isActive: true,
      initialPassword: "weak",
    });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("weak_password");
  });
});

describe("PATCH /api/admin/users/:id — FR-17/AC-19/BR-14/BR-15", () => {
  it("updates name, email, role, and activation state, reflected on the next list fetch", async () => {
    const admin = await loginAsAdmin();
    const user = await createTestUser(admin, { role: "REQUESTER" });

    const newEmail = uniqueEmail("edited-user");
    const patchResponse = await admin.patch(`/api/admin/users/${user.id}`).send({
      name: "Edited Name",
      email: newEmail,
      role: "IT_STAFF",
      isActive: false,
    });

    expect(patchResponse.status).toBe(200);
    expect(patchResponse.body).toMatchObject({
      id: user.id,
      name: "Edited Name",
      email: newEmail,
      role: "IT_STAFF",
      isActive: false,
    });

    const listResponse = await admin.get(
      `/api/admin/users?q=${encodeURIComponent(newEmail)}`
    );
    expect(listResponse.status).toBe(200);
    const refetched = listResponse.body.data.find(
      (u: { id: number }) => u.id === user.id
    );
    expect(refetched).toMatchObject({
      name: "Edited Name",
      email: newEmail,
      role: "IT_STAFF",
      isActive: false,
    });
  });

  it("rejects a duplicate email on edit with 409", async () => {
    const admin = await loginAsAdmin();
    const userA = await createTestUser(admin);
    const userB = await createTestUser(admin);

    const response = await admin
      .patch(`/api/admin/users/${userB.id}`)
      .send({ email: userA.email });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("conflict");
  });

  it("rejects an Administrator deactivating their own account with 409 (BR-14)", async () => {
    const admin = await loginAsAdmin();
    const me = await admin.get("/api/auth/me");

    const response = await admin
      .patch(`/api/admin/users/${me.body.id}`)
      .send({ isActive: false });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("self_deactivation");

    // Confirm the account is genuinely unchanged, not just an early return.
    const recheck = await admin.get("/api/auth/me");
    expect(recheck.body.isActive).not.toBe(false);
  });

  it("rejects changing the last active Administrator's role away from Administrator with 409 (BR-15)", async () => {
    const admin = await loginAsAdmin();
    const me = await admin.get("/api/auth/me");

    // Not a deactivation (BR-14 doesn't apply — isActive is untouched), so
    // this specifically exercises the "last active Administrator" guard on
    // a role change, distinct from the self-deactivation guard above.
    const response = await admin
      .patch(`/api/admin/users/${me.body.id}`)
      .send({ role: "IT_STAFF" });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("last_admin");

    const recheck = await admin.get("/api/auth/me");
    expect(recheck.body.role).toBe("ADMINISTRATOR");
  });

  it("allows deactivating a non-last active Administrator", async () => {
    const admin = await loginAsAdmin();
    const secondAdmin = await createTestUser(admin, { role: "ADMINISTRATOR" });

    const response = await admin
      .patch(`/api/admin/users/${secondAdmin.id}`)
      .send({ isActive: false });

    expect(response.status).toBe(200);
    expect(response.body.isActive).toBe(false);
  });

  it("returns 404 for a nonexistent user id", async () => {
    const admin = await loginAsAdmin();
    const response = await admin
      .patch("/api/admin/users/999999999")
      .send({ name: "Nobody" });

    expect(response.status).toBe(404);
  });
});

describe("POST /api/admin/users/:id/reset-password — FR-18/AC-20", () => {
  it("sets a new password and forces mustChangePassword at the next login", async () => {
    const admin = await loginAsAdmin();
    const user = await createTestUser(admin, { role: "REQUESTER" });

    // Complete the mandatory first-login change so mustChangePassword is
    // false before the reset, proving the reset flips it back to true
    // rather than it just having never been cleared.
    const userAgent = request.agent(app);
    const firstLogin = await userAgent
      .post("/api/auth/login")
      .send({ email: user.email, password: user.plainPassword });
    expect(firstLogin.status).toBe(200);
    expect(firstLogin.body.mustChangePassword).toBe(true);

    const changeResponse = await userAgent.post("/api/auth/change-password").send({
      currentPassword: user.plainPassword,
      newPassword: "ChangedByUser123!",
    });
    expect(changeResponse.status).toBe(200);
    expect(changeResponse.body.mustChangePassword).toBe(false);

    // Administrator resets the password.
    const resetResponse = await admin
      .post(`/api/admin/users/${user.id}/reset-password`)
      .send({ newInitialPassword: "ResetByAdmin123!" });

    expect(resetResponse.status).toBe(200);
    expect(resetResponse.body.mustChangePassword).toBe(true);

    // The password the user set themselves no longer works.
    const staleLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "ChangedByUser123!" });
    expect(staleLogin.status).toBe(401);

    // The Administrator-issued password works and requires another change.
    const freshLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "ResetByAdmin123!" });
    expect(freshLogin.status).toBe(200);
    expect(freshLogin.body.mustChangePassword).toBe(true);
  });

  it("rejects a weak new initial password with 400", async () => {
    const admin = await loginAsAdmin();
    const user = await createTestUser(admin);

    const response = await admin
      .post(`/api/admin/users/${user.id}/reset-password`)
      .send({ newInitialPassword: "weak" });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("weak_password");
  });

  it("returns 404 for a nonexistent user id", async () => {
    const admin = await loginAsAdmin();
    const response = await admin
      .post("/api/admin/users/999999999/reset-password")
      .send({ newInitialPassword: "ResetByAdmin123!" });

    expect(response.status).toBe(404);
  });
});
