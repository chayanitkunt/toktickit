import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/auth.js";
import { loginAgent, loginAsRequesterA, SEED_PASSWORD } from "../helpers/authClient.js";

describe("Lab 4 IT Staff dashboard API", () => {
  it("matches authoritative Ticket queries and returns only compact dashboard data", async () => {
    const agent = await loginAgent("michael.brown@tiktockit.com");
    const me = await agent.get("/api/auth/me");
    const prisma = getPrisma();
    const [newCount, openCount, inProgressCount, waitingCount, unassigned, myAssigned, low, medium, high, myRecentTickets] = await Promise.all([
      prisma.ticket.count({ where: { currentStatus: "NEW" } }), prisma.ticket.count({ where: { currentStatus: "OPEN" } }),
      prisma.ticket.count({ where: { currentStatus: "IN_PROGRESS" } }), prisma.ticket.count({ where: { currentStatus: "WAITING_FOR_REQUESTER" } }),
      prisma.ticket.count({ where: { ownerId: null, currentStatus: { notIn: ["CLOSED", "CANCELLED"] } } }),
      prisma.ticket.count({ where: { ownerId: me.body.id, currentStatus: { notIn: ["CLOSED", "CANCELLED", "RESOLVED"] } } }),
      prisma.ticket.count({ where: { itPriority: "LOW", currentStatus: { notIn: ["CLOSED", "CANCELLED"] } } }),
      prisma.ticket.count({ where: { itPriority: "MEDIUM", currentStatus: { notIn: ["CLOSED", "CANCELLED"] } } }),
      prisma.ticket.count({ where: { itPriority: "HIGH", currentStatus: { notIn: ["CLOSED", "CANCELLED"] } } }),
      prisma.ticket.findMany({ where: { ownerId: me.body.id }, select: { id: true, ticketNumber: true, summary: true, currentStatus: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 5 }),
    ]);
    const response = await agent.get("/api/dashboard/staff");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      byStatus: { new: newCount, open: openCount, inProgress: inProgressCount, waitingForRequester: waitingCount },
      unassigned, myAssigned, byItPriority: { low, medium, high }, myRecentTickets: JSON.parse(JSON.stringify(myRecentTickets)),
    });
    expect(JSON.stringify(response.body)).not.toContain("description");
  });

  it("allows Administrator and rejects Requester and unauthenticated access", async () => {
    const adminResponse = await (await loginAgent("jennifer.anderson@tiktockit.com")).get("/api/dashboard/staff");
    expect(adminResponse.status).toBe(200);
    expect((await (await loginAsRequesterA()).get("/api/dashboard/staff")).status).toBe(403);
    expect((await request(app).get("/api/dashboard/staff")).status).toBe(401);
  });

  it("returns zero user-specific metrics when current staff owns no Tickets", async () => {
    const email = `empty.staff.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`;
    await getPrisma().user.create({ data: {
      name: "Empty Dashboard Staff", email, role: "IT_STAFF", passwordHash: await hashPassword(SEED_PASSWORD), mustChangePassword: false,
    } });
    const response = await (await loginAgent(email)).get("/api/dashboard/staff");
    expect(response.status).toBe(200);
    expect(response.body.myAssigned).toBe(0);
    expect(response.body.myRecentTickets).toEqual([]);
    expect(response.body.byStatus).toEqual(expect.objectContaining({ new: expect.any(Number) }));
  });
});
