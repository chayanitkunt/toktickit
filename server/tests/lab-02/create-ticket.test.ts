import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { loginAsRequesterA } from "../helpers/authClient.js";

// ---------------------------------------------------------------------------
// Issue 4 — migrated from X-Requester-Id to the authenticated session.
// Ownership now comes from req.currentUser (BR-03); there is no longer a
// client-suppliable requester identity to gate on. The old
// "rejects an inactive Requester with 400" case is superseded by
// tests/lab-03/auth.api.test.ts (an inactive account can't even log in) and
// is intentionally not repeated here.
// ---------------------------------------------------------------------------

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
    const agent = await loginAsRequesterA();

    const response = await agent
      .post("/api/tickets")
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

    const me = await agent.get("/api/auth/me");
    expect(response.body.requesterId).toBe(me.body.id);
  });

  it("accepts a valid attachment submitted at creation time", async () => {
    const { categoryId, relatedSystemId } = await getReferenceIds();
    const agent = await loginAsRequesterA();

    const response = await agent
      .post("/api/tickets")
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

describe("POST /api/tickets — requester context validation (AC-05/BR-01)", () => {
  it("rejects an unauthenticated request with 401", async () => {
    const { categoryId, relatedSystemId } = await getReferenceIds();

    const response = await request(app)
      .post("/api/tickets")
      .field("categoryId", categoryId)
      .field("relatedSystemId", relatedSystemId)
      .field("summary", "No session cookie test")
      .field("description", "This request carries no authenticated session at all.")
      .field("requestedPriority", "LOW");

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("not_authenticated");
  });

  it("rejects a request from an authenticated non-Requester (e.g. Administrator) with 403", async () => {
    const { categoryId, relatedSystemId } = await getReferenceIds();

    const staffAgent = request.agent(app);
    await staffAgent
      .post("/api/auth/login")
      .send({ email: "jennifer.anderson@tiktockit.com", password: "ChangeMe123!" });

    const response = await staffAgent
      .post("/api/tickets")
      .field("categoryId", categoryId)
      .field("relatedSystemId", relatedSystemId)
      .field("summary", "Administrator should not create tickets")
      .field("description", "Only Requesters are permitted to create tickets in Lab 3.")
      .field("requestedPriority", "LOW");

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("forbidden");
  });
});

describe("POST /api/tickets — field validation (BR-05)", () => {
  it("rejects a Summary shorter than 10 characters", async () => {
    const { categoryId, relatedSystemId } = await getReferenceIds();
    const agent = await loginAsRequesterA();

    const response = await agent
      .post("/api/tickets")
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
    const agent = await loginAsRequesterA();

    const response = await agent
      .post("/api/tickets")
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
    const agent = await loginAsRequesterA();

    const response = await agent
      .post("/api/tickets")
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
    const agent = await loginAsRequesterA();

    const response = await agent
      .post("/api/tickets")
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
    const agent = await loginAsRequesterA();

    const response = await agent
      .post("/api/tickets")
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
    const agent = await loginAsRequesterA();

    const response = await agent
      .post("/api/tickets")
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
    const agent = await loginAsRequesterA();

    let req = agent
      .post("/api/tickets")
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

