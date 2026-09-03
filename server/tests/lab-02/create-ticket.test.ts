import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

// Charlie Brown is seeded as inactive (see prisma/seed.ts) and must be
// rejected by ticket creation (BR-04).
const INACTIVE_REQUESTER_ID = "3";
const ACTIVE_REQUESTER_ID = "1";

async function getReferenceIds() {
  const categoriesResponse = await request(app).get("/api/categories");
  const relatedSystemsResponse = await request(app).get(
    "/api/related-systems"
  );

  return {
    categoryId: categoriesResponse.body[0].id as number,
    relatedSystemId: relatedSystemsResponse.body[0].id as number,
  };
}

describe("POST /api/tickets — creation (AC-01)", () => {
  it("creates a ticket and returns 201 with a generated ticket number and NEW status", async () => {
    const { categoryId, relatedSystemId } = await getReferenceIds();

    const response = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", ACTIVE_REQUESTER_ID)
      .field("categoryId", categoryId)
      .field("relatedSystemId", relatedSystemId)
      .field("summary", "Laptop battery drains quickly")
      .field(
        "description",
        "My laptop battery is draining much faster than usual even when the system is idle."
      )
      .field("requestedPriority", "MEDIUM");

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("id");
    expect(response.body.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
    expect(response.body.currentStatus).toBe("NEW");
    expect(response.body.requesterId).toBe(Number(ACTIVE_REQUESTER_ID));
  });

  it("accepts a valid attachment submitted at creation time", async () => {
    const { categoryId, relatedSystemId } = await getReferenceIds();

    const response = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", ACTIVE_REQUESTER_ID)
      .field("categoryId", categoryId)
      .field("relatedSystemId", relatedSystemId)
      .field("summary", "Cannot connect to VPN from home")
      .field(
        "description",
        "The VPN client fails to connect every time I try from my home network."
      )
      .field("requestedPriority", "HIGH")
      .attach(
        "attachments",
        Buffer.from("fake image bytes"),
        "screenshot.png"
      );

    expect(response.status).toBe(201);
    expect(response.body.attachments).toHaveLength(1);
    expect(response.body.attachments[0].fileName).toBe("screenshot.png");
  });
});

describe("POST /api/tickets — requester context validation", () => {
  it("rejects a missing X-Requester-Id header with 400", async () => {
    const { categoryId, relatedSystemId } = await getReferenceIds();

    const response = await request(app)
      .post("/api/tickets")
      .field("categoryId", categoryId)
      .field("relatedSystemId", relatedSystemId)
      .field("summary", "Missing requester header test")
      .field("description", "This request has no X-Requester-Id header set.")
      .field("requestedPriority", "LOW");

    expect(response.status).toBe(400);
  });

  it("rejects an inactive Requester with 400 (BR-04)", async () => {
    const { categoryId, relatedSystemId } = await getReferenceIds();

    const response = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", INACTIVE_REQUESTER_ID)
      .field("categoryId", categoryId)
      .field("relatedSystemId", relatedSystemId)
      .field("summary", "Inactive requester test ticket")
      .field("description", "This ticket is submitted by an inactive requester and must be rejected.")
      .field("requestedPriority", "LOW");

    expect(response.status).toBe(400);
  });
});

describe("POST /api/tickets — field validation (BR-05)", () => {
  it("rejects a Summary shorter than 10 characters", async () => {
    const { categoryId, relatedSystemId } = await getReferenceIds();

    const response = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", ACTIVE_REQUESTER_ID)
      .field("categoryId", categoryId)
      .field("relatedSystemId", relatedSystemId)
      .field("summary", "short")
      .field("description", "A description that is definitely long enough to pass validation.")
      .field("requestedPriority", "LOW");

    expect(response.status).toBe(400);
    expect(response.body.errors).toHaveProperty("summary");
  });

  it("rejects a Description shorter than 20 characters", async () => {
    const { categoryId, relatedSystemId } = await getReferenceIds();

    const response = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", ACTIVE_REQUESTER_ID)
      .field("categoryId", categoryId)
      .field("relatedSystemId", relatedSystemId)
      .field("summary", "Description too short test")
      .field("description", "too short")
      .field("requestedPriority", "LOW");

    expect(response.status).toBe(400);
    expect(response.body.errors).toHaveProperty("description");
  });

  it("rejects an invalid Requested Priority value", async () => {
    const { categoryId, relatedSystemId } = await getReferenceIds();

    const response = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", ACTIVE_REQUESTER_ID)
      .field("categoryId", categoryId)
      .field("relatedSystemId", relatedSystemId)
      .field("summary", "Invalid priority value test")
      .field("description", "A description that is definitely long enough to pass validation.")
      .field("requestedPriority", "URGENT");

    expect(response.status).toBe(400);
    expect(response.body.errors).toHaveProperty("requestedPriority");
  });

  it("rejects a missing/unknown categoryId", async () => {
    const { relatedSystemId } = await getReferenceIds();

    const response = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", ACTIVE_REQUESTER_ID)
      .field("categoryId", 999999)
      .field("relatedSystemId", relatedSystemId)
      .field("summary", "Unknown category id test")
      .field("description", "A description that is definitely long enough to pass validation.")
      .field("requestedPriority", "LOW");

    expect(response.status).toBe(400);
    expect(response.body.errors).toHaveProperty("categoryId");
  });

  it("rejects a missing/unknown relatedSystemId", async () => {
    const { categoryId } = await getReferenceIds();

    const response = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", ACTIVE_REQUESTER_ID)
      .field("categoryId", categoryId)
      .field("relatedSystemId", 999999)
      .field("summary", "Unknown related system id test")
      .field("description", "A description that is definitely long enough to pass validation.")
      .field("requestedPriority", "LOW");

    expect(response.status).toBe(400);
    expect(response.body.errors).toHaveProperty("relatedSystemId");
  });
});

describe("POST /api/tickets — attachment rules (AC-04, AC-05, AC-06)", () => {
  it("rejects an unsupported attachment type with 400 (BR-06)", async () => {
    const { categoryId, relatedSystemId } = await getReferenceIds();

    const response = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", ACTIVE_REQUESTER_ID)
      .field("categoryId", categoryId)
      .field("relatedSystemId", relatedSystemId)
      .field("summary", "Invalid attachment type test")
      .field("description", "A description that is definitely long enough to pass validation.")
      .field("requestedPriority", "LOW")
      .attach(
        "attachments",
        Buffer.from("not an allowed type"),
        { filename: "malware.exe", contentType: "application/x-msdownload" }
      );

    expect(response.status).toBe(400);
  });

  it("rejects more than 5 attachments submitted at creation time (BR-08)", async () => {
    const { categoryId, relatedSystemId } = await getReferenceIds();

    let req = request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", ACTIVE_REQUESTER_ID)
      .field("categoryId", categoryId)
      .field("relatedSystemId", relatedSystemId)
      .field("summary", "Too many attachments test")
      .field("description", "A description that is definitely long enough to pass validation.")
      .field("requestedPriority", "LOW");

    for (let i = 0; i < 6; i++) {
      req = req.attach(
        "attachments",
        Buffer.from(`file ${i}`),
        `file-${i}.png`
      );
    }

    const response = await req;

    expect(response.status).toBe(400);
  });
});
