import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/auth.js";
import { loginAgent, SEED_PASSWORD } from "../helpers/authClient.js";

async function createRequester(label: string) {
  const email = `dashboard.${label}.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`;
  return getPrisma().user.create({ data: { name: label, email, role: "REQUESTER", passwordHash: await hashPassword(SEED_PASSWORD), mustChangePassword: false } });
}

async function createTicket(requesterId: number, currentStatus: "NEW" | "OPEN" | "IN_PROGRESS" | "WAITING_FOR_REQUESTER" | "RESOLVED" | "CLOSED" | "REOPENED") {
  const prisma = getPrisma();
  const [category, relatedSystem] = await Promise.all([prisma.category.findFirstOrThrow(), prisma.relatedSystem.findFirstOrThrow()]);
  return prisma.ticket.create({ data: {
    ticketNumber: `DASH-R-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    requesterId, categoryId: category.id, relatedSystemId: relatedSystem.id,
    summary: `Requester dashboard ${currentStatus}`, description: "Dashboard test fixture.",
    requestedPriority: "MEDIUM", itPriority: "MEDIUM", currentStatus,
  } });
}

describe("Lab 4 Requester dashboard API", () => {
  it("counts NEW, OPEN, IN_PROGRESS, and REOPENED as open while keeping other cards separate", async () => {
    const requester = await createRequester("Open Statuses");
    await Promise.all(["NEW", "OPEN", "IN_PROGRESS", "REOPENED", "WAITING_FOR_REQUESTER"]
      .map((status) => createTicket(requester.id, status as "NEW" | "OPEN" | "IN_PROGRESS" | "WAITING_FOR_REQUESTER" | "REOPENED")));
    const response = await (await loginAgent(requester.email)).get("/api/dashboard/requester");
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ myOpenTickets: 4, waitingForRequester: 1, resolved: 0, closed: 0 });
  });

  it("returns only the authenticated Requester's authoritative metrics and concise recent lists", async () => {
    const mine = await createRequester("My Dashboard Requester");
    const another = await createRequester("Other Dashboard Requester");
    await Promise.all([
      createTicket(mine.id, "NEW"), createTicket(mine.id, "WAITING_FOR_REQUESTER"), createTicket(mine.id, "RESOLVED"), createTicket(mine.id, "CLOSED"),
      createTicket(another.id, "NEW"), createTicket(another.id, "RESOLVED"),
    ]);
    const agent = await loginAgent(mine.email);
    const response = await agent.get(`/api/dashboard/requester?requesterId=${another.id}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ myOpenTickets: 1, waitingForRequester: 1, resolved: 1, closed: 1 });
    expect(response.body.recentlyUpdatedTickets).toHaveLength(4);
    expect(response.body.recentlyResolvedTickets).toHaveLength(2);
    const returnedIds = new Set([...response.body.recentlyUpdatedTickets, ...response.body.recentlyResolvedTickets].map((ticket: { id: number }) => ticket.id));
    for (const ticket of [...response.body.recentlyUpdatedTickets, ...response.body.recentlyResolvedTickets]) {
      expect(Object.keys(ticket).sort()).toEqual(["currentStatus", "id", "summary", "ticketNumber", "updatedAt"]);
    }
    expect(returnedIds).not.toContain((await getPrisma().ticket.findFirstOrThrow({ where: { requesterId: another.id } })).id);
    expect(JSON.stringify(response.body)).not.toContain("description");
    expect(response.body.recentlyUpdatedTickets.map((ticket: { updatedAt: string }) => ticket.updatedAt))
      .toEqual([...response.body.recentlyUpdatedTickets.map((ticket: { updatedAt: string }) => ticket.updatedAt)].sort().reverse());
  });

  it("returns documented zeros and empty arrays for an account with no Tickets", async () => {
    const requester = await createRequester("Empty Dashboard Requester");
    const response = await (await loginAgent(requester.email)).get("/api/dashboard/requester");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ myOpenTickets: 0, waitingForRequester: 0, resolved: 0, closed: 0, recentlyUpdatedTickets: [], recentlyResolvedTickets: [] });
  });

  it("caps each recent list at five items", async () => {
    const requester = await createRequester("Recent List Cap");
    for (let index = 0; index < 6; index += 1) {
      await createTicket(requester.id, index < 3 ? "RESOLVED" : "NEW");
    }
    const response = await (await loginAgent(requester.email)).get("/api/dashboard/requester");
    expect(response.status).toBe(200);
    expect(response.body.recentlyUpdatedTickets).toHaveLength(5);
    expect(response.body.recentlyResolvedTickets).toHaveLength(3);
  });

  it("rejects IT Staff, Administrator, and unauthenticated callers", async () => {
    const staff = await loginAgent("michael.brown@tiktockit.com");
    const admin = await loginAgent("jennifer.anderson@tiktockit.com");
    expect((await staff.get("/api/dashboard/requester")).status).toBe(403);
    expect((await admin.get("/api/dashboard/requester")).status).toBe(403);
    expect((await request(app).get("/api/dashboard/requester")).status).toBe(401);
  });
});
