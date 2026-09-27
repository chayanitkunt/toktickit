import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { loginAsRequesterA, SEED_PASSWORD } from "../helpers/authClient.js";

async function staff(email = "michael.brown@tiktockit.com") {
  const agent = request.agent(app);
  const login = await agent.post("/api/auth/login").send({ email, password: SEED_PASSWORD });
  if (login.status !== 200) throw new Error(`Staff login failed: ${JSON.stringify(login.body)}`);
  return agent;
}

async function freshTicket() {
  const requester = await loginAsRequesterA();
  const [categories, systems] = await Promise.all([
    request(app).get("/api/categories"), request(app).get("/api/related-systems"),
  ]);
  const created = await requester.post("/api/tickets")
    .field("categoryId", categories.body[0].id)
    .field("relatedSystemId", systems.body[0].id)
    .field("summary", `Lab 4 workflow test ${Date.now()}`)
    .field("description", "A Ticket for resolution-gate and concurrency tests.")
    .field("requestedPriority", "MEDIUM");
  expect(created.status).toBe(201);
  return { id: created.body.id, requester };
}

async function detail(agent: request.SuperAgentTest, id: number) {
  const response = await agent.get(`/api/staff/tickets/${id}`);
  expect(response.status).toBe(200);
  return response.body as { updatedAt: string; currentStatus: string };
}

async function change(agent: request.SuperAgentTest, id: number, currentStatus: string) {
  const ticket = await detail(agent, id);
  return agent.patch(`/api/staff/tickets/${id}/status`).send({ currentStatus, expectedUpdatedAt: ticket.updatedAt });
}

describe("Lab 4 Ticket workflow API", () => {
  it("accepts every documented transition and rejects an unlisted transition from every status", async () => {
    const { id } = await freshTicket();
    const agent = await staff();
    const matrix = {
      NEW: ["OPEN", "CANCELLED"],
      OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
      IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
      WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
      RESOLVED: ["CLOSED", "REOPENED"],
      CLOSED: ["REOPENED"],
      REOPENED: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
      CANCELLED: ["REOPENED"],
    } as const;

    // A work record makes all permitted routes into Resolved valid; the gate
    // itself is tested independently below.
    expect((await agent.post(`/api/staff/tickets/${id}/actions`).send({
      description: "Workflow evidence.", result: "Ready for status transition.", followUpRequired: false,
    })).status).toBe(201);
    let resetSequence = 0;
    const resetStatus = async (currentStatus: keyof typeof matrix) => {
      // Make each optimistic-lock version distinct even on database engines
      // whose timestamps have millisecond precision.
      const updatedAt = new Date(Date.now() + ++resetSequence);
      await getPrisma().ticket.update({
        where: { id }, data: { currentStatus: currentStatus as never, updatedAt },
      });
      return updatedAt.toISOString();
    };

    for (const [from, allowed] of Object.entries(matrix)) {
      for (const to of allowed) {
        const expectedUpdatedAt = await resetStatus(from as keyof typeof matrix);
        const response = await agent.patch(`/api/staff/tickets/${id}/status`).send({
          currentStatus: to, expectedUpdatedAt,
        });
        expect(response.status, `${from} → ${to}: ${JSON.stringify(response.body)}`).toBe(200);
      }

      const expectedUpdatedAt = await resetStatus(from as keyof typeof matrix);
      const rejected = await agent.patch(`/api/staff/tickets/${id}/status`).send({
        currentStatus: from, expectedUpdatedAt,
      });
      expect(rejected.status, `${from} → ${from}`).toBe(422);
      expect(rejected.body.code).toBe("illegal_status_transition");
    }
  });

  it("enforces the transition matrix and rejects Requester status writes", async () => {
    const { id, requester } = await freshTicket();
    const agent = await staff();
    const current = await detail(agent, id);

    expect((await agent.patch(`/api/staff/tickets/${id}/status`).send({ currentStatus: "CLOSED", expectedUpdatedAt: current.updatedAt })).body)
      .toMatchObject({ code: "illegal_status_transition" });
    expect((await getPrisma().ticket.findUniqueOrThrow({ where: { id } })).currentStatus).toBe("NEW");
    expect((await requester.patch(`/api/staff/tickets/${id}/status`).send({ currentStatus: "OPEN", expectedUpdatedAt: current.updatedAt })).status).toBe(403);
    expect((await agent.patch(`/api/staff/tickets/${id}/status`).send({ currentStatus: "OPEN" })).status).toBe(400);
    expect((await change(agent, id, "OPEN")).status).toBe(200);
  });

  it("blocks a direct resolution without Actions Taken, then permits it after work is recorded", async () => {
    const { id } = await freshTicket();
    const agent = await staff();
    expect((await change(agent, id, "OPEN")).status).toBe(200);
    expect((await change(agent, id, "IN_PROGRESS")).status).toBe(200);

    const blocked = await change(agent, id, "RESOLVED");
    expect(blocked.status).toBe(422);
    expect(blocked.body.code).toBe("resolution_requires_action_taken");
    expect((await getPrisma().ticket.findUniqueOrThrow({ where: { id } })).currentStatus).toBe("IN_PROGRESS");

    expect((await agent.post(`/api/staff/tickets/${id}/actions`).send({
      description: "Verified the affected configuration.", result: "Service is functioning.", followUpRequired: false,
    })).status).toBe(201);
    expect((await change(agent, id, "RESOLVED")).status).toBe(200);
  });

  it("returns stale_ticket before evaluating transitions or the resolution gate", async () => {
    const { id } = await freshTicket();
    const agent = await staff("jennifer.anderson@tiktockit.com");
    const before = await detail(agent, id);
    // Any committed update makes the client copy stale.
    expect((await agent.patch(`/api/staff/tickets/${id}/priority`).send({ itPriority: "HIGH" })).status).toBe(200);
    const stale = await agent.patch(`/api/staff/tickets/${id}/status`).send({
      currentStatus: "RESOLVED", expectedUpdatedAt: before.updatedAt,
    });
    expect(stale.status).toBe(409);
    expect(stale.body.code).toBe("stale_ticket");
    expect((await getPrisma().ticket.findUniqueOrThrow({ where: { id } })).currentStatus).toBe("NEW");
  });

  it("allows an Administrator to make a permitted status transition", async () => {
    const { id } = await freshTicket();
    const admin = await staff("jennifer.anderson@tiktockit.com");
    const response = await change(admin, id, "OPEN");
    expect(response.status).toBe(200);
    expect(response.body.currentStatus).toBe("OPEN");
  });
});
