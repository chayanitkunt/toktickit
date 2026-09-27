import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { loginAsRequesterA, loginAsRequesterB, SEED_PASSWORD } from "../helpers/authClient.js";

async function staff(email = "michael.brown@tiktockit.com") {
  const agent = request.agent(app);
  const response = await agent.post("/api/auth/login").send({ email, password: SEED_PASSWORD });
  if (response.status !== 200) throw new Error(`Staff login failed: ${JSON.stringify(response.body)}`);
  return agent;
}

async function freshTicket() {
  const requester = await loginAsRequesterA();
  const [categories, systems] = await Promise.all([
    request(app).get("/api/categories"), request(app).get("/api/related-systems"),
  ]);
  const response = await requester.post("/api/tickets")
    .field("categoryId", categories.body[0].id)
    .field("relatedSystemId", systems.body[0].id)
    .field("summary", "Lab 4 Actions Taken integration test ticket")
    .field("description", "A fresh ticket used to verify the Actions Taken API contract.")
    .field("requestedPriority", "LOW");
  expect(response.status).toBe(201);
  return { id: response.body.id, requester };
}

const validAction = {
  description: "  Replaced the failing network cable.  ",
  result: "  Connection is stable after replacement.  ",
  followUpRequired: false,
  attachmentNotes: "  Cable-photo.jpg  ",
};

