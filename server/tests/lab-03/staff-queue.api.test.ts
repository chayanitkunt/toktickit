import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import {
  ADMIN_EMAIL,
  SEED_PASSWORD,
  loginAsRequesterA,
} from "../helpers/authClient.js";

// ---------------------------------------------------------------------------
// Issue 5 — GitHub Issue #32: IT Staff Ticket Queue
//
// Covers AC-10 (search/filter/sort/pagination) and the AC-23/§5.2
// authorization-matrix row for the queue and staff ticket detail routes.
// Assertions are written against the known seed data (server/prisma/seed.ts)
// rather than tickets created by the test itself, since this suite shares
// one real Postgres database with every other API test file
// (server/vitest.config.ts — fileParallelism: false).
// ---------------------------------------------------------------------------

async function loginAsItStaff() {
  const agent = request.agent(app);
  const response = await agent
    .post("/api/auth/login")
    .send({ email: "michael.brown@tiktockit.com", password: SEED_PASSWORD });

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

describe("FR-09/AC-23 — GET /api/staff/tickets authorization", () => {
  it("allows IT Staff to view the queue", async () => {
    const staff = await loginAsItStaff();
    const response = await staff.get("/api/staff/tickets");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.meta).toEqual(
      expect.objectContaining({ page: 1, pageSize: 10 })
    );
  });

  it("allows an Administrator to view the queue", async () => {
    const admin = await loginAsAdmin();
    const response = await admin.get("/api/staff/tickets");

    expect(response.status).toBe(200);
  });

  it("rejects a Requester with 403", async () => {
    const requester = await loginAsRequesterA();
    const response = await requester.get("/api/staff/tickets");

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("forbidden");
  });

  it("rejects an unauthenticated caller with 401", async () => {
    const response = await request(app).get("/api/staff/tickets");

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("not_authenticated");
  });
});

describe("AC-10 — GET /api/staff/tickets search, filters, sort, pagination", () => {
  it("search matches ticket number or summary", async () => {
    const staff = await loginAsItStaff();

    const response = await staff
      .get("/api/staff/tickets")
      .query({ q: "VPN" });

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(
      response.body.data.every(
        (ticket: { summary: string; ticketNumber: string }) =>
          ticket.summary.toLowerCase().includes("vpn") ||
          ticket.ticketNumber.toLowerCase().includes("vpn")
      )
    ).toBe(true);
  });

  it("filters by status", async () => {
    const staff = await loginAsItStaff();

    const response = await staff
      .get("/api/staff/tickets")
      .query({ status: "RESOLVED", pageSize: 50 });

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(
      response.body.data.every(
        (ticket: { currentStatus: string }) =>
          ticket.currentStatus === "RESOLVED"
      )
    ).toBe(true);
  });

  it("filters by IT Priority", async () => {
    const staff = await loginAsItStaff();

    const response = await staff
      .get("/api/staff/tickets")
      .query({ priority: "HIGH", pageSize: 50 });

    expect(response.status).toBe(200);
    expect(
      response.body.data.every(
        (ticket: { itPriority: string }) => ticket.itPriority === "HIGH"
      )
    ).toBe(true);
  });

  it('filters by ownerId="unassigned"', async () => {
    const staff = await loginAsItStaff();

    const response = await staff
      .get("/api/staff/tickets")
      .query({ ownerId: "unassigned", pageSize: 50 });

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(
      response.body.data.every(
        (ticket: { ownerId: number | null }) => ticket.ownerId === null
      )
    ).toBe(true);
  });

  it('filters by ownerId="me"', async () => {
    const staff = await loginAsItStaff();
    const me = await staff.get("/api/auth/me");

    const response = await staff
      .get("/api/staff/tickets")
      .query({ ownerId: "me", pageSize: 50 });

    expect(response.status).toBe(200);
    expect(
      response.body.data.every(
        (ticket: { ownerId: number | null }) => ticket.ownerId === me.body.id
      )
    ).toBe(true);
  });

  it("sorts by createdAt ascending", async () => {
    const staff = await loginAsItStaff();

    const response = await staff
      .get("/api/staff/tickets")
      .query({ sort: "createdAt", dir: "asc", pageSize: 50 });

    expect(response.status).toBe(200);
    const dates = response.body.data.map((ticket: { createdAt: string }) =>
      new Date(ticket.createdAt).getTime()
    );
    const sorted = [...dates].sort((a, b) => a - b);
    expect(dates).toEqual(sorted);
  });

  it("paginates results, honoring pageSize and page", async () => {
    const staff = await loginAsItStaff();

    const pageOne = await staff
      .get("/api/staff/tickets")
      .query({ page: 1, pageSize: 2 });

    expect(pageOne.status).toBe(200);
    expect(pageOne.body.data.length).toBeLessThanOrEqual(2);
    expect(pageOne.body.meta.page).toBe(1);
    expect(pageOne.body.meta.pageSize).toBe(2);

    if (pageOne.body.meta.totalPages > 1) {
      const pageTwo = await staff
        .get("/api/staff/tickets")
        .query({ page: 2, pageSize: 2 });

      expect(pageTwo.status).toBe(200);
      const pageOneIds = pageOne.body.data.map((t: { id: number }) => t.id);
      const pageTwoIds = pageTwo.body.data.map((t: { id: number }) => t.id);
      expect(pageOneIds.some((id: number) => pageTwoIds.includes(id))).toBe(
        false
      );
    }
  });

  it("rejects an invalid status value with 400", async () => {
    const staff = await loginAsItStaff();

    const response = await staff
      .get("/api/staff/tickets")
      .query({ status: "NOT_A_STATUS" });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("invalid_input");
  });

  it("rejects an invalid sort field with 400", async () => {
    const staff = await loginAsItStaff();

    const response = await staff
      .get("/api/staff/tickets")
      .query({ sort: "not_a_field" });

    expect(response.status).toBe(400);
  });

  it("rejects pageSize over 50 with 400", async () => {
    const staff = await loginAsItStaff();

    const response = await staff
      .get("/api/staff/tickets")
      .query({ pageSize: 51 });

    expect(response.status).toBe(400);
  });

  it("rejects a non-positive-integer page with 400", async () => {
    const staff = await loginAsItStaff();

    const response = await staff
      .get("/api/staff/tickets")
      .query({ page: 0 });

    expect(response.status).toBe(400);
  });
});

describe("FR-10 — GET /api/staff/tickets/:id", () => {
  it("lets IT Staff open a Ticket regardless of who owns it", async () => {
    const staff = await loginAsItStaff();

    const queue = await staff.get("/api/staff/tickets").query({ pageSize: 50 });
    expect(queue.body.data.length).toBeGreaterThan(0);

    const targetId = queue.body.data[0].id;
    const detail = await staff.get(`/api/staff/tickets/${targetId}`);

    expect(detail.status).toBe(200);
    expect(detail.body.id).toBe(targetId);
    expect(detail.body.requester).toEqual(
      expect.objectContaining({ id: expect.any(Number), name: expect.any(String) })
    );
  });

  it("returns 404 for a ticket id that does not exist", async () => {
    const staff = await loginAsItStaff();
    const response = await staff.get("/api/staff/tickets/999999999");

    expect(response.status).toBe(404);
    expect(response.body.code).toBe("not_found");
  });

  it("rejects a Requester with 403", async () => {
    const requester = await loginAsRequesterA();
    const response = await requester.get("/api/staff/tickets/1");

    expect(response.status).toBe(403);
  });
});

