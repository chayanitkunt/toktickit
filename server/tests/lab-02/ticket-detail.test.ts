import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import {
  loginAsRequesterA,
  loginAsRequesterB,
} from "../helpers/authClient.js";

// Issue 4 — migrated from X-Requester-Id to authenticated sessions.
// Requester A (Quinn) owns the tickets created in these tests; Requester B
// (Riley) is used purely to prove cross-owner access is denied.

type AuthedAgent = Awaited<ReturnType<typeof loginAsRequesterA>>;

// Creates a brand-new ticket owned by the given authenticated agent so each
// test works with its own isolated data instead of reusing/mutating shared
// seed tickets (which breaks when tests run in sequence).
async function createTicketAs(agent: AuthedAgent) {
  const categoriesResponse = await request(app).get("/api/categories");
  const relatedSystemsResponse = await request(app).get(
    "/api/related-systems"
  );

  const categoryId = categoriesResponse.body[0].id;
  const relatedSystemId = relatedSystemsResponse.body[0].id;

  const response = await agent
    .post("/api/tickets")
    .field("categoryId", categoryId)
    .field("relatedSystemId", relatedSystemId)
    .field("summary", "Isolated test ticket for attachment tests")
    .field(
      "description",
      "This ticket is created fresh by each test so it does not depend on shared/mutated seed data."
    )
    .field("requestedPriority", "MEDIUM");

  expect(response.status).toBe(201);

  return response.body as { id: number; ticketNumber: string };
}

// Creates a fresh ticket and immediately attaches one file to it, returning
// both so DELETE/download tests always operate on a known-active attachment
// instead of guessing attachments[0].
async function createTicketWithAttachment(
  agent: AuthedAgent,
  fileName = "seed-for-test.png"
) {
  const ticket = await createTicketAs(agent);

  const uploadResponse = await agent
    .post(`/api/tickets/${ticket.id}/attachments`)
    .attach("attachments", Buffer.from("test attachment content"), fileName);

  expect(uploadResponse.status).toBe(201);

  const detailResponse = await agent.get(`/api/tickets/${ticket.id}`);

  const attachment = detailResponse.body.attachments.find(
    (item: { fileName: string }) => item.fileName === fileName
  );

  expect(attachment).toBeDefined();

  return { ticket, attachment };
}

describe("GET /api/tickets/:id", () => {
  it("returns ticket details for the ticket owner", async () => {
    const agent = await loginAsRequesterA();
    const created = await createTicketAs(agent);

    const response = await agent.get(`/api/tickets/${created.id}`);

    expect(response.status).toBe(200);

    expect(response.body).toHaveProperty("id", created.id);
    expect(response.body).toHaveProperty("ticketNumber");
    expect(response.body).toHaveProperty("summary");
    expect(response.body).toHaveProperty("description");
    expect(response.body).toHaveProperty("requestedPriority");
    expect(response.body).toHaveProperty("currentStatus");

    expect(response.body).toHaveProperty("category");
    expect(response.body.category).toHaveProperty("id");
    expect(response.body.category).toHaveProperty("name");

    expect(response.body).toHaveProperty("relatedSystem");
    expect(response.body.relatedSystem).toHaveProperty("id");
    expect(response.body.relatedSystem).toHaveProperty("name");

    expect(response.body).toHaveProperty("attachments");
    expect(Array.isArray(response.body.attachments)).toBe(true);
  });

  it("does not allow a requester to access another requester's ticket (BR-03/AC-06)", async () => {
    const ownerAgent = await loginAsRequesterA();
    const created = await createTicketAs(ownerAgent);

    const otherAgent = await loginAsRequesterB();
    const response = await otherAgent.get(`/api/tickets/${created.id}`);

    expect(response.status).toBe(404);
  });

  it("rejects a request with no authenticated session", async () => {
    const response = await request(app).get("/api/tickets/1");

    expect(response.status).toBe(401);
  });

  it("rejects an invalid ticket id", async () => {
    const agent = await loginAsRequesterA();

    const response = await agent.get("/api/tickets/invalid");

    expect(response.status).toBe(400);
  });
});

describe("GET /api/tickets/:id/attachments/:attachmentId/download", () => {
  it("downloads an active attachment owned by the requester", async () => {
    const agent = await loginAsRequesterA();
    const { ticket, attachment } = await createTicketWithAttachment(agent);

    const response = await agent.get(
      `/api/tickets/${ticket.id}/attachments/${attachment.id}/download`
    );

    expect(response.status).toBe(200);
    expect(response.headers["content-disposition"]).toContain(
      attachment.fileName
    );
  });

  it("does not allow another requester to download the attachment", async () => {
    const ownerAgent = await loginAsRequesterA();
    const { ticket, attachment } = await createTicketWithAttachment(
      ownerAgent
    );

    const otherAgent = await loginAsRequesterB();
    const response = await otherAgent.get(
      `/api/tickets/${ticket.id}/attachments/${attachment.id}/download`
    );

    expect(response.status).toBe(404);
  });
});

