import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { requirePasswordChangeComplete } from "../../src/auth.js";
import type { Request, Response } from "express";

// All seeded accounts share the fake local-dev password documented in
// prisma/seed.ts and README.md.
const SEED_PASSWORD = "ChangeMe123!";

// jennifer.anderson@tiktockit.com is the only seeded account that does NOT
// require a password change, so it's used for tests that need to reach
// past login into other authenticated behavior.
const ADMIN_EMAIL = "jennifer.anderson@tiktockit.com";

describe("POST /api/auth/login", () => {
  it("AC-01: logs in an active user with valid credentials and returns safe user data", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: ADMIN_EMAIL, password: SEED_PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      name: "Jennifer Anderson",
      role: "ADMINISTRATOR",
      mustChangePassword: false,
    });
    expect(response.body).not.toHaveProperty("passwordHash");
    expect(response.body).not.toHaveProperty("password");
    expect(response.headers["set-cookie"]).toBeDefined();
    expect(response.headers["set-cookie"][0]).toMatch(/toktickit\.sid/);
  });

  it("AC-03/BR-10: rejects a wrong password with the generic message", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: ADMIN_EMAIL, password: "TotallyWrongPassword1!" });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Invalid email or password");
  });

  it("AC-03/BR-10: rejects an unknown email with the exact same generic message", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: SEED_PASSWORD });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Invalid email or password");
  });

  it("AC-03/BR-10: rejects a correctly-passworded but inactive account with the same generic message", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      // charlie@example.com is seeded as an inactive Requester.
      .send({ email: "charlie@example.com", password: SEED_PASSWORD });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Invalid email or password");
  });

  it("rejects a missing email or password with 400", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: ADMIN_EMAIL });

    expect(response.status).toBe(400);
  });

  it("login is case-insensitive on email (BR-13)", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: ADMIN_EMAIL.toUpperCase(), password: SEED_PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body.role).toBe("ADMINISTRATOR");
  });
});

describe("GET /api/auth/me", () => {
  it("AC-05: returns 401 when no session cookie is sent", async () => {
    const response = await request(app).get("/api/auth/me");

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("not_authenticated");
  });

  it("AC-05: returns only the caller's own identity when authenticated", async () => {
    const agent = request.agent(app);

    await agent
      .post("/api/auth/login")
      .send({ email: ADMIN_EMAIL, password: SEED_PASSWORD });

    const response = await agent.get("/api/auth/me");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      email: ADMIN_EMAIL,
      name: "Jennifer Anderson",
      role: "ADMINISTRATOR",
    });
  });
});

describe("POST /api/auth/logout", () => {
  it("FR-02/BR-12/AC-04: invalidates the session so the old cookie is rejected afterward", async () => {
    const agent = request.agent(app);

    await agent
      .post("/api/auth/login")
      .send({ email: ADMIN_EMAIL, password: SEED_PASSWORD });

    const meBeforeLogout = await agent.get("/api/auth/me");
    expect(meBeforeLogout.status).toBe(200);

    const logoutResponse = await agent.post("/api/auth/logout");
    expect(logoutResponse.status).toBe(204);

    const meAfterLogout = await agent.get("/api/auth/me");
    expect(meAfterLogout.status).toBe(401);
  });
});

describe("POST /api/auth/change-password", () => {
  it("requires authentication", async () => {
    const response = await request(app)
      .post("/api/auth/change-password")
      .send({ currentPassword: SEED_PASSWORD, newPassword: "NewStr0ng!Pass" });

    expect(response.status).toBe(401);
  });

  it("rejects an incorrect current password", async () => {
    const agent = request.agent(app);

    // ethan@example.com is a seeded active Requester with the default
    // seed password and mustChangePassword=true.
    await agent
      .post("/api/auth/login")
      .send({ email: "ethan@example.com", password: SEED_PASSWORD });

    const response = await agent
      .post("/api/auth/change-password")
      .send({ currentPassword: "WrongCurrentPassword1!", newPassword: "NewStr0ng!Pass" });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("invalid_current_password");
  });

  it("rejects a new password that does not meet the strength policy", async () => {
    const agent = request.agent(app);

    await agent
      .post("/api/auth/login")
      .send({ email: "ethan@example.com", password: SEED_PASSWORD });

    const response = await agent
      .post("/api/auth/change-password")
      .send({ currentPassword: SEED_PASSWORD, newPassword: "weak" });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("weak_password");
    expect(Array.isArray(response.body.details)).toBe(true);
  });

  it("AC-02: a valid change clears mustChangePassword and the new password works next login", async () => {
    const agent = request.agent(app);

    const loginResponse = await agent
      .post("/api/auth/login")
      .send({ email: "ethan@example.com", password: SEED_PASSWORD });
    expect(loginResponse.body.mustChangePassword).toBe(true);

    const changeResponse = await agent
      .post("/api/auth/change-password")
      .send({
        currentPassword: SEED_PASSWORD,
        newPassword: "BrandNewStr0ng!",
      });

    expect(changeResponse.status).toBe(200);
    expect(changeResponse.body.mustChangePassword).toBe(false);

    // Log back in with the new password to prove it actually persisted.
    const freshAgent = request.agent(app);
    const relogin = await freshAgent
      .post("/api/auth/login")
      .send({ email: "ethan@example.com", password: "BrandNewStr0ng!" });

    expect(relogin.status).toBe(200);
    expect(relogin.body.mustChangePassword).toBe(false);

    // Restore the seed password so this test is safe to re-run and doesn't
    // affect other tests/fixtures relying on ethan@example.com's password.
    await freshAgent.post("/api/auth/change-password").send({
      currentPassword: "BrandNewStr0ng!",
      newPassword: SEED_PASSWORD,
    });
  });
});

// AC-02/BR-02 — requirePasswordChangeComplete, tested directly as an Express
// middleware unit (no route in Lab 3 is wired to it yet; Issue 4 will apply
// it to the migrated Requester routes).
describe("requirePasswordChangeComplete middleware", () => {
  function buildResponse() {
    const res: Partial<Response> & { statusCode?: number; body?: unknown } = {};
    res.status = (code: number) => {
      res.statusCode = code;
      return res as Response;
    };
    res.json = (payload: unknown) => {
      res.body = payload;
      return res as Response;
    };
    return res as Response & { statusCode?: number; body?: unknown };
  }

  it("blocks a request when mustChangePassword is true", () => {
    const req = {
      currentUser: {
        id: 1,
        name: "Test User",
        email: "test@example.com",
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: true,
      },
    } as unknown as Request;
    const res = buildResponse();
    let nextCalled = false;

    requirePasswordChangeComplete(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(false);
    expect((res as any).statusCode).toBe(403);
    expect((res as any).body.code).toBe("password_change_required");
  });

  it("allows the request through once mustChangePassword is false", () => {
    const req = {
      currentUser: {
        id: 1,
        name: "Test User",
        email: "test@example.com",
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: false,
      },
    } as unknown as Request;
    const res = buildResponse();
    let nextCalled = false;

    requirePasswordChangeComplete(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
  });
});