describe("Lab 4 Actions Taken API", () => {
  it("creates a server-timestamped action with the authenticated staff member as performer", async () => {
    const ticket = await freshTicket();
    const agent = await staff();
    const me = await agent.get("/api/auth/me");
    const response = await agent.post(`/api/staff/tickets/${ticket.id}/actions`).send({
      ...validAction, performedById: 999999, actionAt: "2000-01-01T00:00:00.000Z",
    });

    expect(response.status).toBe(201);
    expect(response.body.ticketId).toBe(ticket.id);
    expect(response.body.performedBy).toMatchObject({ id: me.body.id, name: me.body.name });
    expect(response.body.description).toBe("Replaced the failing network cable.");
    expect(new Date(response.body.actionAt).getFullYear()).not.toBe(2000);
  });

  it("enforces follow-up rules and requester write authorization", async () => {
    const ticket = await freshTicket();
    const agent = await staff();
    const invalid = await agent.post(`/api/staff/tickets/${ticket.id}/actions`).send({
      ...validAction, followUpRequired: true, followUpNote: "   ",
    });
    expect(invalid.status).toBe(400);
    expect(await getPrisma().actionTaken.count({ where: { ticketId: ticket.id } })).toBe(0);

    const requesterWrite = await ticket.requester.post(`/api/staff/tickets/${ticket.id}/actions`).send(validAction);
    expect(requesterWrite.status).toBe(403);
  });

  it("rejects a follow-up note when follow-up is not required", async () => {
    const ticket = await freshTicket();
    const agent = await staff();
    const response = await agent.post(`/api/staff/tickets/${ticket.id}/actions`).send({
      ...validAction, followUpNote: "This must not be accepted when follow-up is false.",
    });
    expect(response.status).toBe(400);
    expect(await getPrisma().actionTaken.count({ where: { ticketId: ticket.id } })).toBe(0);
  });

  it("rejects missing required description/result fields without persisting an action", async () => {
    const ticket = await freshTicket();
    const agent = await staff();
    for (const body of [
      { ...validAction, description: "   " },
      { ...validAction, result: undefined },
    ]) {
      expect((await agent.post(`/api/staff/tickets/${ticket.id}/actions`).send(body)).status).toBe(400);
    }
    expect(await getPrisma().actionTaken.count({ where: { ticketId: ticket.id } })).toBe(0);
  });

  it("rejects descriptions and results longer than 2,000 characters", async () => {
    const ticket = await freshTicket();
    const agent = await staff();
    for (const body of [
      { ...validAction, description: "a".repeat(2001) },
      { ...validAction, result: "b".repeat(2001) },
    ]) {
      expect((await agent.post(`/api/staff/tickets/${ticket.id}/actions`).send(body)).status).toBe(400);
    }
    expect(await getPrisma().actionTaken.count({ where: { ticketId: ticket.id } })).toBe(0);
  });

  it("allows an Administrator to create and edit an Action Taken", async () => {
    const ticket = await freshTicket();
    const admin = await staff("jennifer.anderson@tiktockit.com");
    const created = await admin.post(`/api/staff/tickets/${ticket.id}/actions`).send(validAction);
    expect(created.status).toBe(201);
    expect(created.body.performedBy.name).toBe("Jennifer Anderson");
    const edited = await admin.patch(`/api/staff/tickets/${ticket.id}/actions/${created.body.id}`).send({
      result: "Administrator verified the connection is stable.",
      expectedUpdatedAt: created.body.updatedAt,
    });
    expect(edited.status).toBe(200);
    expect(edited.body.result).toBe("Administrator verified the connection is stable.");
  });

  it("rejects a Requester attempting to edit an existing Action Taken", async () => {
    const ticket = await freshTicket();
    const agent = await staff();
    const created = await agent.post(`/api/staff/tickets/${ticket.id}/actions`).send(validAction);
    const response = await ticket.requester.patch(`/api/staff/tickets/${ticket.id}/actions/${created.body.id}`).send({
      description: "Requester must not be able to edit this.", expectedUpdatedAt: created.body.updatedAt,
    });
    expect(response.status).toBe(403);
    expect((await getPrisma().actionTaken.findUniqueOrThrow({ where: { id: created.body.id } })).description)
      .toBe("Replaced the failing network cable.");
  });

  it("allows staff who is not the Ticket Owner to record work", async () => {
    const ticket = await freshTicket();
    const owner = await staff("staff.automation.b@tiktockit.com");
    const performer = await staff();
    const ownerIdentity = await owner.get("/api/auth/me");
    const performerIdentity = await performer.get("/api/auth/me");
    expect((await owner.post(`/api/staff/tickets/${ticket.id}/claim`).send({})).status).toBe(200);
    const response = await performer.post(`/api/staff/tickets/${ticket.id}/actions`).send(validAction);
    expect(response.status).toBe(201);
    expect(response.body.performedBy.id).toBe(performerIdentity.body.id);
    expect(response.body.performedBy.id).not.toBe(ownerIdentity.body.id);
    expect((await getPrisma().ticket.findUniqueOrThrow({ where: { id: ticket.id } })).ownerId)
      .toBe(ownerIdentity.body.id);
  });

  it("lists own-ticket actions oldest first while hiding another requester's ticket", async () => {
    const ticket = await freshTicket();
    const agent = await staff();
    await agent.post(`/api/staff/tickets/${ticket.id}/actions`).send(validAction);
    await agent.post(`/api/staff/tickets/${ticket.id}/actions`).send({
      ...validAction, description: "Checked port configuration.", result: "Port configuration is correct.",
    });
    const own = await ticket.requester.get(`/api/tickets/${ticket.id}/actions`);
    expect(own.status).toBe(200);
    expect(own.body).toHaveLength(2);
    expect(own.body[0].actionAt <= own.body[1].actionAt).toBe(true);
    const other = await loginAsRequesterB();
    expect((await other.get(`/api/tickets/${ticket.id}/actions`)).status).toBe(404);
  });

  it("rejects stale edits and keeps immutable action fields unchanged", async () => {
    const ticket = await freshTicket();
    const agent = await staff();
    const created = await agent.post(`/api/staff/tickets/${ticket.id}/actions`).send(validAction);
    const edited = await agent.patch(`/api/staff/tickets/${ticket.id}/actions/${created.body.id}`).send({
      description: "Updated description.", expectedUpdatedAt: created.body.updatedAt,
      ticketId: 123, performedById: 456, actionAt: "2000-01-01T00:00:00.000Z",
    });
    expect(edited.status).toBe(200);
    expect(edited.body.ticketId).toBe(ticket.id);
    expect(edited.body.performedBy).toEqual(created.body.performedBy);
    expect(edited.body.actionAt).toBe(created.body.actionAt);
    const stale = await agent.patch(`/api/staff/tickets/${ticket.id}/actions/${created.body.id}`).send({
      result: "A stale update.", expectedUpdatedAt: created.body.updatedAt,
    });
    expect(stale.status).toBe(409);
    expect(stale.body.code).toBe("stale_action_taken");
  });

  it("blocks resolution without work evidence, then permits it after an action", async () => {
    const ticket = await freshTicket();
    const agent = await staff();
    let detail = await agent.get(`/api/staff/tickets/${ticket.id}`);
    let response = await agent.patch(`/api/staff/tickets/${ticket.id}/status`).send({
      currentStatus: "OPEN", expectedUpdatedAt: detail.body.updatedAt,
    });
    expect(response.status).toBe(200);
    detail = await agent.get(`/api/staff/tickets/${ticket.id}`);
    response = await agent.patch(`/api/staff/tickets/${ticket.id}/status`).send({
      currentStatus: "IN_PROGRESS", expectedUpdatedAt: detail.body.updatedAt,
    });
    expect(response.status).toBe(200);
    detail = await agent.get(`/api/staff/tickets/${ticket.id}`);
    const blocked = await agent.patch(`/api/staff/tickets/${ticket.id}/status`).send({
      currentStatus: "RESOLVED", expectedUpdatedAt: detail.body.updatedAt,
    });
    expect(blocked.status).toBe(422);
    expect(blocked.body.code).toBe("resolution_requires_action_taken");
    await agent.post(`/api/staff/tickets/${ticket.id}/actions`).send(validAction);
    detail = await agent.get(`/api/staff/tickets/${ticket.id}`);
    const resolved = await agent.patch(`/api/staff/tickets/${ticket.id}/status`).send({
      currentStatus: "RESOLVED", expectedUpdatedAt: detail.body.updatedAt,
    });
    expect(resolved.status).toBe(200);
  });
});
