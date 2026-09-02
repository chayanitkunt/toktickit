import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

// Creates a brand-new ticket for the given requester so each test
// works with its own isolated data instead of reusing/mutating
// shared seed tickets (which breaks when tests run in sequence).
async function createTicketForRequester(requesterId: string) {
  const categoriesResponse = await request(app).get("/api/categories");
  const relatedSystemsResponse = await request(app).get(
    "/api/related-systems"
  );

  const categoryId = categoriesResponse.body[0].id;
  const relatedSystemId = relatedSystemsResponse.body[0].id;

  const response = await request(app)
    .post("/api/tickets")
    .set("X-Requester-Id", requesterId)
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

// Creates a fresh ticket and immediately attaches one file to it,
// returning both so DELETE/download tests always operate on a
// known-active attachment instead of guessing attachments[0].
async function createTicketWithAttachment(
  requesterId: string,
  fileName = "seed-for-test.png"
) {
  const ticket = await createTicketForRequester(requesterId);

  const uploadResponse = await request(app)
    .post(`/api/tickets/${ticket.id}/attachments`)
    .set("X-Requester-Id", requesterId)
    .attach("attachments", Buffer.from("test attachment content"), fileName);

  expect(uploadResponse.status).toBe(201);

  const detailResponse = await request(app)
    .get(`/api/tickets/${ticket.id}`)
    .set("X-Requester-Id", requesterId);

  const attachment = detailResponse.body.attachments.find(
    (item: { fileName: string }) => item.fileName === fileName
  );

  expect(attachment).toBeDefined();

  return { ticket, attachment };
}

describe("GET /api/tickets/:id", () => {
  it("returns ticket details for the ticket owner", async () => {
    // First get a ticket owned by requester 1.
    const listResponse = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", "1");

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data.length).toBeGreaterThan(0);

    const ticketId = listResponse.body.data[0].id;

    const response = await request(app)
      .get(`/api/tickets/${ticketId}`)
      .set("X-Requester-Id", "1");

    expect(response.status).toBe(200);

    expect(response.body).toHaveProperty("id", ticketId);
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

  it("does not allow a requester to access another requester's ticket", async () => {
    // Get a ticket owned by requester 1.
    const listResponse = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", "1");

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data.length).toBeGreaterThan(0);

    const ticketId = listResponse.body.data[0].id;

    // Try to access it as requester 2.
    const response = await request(app)
      .get(`/api/tickets/${ticketId}`)
      .set("X-Requester-Id", "2");

    expect(response.status).toBe(404);
  });

  it("rejects a missing requester context", async () => {
    const response = await request(app)
      .get("/api/tickets/1");

    expect(response.status).toBe(400);
  });

  it("rejects an invalid ticket id", async () => {
    const response = await request(app)
      .get("/api/tickets/invalid")
      .set("X-Requester-Id", "1");

    expect(response.status).toBe(400);
  });
});

describe("GET /api/tickets/:id/attachments/:attachmentId/download", () => {
  it("downloads an active attachment owned by the requester", async () => {
    const { ticket, attachment } = await createTicketWithAttachment("1");

    const response = await request(app)
      .get(
        `/api/tickets/${ticket.id}/attachments/${attachment.id}/download`
      )
      .set("X-Requester-Id", "1");

    expect(response.status).toBe(200);
    expect(response.headers["content-disposition"]).toContain(
      attachment.fileName
    );
  });

  it("does not allow another requester to download the attachment", async () => {
    const { ticket, attachment } = await createTicketWithAttachment("1");

    const response = await request(app)
      .get(
        `/api/tickets/${ticket.id}/attachments/${attachment.id}/download`
      )
      .set("X-Requester-Id", "2");

    expect(response.status).toBe(404);
  });
});

describe("POST /api/tickets/:id/attachments", () => {
  it("adds an attachment to the ticket owned by the requester", async () => {
    const ticket = await createTicketForRequester("1");

    const response = await request(app)
      .post(`/api/tickets/${ticket.id}/attachments`)
      .set("X-Requester-Id", "1")
      .attach("attachments", Buffer.from("test attachment"), "test.png");

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("count", 1);
  });

  it("does not allow another requester to add attachments", async () => {
    const ticket = await createTicketForRequester("1");

    const response = await request(app)
      .post(`/api/tickets/${ticket.id}/attachments`)
      .set("X-Requester-Id", "2")
      .attach(
        "attachments",
        Buffer.from("unauthorized attachment"),
        "test.png"
      );

    expect(response.status).toBe(404);
  });

  it("rejects adding attachments when the ticket already has 5 active attachments", async () => {
    const ticket = await createTicketForRequester("1");

    for (let i = 0; i < 5; i++) {
      const response = await request(app)
        .post(`/api/tickets/${ticket.id}/attachments`)
        .set("X-Requester-Id", "1")
        .attach(
          "attachments",
          Buffer.from(`test attachment ${i}`),
          `limit-${i}.png`
        );

      expect(response.status).toBe(201);
    }

    const response = await request(app)
      .post(`/api/tickets/${ticket.id}/attachments`)
      .set("X-Requester-Id", "1")
      .attach("attachments", Buffer.from("sixth attachment"), "sixth.png");

    expect(response.status).toBe(400);
    expect(response.body.message).toContain(
      "more than 5 active attachments"
    );
  });

  it("stores the uploaded attachment metadata", async () => {
    const ticket = await createTicketForRequester("1");

    const response = await request(app)
      .post(`/api/tickets/${ticket.id}/attachments`)
      .set("X-Requester-Id", "1")
      .attach(
        "attachments",
        Buffer.from("metadata test"),
        "metadata-test.png"
      );

    expect(response.status).toBe(201);

    const detailResponse = await request(app)
      .get(`/api/tickets/${ticket.id}`)
      .set("X-Requester-Id", "1");

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
    const { ticket, attachment } = await createTicketWithAttachment("1");

    const response = await request(app)
      .delete(`/api/tickets/${ticket.id}/attachments/${attachment.id}`)
      .set("X-Requester-Id", "1")
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
    const { ticket, attachment } = await createTicketWithAttachment("1");

    const response = await request(app)
      .delete(`/api/tickets/${ticket.id}/attachments/${attachment.id}`)
      .set("X-Requester-Id", "1")
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Removal reason is required");
  });

  it("does not allow another requester to remove an attachment", async () => {
    const { ticket, attachment } = await createTicketWithAttachment("1");

    const response = await request(app)
      .delete(`/api/tickets/${ticket.id}/attachments/${attachment.id}`)
      .set("X-Requester-Id", "2")
      .send({ reason: "Unauthorized removal" });

    expect(response.status).toBe(404);
  });

  it("does not return a removed attachment in ticket details", async () => {
    const { ticket, attachment } = await createTicketWithAttachment("1");

    const removeResponse = await request(app)
      .delete(`/api/tickets/${ticket.id}/attachments/${attachment.id}`)
      .set("X-Requester-Id", "1")
      .send({ reason: "Removed for testing" });

    expect(removeResponse.status).toBe(200);

    const newDetailResponse = await request(app)
      .get(`/api/tickets/${ticket.id}`)
      .set("X-Requester-Id", "1");

    expect(newDetailResponse.status).toBe(200);

    const activeAttachment = newDetailResponse.body.attachments.find(
      (item: { id: number; isRemoved: boolean }) =>
        item.id === attachment.id && item.isRemoved === false
    );

    expect(activeAttachment).toBeUndefined();
  });
});