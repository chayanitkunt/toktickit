import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import {
  ADMIN_EMAIL,
  SEED_PASSWORD,
  loginAsRequesterA,
} from "../helpers/authClient.js";

// ---------------------------------------------------------------------------
// Issue 6 — GitHub Issue #33: IT Staff Ticket Detail workflow
//
// Covers AC-11 (claim/assign/reassign, BR-06), AC-12 (IT Priority, BR-07),
// AC-13 (status transitions, BR-08), and the authorization-matrix rows for
// every /api/staff/tickets/:id/... route added in this issue. The status
// transition *matrix itself* is unit-tested in
// tests/lab-03/status-transitions.unit.test.ts — this file only checks that
// the route wires that matrix in correctly (one legal + one illegal case),
// plus the surrounding auth/validation behavior.
// ---------------------------------------------------------------------------

const IT_STAFF_EMAIL = "michael.brown@tiktockit.com";
// AC-11/BR-06 reassignment needs a *second* IT Staff account. This is a
// dedicated automation account (mustChangePassword permanently false, see
// prisma/seed.ts) — deliberately NOT sarah.johnson/david.lee, since those
// two are reserved elsewhere to demonstrate the mandatory first-login
// password-change flow (AC-02), and logging in here would otherwise
// require completing that change, permanently mutating their real seeded
// password and breaking the next test run.
const IT_STAFF_B_EMAIL = "staff.automation.b@tiktockit.com";
const INACTIVE_IT_STAFF_EMAIL = "kevin.patel@tiktockit.com";

async function loginAsItStaff(email: string = IT_STAFF_EMAIL) {
  const agent = request.agent(app);
  const response = await agent
    .post("/api/auth/login")
    .send({ email, password: SEED_PASSWORD });

  if (response.status !== 200) {
    throw new Error(`IT Staff login failed: ${JSON.stringify(response.body)}`);
  }

  return agent;
}

async function loginAsAdmin() {
  const agent = request.agent(app);
  const response = await agent
    .post("/api/auth/login")
    .send({ email: ADMIN_EMAIL, password: SEED_PASSWORD });

  if (response.status !== 200) {
    throw new Error(`Administrator login failed: ${JSON.stringify(response.body)}`);
  }

  return agent;
}

// Every scenario needs its own fresh ticket (currentStatus always starts at
// NEW), rather than reusing seeded tickets whose status/owner is shared with
// other suites in this same-process, no-transaction-isolation database.
async function createFreshTicket(): Promise<{ id: number }> {
  const requester = await loginAsRequesterA();
  const categoriesResponse = await request(app).get("/api/categories");
  const relatedSystemsResponse = await request(app).get("/api/related-systems");

  const response = await requester
    .post("/api/tickets")
    .field("categoryId", categoriesResponse.body[0].id)
    .field("relatedSystemId", relatedSystemsResponse.body[0].id)
    .field("summary", "Issue 6 test ticket for staff operations")
    .field(
      "description",
      "Created by tests/lab-03/staff-ticket-detail.api.test.ts."
    )
    .field("requestedPriority", "LOW");

  expect(response.status).toBe(201);
  return { id: response.body.id };
}

describe("GET /api/staff/eligible-owners", () => {
  it("returns only active IT Staff/Administrator users", async () => {
    const staff = await loginAsItStaff();
    const response = await staff.get("/api/staff/eligible-owners");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);

    const emails = response.body.map((u: { name: string }) => u.name);
    expect(emails).not.toContain("Kevin Patel"); // inactive IT Staff — BR-06

    for (const owner of response.body) {
      expect(["IT_STAFF", "ADMINISTRATOR"]).toContain(owner.role);
    }
  });

  it("rejects a Requester with 403", async () => {
    const requester = await loginAsRequesterA();
    const response = await requester.get("/api/staff/eligible-owners");

    expect(response.status).toBe(403);
  });

  it("rejects an unauthenticated caller with 401", async () => {
    const response = await request(app).get("/api/staff/eligible-owners");
    expect(response.status).toBe(401);
  });
});

