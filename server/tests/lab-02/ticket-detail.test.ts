import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

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
    const listResponse = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", "1");

    expect(listResponse.status).toBe(200);

    const ticketWithAttachment = listResponse.body.data.find(
      (ticket: { attachmentCount: number }) =>
        ticket.attachmentCount > 0
    );

    expect(ticketWithAttachment).toBeDefined();

    const detailResponse = await request(app)
      .get(`/api/tickets/${ticketWithAttachment.id}`)
      .set("X-Requester-Id", "1");

    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body.attachments.length).toBeGreaterThan(0);

    const attachment = detailResponse.body.attachments[0];

    const response = await request(app)
      .get(
        `/api/tickets/${ticketWithAttachment.id}/attachments/${attachment.id}/download`
      )
      .set("X-Requester-Id", "1");

    expect(response.status).toBe(200);
    expect(response.headers["content-disposition"]).toContain(
      attachment.fileName
    );
  });

  it("does not allow another requester to download the attachment", async () => {
    const listResponse = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", "1");

    expect(listResponse.status).toBe(200);

    const ticketWithAttachment = listResponse.body.data.find(
      (ticket: { attachmentCount: number }) =>
        ticket.attachmentCount > 0
    );

    expect(ticketWithAttachment).toBeDefined();

    const detailResponse = await request(app)
      .get(`/api/tickets/${ticketWithAttachment.id}`)
      .set("X-Requester-Id", "1");

    expect(detailResponse.status).toBe(200);

    const attachment = detailResponse.body.attachments[0];

    const response = await request(app)
      .get(
        `/api/tickets/${ticketWithAttachment.id}/attachments/${attachment.id}/download`
      )
      .set("X-Requester-Id", "2");

    expect(response.status).toBe(404);
  });
});

describe("POST /api/tickets/:id/attachments", () => {
  it("adds an attachment to the ticket owned by the requester", async () => {
    const listResponse = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", "1");

    expect(listResponse.status).toBe(200);

    const ticket = listResponse.body.data.find(
      (ticket: { attachmentCount: number }) =>
        ticket.attachmentCount < 5
    );

    expect(ticket).toBeDefined();

    const response = await request(app)
      .post(`/api/tickets/${ticket.id}/attachments`)
      .set("X-Requester-Id", "1")
      .attach(
        "attachments",
        Buffer.from("test attachment"),
        "test.png"
      );

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("count", 1);
  });

  it("does not allow another requester to add attachments", async () => {
    const listResponse = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", "1");

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data.length).toBeGreaterThan(0);

    const ticketId = listResponse.body.data[0].id;

    const response = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("X-Requester-Id", "2")
      .attach(
        "attachments",
        Buffer.from("unauthorized attachment"),
        "test.png"
      );

    expect(response.status).toBe(404);
  });

  it("rejects adding attachments when the ticket already has 5 active attachments", async () => {
    const listResponse = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", "1");

    expect(listResponse.status).toBe(200);

    const ticketId = listResponse.body.data[0].id;

    // Add attachments until the ticket reaches the limit.
    const detailResponse = await request(app)
      .get(`/api/tickets/${ticketId}`)
      .set("X-Requester-Id", "1");

    expect(detailResponse.status).toBe(200);

    const currentCount = detailResponse.body.attachments.length;

    if (currentCount < 5) {
      const filesNeeded = 5 - currentCount;

      for (let i = 0; i < filesNeeded; i++) {
        const response = await request(app)
          .post(`/api/tickets/${ticketId}/attachments`)
          .set("X-Requester-Id", "1")
          .attach(
            "attachments",
            Buffer.from(`test attachment ${i}`),
            `limit-${i}.png`
          );

        expect(response.status).toBe(201);
      }
    }

    const response = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("X-Requester-Id", "1")
      .attach(
        "attachments",
        Buffer.from("sixth attachment"),
        "sixth.png"
      );

    expect(response.status).toBe(400);
    expect(response.body.message).toContain(
      "more than 5 active attachments"
    );
  });

  it("stores the uploaded attachment metadata", async () => {
    const listResponse = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", "1");

    expect(listResponse.status).toBe(200);

    const ticket = listResponse.body.data.find(
      (ticket: { attachmentCount: number }) =>
        ticket.attachmentCount < 5
    );

    expect(ticket).toBeDefined();

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
      (item: { fileName: string }) =>
        item.fileName === "metadata-test.png"
    );

    expect(attachment).toBeDefined();
    expect(attachment.fileName).toBe("metadata-test.png");
    expect(attachment.mimeType).toBe("image/png");
  });
});