describe("POST /api/tickets/:id/attachments", () => {
  it("adds an attachment to the ticket owned by the requester", async () => {
    const agent = await loginAsRequesterA();
    const ticket = await createTicketAs(agent);

    const response = await agent
      .post(`/api/tickets/${ticket.id}/attachments`)
      .attach("attachments", Buffer.from("test attachment"), "test.png");

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("count", 1);
  });

  it("does not allow another requester to add attachments", async () => {
    const ownerAgent = await loginAsRequesterA();
    const ticket = await createTicketAs(ownerAgent);

    const otherAgent = await loginAsRequesterB();
    const response = await otherAgent
      .post(`/api/tickets/${ticket.id}/attachments`)
      .attach(
        "attachments",
        Buffer.from("unauthorized attachment"),
        "test.png"
      );

    expect(response.status).toBe(404);
  });

  it("rejects adding attachments when the ticket already has 5 active attachments", async () => {
    const agent = await loginAsRequesterA();
    const ticket = await createTicketAs(agent);

    for (let i = 0; i < 5; i++) {
      const response = await agent
        .post(`/api/tickets/${ticket.id}/attachments`)
        .attach(
          "attachments",
          Buffer.from(`test attachment ${i}`),
          `limit-${i}.png`
        );

      expect(response.status).toBe(201);
    }

    const response = await agent
      .post(`/api/tickets/${ticket.id}/attachments`)
      .attach("attachments", Buffer.from("sixth attachment"), "sixth.png");

    expect(response.status).toBe(400);
    expect(response.body.message).toContain(
      "more than 5 active attachments"
    );
  });

  it("stores the uploaded attachment metadata", async () => {
    const agent = await loginAsRequesterA();
    const ticket = await createTicketAs(agent);

    const response = await agent
      .post(`/api/tickets/${ticket.id}/attachments`)
      .attach(
        "attachments",
        Buffer.from("metadata test"),
        "metadata-test.png"
      );

    expect(response.status).toBe(201);

    const detailResponse = await agent.get(`/api/tickets/${ticket.id}`);

    expect(detailResponse.status).toBe(200);

    const attachment = detailResponse.body.attachments.find(
      (item: { fileName: string }) => item.fileName === "metadata-test.png"
    );

    expect(attachment).toBeDefined();
    expect(attachment.fileName).toBe("metadata-test.png");
    expect(attachment.mimeType).toBe("image/png");
  });
});

describe("DELETE /api/tickets/:id/attachments/:attachmentId", () => {
  it("soft-removes an attachment with a removal reason", async () => {
    const agent = await loginAsRequesterA();
    const { ticket, attachment } = await createTicketWithAttachment(agent);

    const response = await agent
      .delete(`/api/tickets/${ticket.id}/attachments/${attachment.id}`)
      .send({ reason: "No longer needed" });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: attachment.id,
      isRemoved: true,
      removedReason: "No longer needed",
    });
    expect(response.body.removedAt).toBeTruthy();
  });

  it("requires a removal reason", async () => {
    const agent = await loginAsRequesterA();
    const { ticket, attachment } = await createTicketWithAttachment(agent);

    const response = await agent
      .delete(`/api/tickets/${ticket.id}/attachments/${attachment.id}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Removal reason is required");
  });

  it("does not allow another requester to remove an attachment", async () => {
    const ownerAgent = await loginAsRequesterA();
    const { ticket, attachment } = await createTicketWithAttachment(
      ownerAgent
    );

    const otherAgent = await loginAsRequesterB();
    const response = await otherAgent
      .delete(`/api/tickets/${ticket.id}/attachments/${attachment.id}`)
      .send({ reason: "Unauthorized removal" });

    expect(response.status).toBe(404);
  });

  it("does not return a removed attachment in ticket details", async () => {
    const agent = await loginAsRequesterA();
    const { ticket, attachment } = await createTicketWithAttachment(agent);

    const removeResponse = await agent
      .delete(`/api/tickets/${ticket.id}/attachments/${attachment.id}`)
      .send({ reason: "Removed for testing" });

    expect(removeResponse.status).toBe(200);

    const newDetailResponse = await agent.get(`/api/tickets/${ticket.id}`);

    expect(newDetailResponse.status).toBe(200);

    const activeAttachment = newDetailResponse.body.attachments.find(
      (item: { id: number; isRemoved: boolean }) =>
        item.id === attachment.id && item.isRemoved === false
    );

    expect(activeAttachment).toBeUndefined();
  });
});