describe("POST /api/staff/tickets/:id/claim — AC-11/BR-06", () => {
  it("lets IT Staff self-claim an unassigned ticket", async () => {
    const ticket = await createFreshTicket();
    const staff = await loginAsItStaff();
    const me = await staff.get("/api/auth/me");

    const response = await staff
      .post(`/api/staff/tickets/${ticket.id}/claim`)
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.owner.id).toBe(me.body.id);
  });

  it("lets one IT Staff member reassign a ticket already owned by another", async () => {
    const ticket = await createFreshTicket();
    const staffA = await loginAsItStaff(IT_STAFF_EMAIL);
    await staffA.post(`/api/staff/tickets/${ticket.id}/claim`).send({});

    const staffB = await loginAsItStaff(IT_STAFF_B_EMAIL);
    const meB = await staffB.get("/api/auth/me");

    const response = await staffB
      .post(`/api/staff/tickets/${ticket.id}/claim`)
      .send({ ownerId: meB.body.id });

    expect(response.status).toBe(200);
    expect(response.body.owner.id).toBe(meB.body.id);
  });

  it("rejects assigning an inactive IT Staff user with 422 (BR-06)", async () => {
    const ticket = await createFreshTicket();
    const staff = await loginAsItStaff();

    // Inactive accounts cannot even log in (BR-16), so look their id up
    // directly rather than via the (separate, Issue 7) Admin user API.
    const inactiveUser = await getPrisma().user.findUniqueOrThrow({
      where: { email: INACTIVE_IT_STAFF_EMAIL },
    });

    const response = await staff
      .post(`/api/staff/tickets/${ticket.id}/claim`)
      .send({ ownerId: inactiveUser.id });

    expect(response.status).toBe(422);
    expect(response.body.code).toBe("invalid_owner");
  });

  it("rejects assigning a Requester as Ticket Owner with 422 (BR-06)", async () => {
    const ticket = await createFreshTicket();
    const staff = await loginAsItStaff();
    const requester = await loginAsRequesterA();
    const meRequester = await requester.get("/api/auth/me");

    const response = await staff
      .post(`/api/staff/tickets/${ticket.id}/claim`)
      .send({ ownerId: meRequester.body.id });

    expect(response.status).toBe(422);
    expect(response.body.code).toBe("invalid_owner");
  });

  it("rejects a non-integer ownerId with 400", async () => {
    const ticket = await createFreshTicket();
    const staff = await loginAsItStaff();

    const response = await staff
      .post(`/api/staff/tickets/${ticket.id}/claim`)
      .send({ ownerId: "not-a-number" });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("invalid_input");
  });

  it("returns 404 for a ticket id that does not exist", async () => {
    const staff = await loginAsItStaff();
    const response = await staff
      .post("/api/staff/tickets/999999999/claim")
      .send({});

    expect(response.status).toBe(404);
  });

  it("rejects a Requester with 403", async () => {
    const ticket = await createFreshTicket();
    const requester = await loginAsRequesterA();

    const response = await requester
      .post(`/api/staff/tickets/${ticket.id}/claim`)
      .send({});

    expect(response.status).toBe(403);
  });

  it("rejects an unauthenticated caller with 401", async () => {
    const ticket = await createFreshTicket();
    const response = await request(app)
      .post(`/api/staff/tickets/${ticket.id}/claim`)
      .send({});

    expect(response.status).toBe(401);
  });
});

describe("PATCH /api/staff/tickets/:id/priority — AC-12/BR-07", () => {
  it("updates IT Priority independently of Requested Priority", async () => {
    const ticket = await createFreshTicket();
    const staff = await loginAsItStaff();

    const response = await staff
      .patch(`/api/staff/tickets/${ticket.id}/priority`)
      .send({ itPriority: "HIGH" });

    expect(response.status).toBe(200);
    expect(response.body.itPriority).toBe("HIGH");

    const detail = await staff.get(`/api/staff/tickets/${ticket.id}`);
    expect(detail.body.itPriority).toBe("HIGH");
    expect(detail.body.requestedPriority).toBe("LOW"); // unchanged
  });

  it("rejects an invalid priority value with 400", async () => {
    const ticket = await createFreshTicket();
    const staff = await loginAsItStaff();

    const response = await staff
      .patch(`/api/staff/tickets/${ticket.id}/priority`)
      .send({ itPriority: "URGENT" });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("invalid_input");
  });

  it("rejects a Requester with 403", async () => {
    const ticket = await createFreshTicket();
    const requester = await loginAsRequesterA();

    const response = await requester
      .patch(`/api/staff/tickets/${ticket.id}/priority`)
      .send({ itPriority: "HIGH" });

    expect(response.status).toBe(403);
  });

  it("returns 404 for a ticket id that does not exist", async () => {
    const staff = await loginAsItStaff();
    const response = await staff
      .patch("/api/staff/tickets/999999999/priority")
      .send({ itPriority: "HIGH" });

    expect(response.status).toBe(404);
  });
});

describe("PATCH /api/staff/tickets/:id/status — AC-13/BR-08", () => {
  it("accepts a legal transition (NEW -> OPEN)", async () => {
    const ticket = await createFreshTicket();
    const staff = await loginAsItStaff();

    const response = await staff
      .patch(`/api/staff/tickets/${ticket.id}/status`)
      .send({ currentStatus: "OPEN" });

    expect(response.status).toBe(200);
    expect(response.body.currentStatus).toBe("OPEN");
  });

  it("rejects an illegal transition (NEW -> CLOSED) with 422 and leaves the ticket unchanged", async () => {
    const ticket = await createFreshTicket();
    const staff = await loginAsItStaff();

    const response = await staff
      .patch(`/api/staff/tickets/${ticket.id}/status`)
      .send({ currentStatus: "CLOSED" });

    expect(response.status).toBe(422);
    expect(response.body.code).toBe("invalid_transition");

    const detail = await staff.get(`/api/staff/tickets/${ticket.id}`);
    expect(detail.body.currentStatus).toBe("NEW");
  });

  it("rejects an unrecognized status value with 400", async () => {
    const ticket = await createFreshTicket();
    const staff = await loginAsItStaff();

    const response = await staff
      .patch(`/api/staff/tickets/${ticket.id}/status`)
      .send({ currentStatus: "NOT_A_STATUS" });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("invalid_input");
  });

  it("rejects a Requester with 403 (Requesters may only set problemAppearsResolved, BR-05)", async () => {
    const ticket = await createFreshTicket();
    const requester = await loginAsRequesterA();

    const response = await requester
      .patch(`/api/staff/tickets/${ticket.id}/status`)
      .send({ currentStatus: "OPEN" });

    expect(response.status).toBe(403);
  });

  it("returns 404 for a ticket id that does not exist", async () => {
    const staff = await loginAsItStaff();
    const response = await staff
      .patch("/api/staff/tickets/999999999/status")
      .send({ currentStatus: "OPEN" });

    expect(response.status).toBe(404);
  });

  it("allows an Administrator to change status the same as IT Staff", async () => {
    const ticket = await createFreshTicket();
    const admin = await loginAsAdmin();

    const response = await admin
      .patch(`/api/staff/tickets/${ticket.id}/status`)
      .send({ currentStatus: "OPEN" });

    expect(response.status).toBe(200);
  });
});