describe("DELETE /api/tickets/:id/attachments/:attachmentId", () => {
  it("soft-removes an attachment with a removal reason", async () => {
    const listResponse = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", "1");

    expect(listResponse.status).toBe(200);

    const ticket = listResponse.body.data.find(
      (ticket: { attachmentCount: number }) =>
        ticket.attachmentCount > 0
    );

    expect(ticket).toBeDefined();

    const detailResponse = await request(app)
      .get(`/api/tickets/${ticket.id}`)
      .set("X-Requester-Id", "1");

    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body.attachments.length).toBeGreaterThan(0);

    const attachment = detailResponse.body.attachments[0];

    const response = await request(app)
      .delete(
        `/api/tickets/${ticket.id}/attachments/${attachment.id}`
      )
      .set("X-Requester-Id", "1")
      .send({
        reason: "No longer needed",
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: attachment.id,
      isRemoved: true,
      removedReason: "No longer needed",
    });
    expect(response.body.removedAt).toBeTruthy();
  });

  it("requires a removal reason", async () => {
    const listResponse = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", "1");

    expect(listResponse.status).toBe(200);

    const ticket = listResponse.body.data.find(
      (ticket: { attachmentCount: number }) =>
        ticket.attachmentCount > 0
    );

    expect(ticket).toBeDefined();

    const detailResponse = await request(app)
      .get(`/api/tickets/${ticket.id}`)
      .set("X-Requester-Id", "1");

    expect(detailResponse.status).toBe(200);

    const attachment = detailResponse.body.attachments[0];

    const response = await request(app)
      .delete(
        `/api/tickets/${ticket.id}/attachments/${attachment.id}`
      )
      .set("X-Requester-Id", "1")
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Removal reason is required"
    );
  });

  it("does not allow another requester to remove an attachment", async () => {
    const listResponse = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", "1");

    expect(listResponse.status).toBe(200);

    const ticket = listResponse.body.data.find(
      (ticket: { attachmentCount: number }) =>
        ticket.attachmentCount > 0
    );

    expect(ticket).toBeDefined();

    const detailResponse = await request(app)
      .get(`/api/tickets/${ticket.id}`)
      .set("X-Requester-Id", "1");

    expect(detailResponse.status).toBe(200);

    const attachment = detailResponse.body.attachments[0];

    const response = await request(app)
      .delete(
        `/api/tickets/${ticket.id}/attachments/${attachment.id}`
      )
      .set("X-Requester-Id", "2")
      .send({
        reason: "Unauthorized removal",
      });

    expect(response.status).toBe(404);
  });

  it("does not return a removed attachment in ticket details", async () => {
    const listResponse = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", "1");

    expect(listResponse.status).toBe(200);

    const ticket = listResponse.body.data.find(
      (ticket: { attachmentCount: number }) =>
        ticket.attachmentCount > 0
    );

    expect(ticket).toBeDefined();

    const detailResponse = await request(app)
      .get(`/api/tickets/${ticket.id}`)
      .set("X-Requester-Id", "1");

    expect(detailResponse.status).toBe(200);

    const attachment = detailResponse.body.attachments[0];

    const removeResponse = await request(app)
      .delete(
        `/api/tickets/${ticket.id}/attachments/${attachment.id}`
      )
      .set("X-Requester-Id", "1")
      .send({
        reason: "Removed for testing",
      });

    expect(removeResponse.status).toBe(200);

    const newDetailResponse = await request(app)
      .get(`/api/tickets/${ticket.id}`)
      .set("X-Requester-Id", "1");

    expect(newDetailResponse.status).toBe(200);

    const removedAttachment =
      newDetailResponse.body.attachments.find(
        (item: { id: number }) => item.id === attachment.id
      );

    expect(removedAttachment).toBeUndefined();
  });
});
