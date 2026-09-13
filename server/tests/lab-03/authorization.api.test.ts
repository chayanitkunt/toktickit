import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import {
  ADMIN_EMAIL,
  SEED_PASSWORD,
  loginAsRequesterA,
  loginAsRequesterB,
} from "../helpers/authClient.js";

// ---------------------------------------------------------------------------
// Issue 4 — GitHub Issue #31: migrate Requester workflow to real
// authentication.
//
// This suite is the authorization-focused companion to the migrated
// tests/lab-02 regression files. It covers exactly the behaviors called out
// in the issue that don't have a natural home in a single Lab 2 file:
//   - BR-03/AC-06: a client-supplied requesterId can never override the
//     authenticated identity.
//   - Public Comments: owner can read/post, another Requester is denied,
//     IT Staff/Administrator can read and post on any ticket.
//   - "Problem Appears Resolved" (BR-05): owning Requester only, and it can
//     never be used to change currentStatus directly.
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

async function createTicketAs(agent: request.Agent) {
  const categoriesResponse = await request(app).get("/api/categories");
  const relatedSystemsResponse = await request(app).get(
    "/api/related-systems"
  );

  const response = await agent
    .post("/api/tickets")
    .field("categoryId", categoriesResponse.body[0].id)
    .field("relatedSystemId", relatedSystemsResponse.body[0].id)
    .field("summary", "Authorization suite test ticket")
    .field(
      "description",
      "Created by tests/lab-03/authorization.api.test.ts for ownership checks."
    )
    .field("requestedPriority", "LOW");

  expect(response.status).toBe(201);
  return response.body as { id: number; requesterId: number };
}

describe("BR-03/AC-06 — server ignores a client-supplied requester identity", () => {
  it("ignores a spoofed requesterId in the POST /api/tickets body and uses the session instead", async () => {
    const requesterA = await loginAsRequesterA();
    const requesterB = await loginAsRequesterB();

    const meB = await requesterB.get("/api/auth/me");

    const categoriesResponse = await request(app).get("/api/categories");
    const relatedSystemsResponse = await request(app).get(
      "/api/related-systems"
    );

    // Requester A is authenticated, but the request body tries to claim
    // Requester B's id. The created ticket must still belong to A.
    const response = await requesterA
      .post("/api/tickets")
      .field("categoryId", categoriesResponse.body[0].id)
      .field("relatedSystemId", relatedSystemsResponse.body[0].id)
      .field("requesterId", meB.body.id)
      .field("summary", "Spoofed requesterId should be ignored")
      .field(
        "description",
        "The body claims another requester's id; the session must win."
      )
      .field("requestedPriority", "LOW");

    expect(response.status).toBe(201);
    expect(response.body.requesterId).not.toBe(meB.body.id);

    const meA = await requesterA.get("/api/auth/me");
    expect(response.body.requesterId).toBe(meA.body.id);
  });

  it("a client-supplied X-Requester-Id header has no effect (the header is no longer read)", async () => {
    const requesterA = await loginAsRequesterA();
    const requesterB = await loginAsRequesterB();
    const meB = await requesterB.get("/api/auth/me");

    const categoriesResponse = await request(app).get("/api/categories");
    const relatedSystemsResponse = await request(app).get(
      "/api/related-systems"
    );

    const response = await requesterA
      .post("/api/tickets")
      .set("X-Requester-Id", String(meB.body.id))
      .field("categoryId", categoriesResponse.body[0].id)
      .field("relatedSystemId", relatedSystemsResponse.body[0].id)
      .field("summary", "Legacy header should be ignored")
      .field(
        "description",
        "The old dev-only header must not influence ownership anymore."
      )
      .field("requestedPriority", "LOW");

    expect(response.status).toBe(201);
    expect(response.body.requesterId).not.toBe(meB.body.id);
  });
});

describe("Public Comments authorization (BR-04)", () => {
  it("lets the owning Requester post and read comments on their own ticket", async () => {
    const owner = await loginAsRequesterA();
    const ticket = await createTicketAs(owner);

    const postResponse = await owner
      .post(`/api/tickets/${ticket.id}/comments`)
      .send({ content: "This is a public comment from the owner." });

    expect(postResponse.status).toBe(201);
    expect(postResponse.body.content).toBe(
      "This is a public comment from the owner."
    );

    const listResponse = await owner.get(`/api/tickets/${ticket.id}/comments`);
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.length).toBeGreaterThan(0);
  });

  it("denies another Requester from reading or posting comments (404, no content leaked)", async () => {
    const owner = await loginAsRequesterA();
    const ticket = await createTicketAs(owner);

    const otherRequester = await loginAsRequesterB();

    const readResponse = await otherRequester.get(
      `/api/tickets/${ticket.id}/comments`
    );
    expect(readResponse.status).toBe(404);

    const postResponse = await otherRequester
      .post(`/api/tickets/${ticket.id}/comments`)
      .send({ content: "I should not be able to post this." });
    expect(postResponse.status).toBe(404);
  });

  it("lets IT Staff and Administrator read and post comments on any ticket", async () => {
    const owner = await loginAsRequesterA();
    const ticket = await createTicketAs(owner);

    const staff = await loginAsItStaff();
    const staffRead = await staff.get(`/api/tickets/${ticket.id}/comments`);
    expect(staffRead.status).toBe(200);

    const staffPost = await staff
      .post(`/api/tickets/${ticket.id}/comments`)
      .send({ content: "IT Staff update on this ticket." });
    expect(staffPost.status).toBe(201);
    expect(staffPost.body.author.role).toBe("IT_STAFF");

    const admin = await loginAsAdmin();
    const adminRead = await admin.get(`/api/tickets/${ticket.id}/comments`);
    expect(adminRead.status).toBe(200);
    // Only the IT Staff comment above exists on this brand-new ticket so
    // far — assert that precisely, then have the Administrator post their
    // own comment too (this test's title promises Administrator posting is
    // covered, not just reading) before checking the combined count.
    expect(adminRead.body.length).toBe(1);

    const adminPost = await admin
      .post(`/api/tickets/${ticket.id}/comments`)
      .send({ content: "Administrator note visible to everyone." });
    expect(adminPost.status).toBe(201);
    expect(adminPost.body.author.role).toBe("ADMINISTRATOR");

    const adminReadAfterPost = await admin.get(
      `/api/tickets/${ticket.id}/comments`
    );
    expect(adminReadAfterPost.status).toBe(200);
    expect(adminReadAfterPost.body.length).toBeGreaterThanOrEqual(2);
  });

  it("rejects empty/whitespace-only comment content (BR-09)", async () => {
    const owner = await loginAsRequesterA();
    const ticket = await createTicketAs(owner);

    const response = await owner
      .post(`/api/tickets/${ticket.id}/comments`)
      .send({ content: "    " });

    expect(response.status).toBe(400);
  });

  it("requires authentication to read or post comments", async () => {
    const owner = await loginAsRequesterA();
    const ticket = await createTicketAs(owner);

    const readResponse = await request(app).get(
      `/api/tickets/${ticket.id}/comments`
    );
    expect(readResponse.status).toBe(401);

    const postResponse = await request(app)
      .post(`/api/tickets/${ticket.id}/comments`)
      .send({ content: "Should be rejected, no session." });
    expect(postResponse.status).toBe(401);
  });
});

describe('"Problem Appears Resolved" authorization (FR-08/BR-05)', () => {
  it("lets the owning Requester set and clear the flag", async () => {
    const owner = await loginAsRequesterA();
    const ticket = await createTicketAs(owner);

    const setResponse = await owner
      .patch(`/api/tickets/${ticket.id}/resolution-flag`)
      .send({ problemAppearsResolved: true });

    expect(setResponse.status).toBe(200);
    expect(setResponse.body.problemAppearsResolved).toBe(true);
    // BR-05: the flag never changes currentStatus.
    expect(setResponse.body.currentStatus).toBe("NEW");

    const clearResponse = await owner
      .patch(`/api/tickets/${ticket.id}/resolution-flag`)
      .send({ problemAppearsResolved: false });

    expect(clearResponse.status).toBe(200);
    expect(clearResponse.body.problemAppearsResolved).toBe(false);
  });

  it("rejects an attempt to also set currentStatus in the same request (BR-05)", async () => {
    const owner = await loginAsRequesterA();
    const ticket = await createTicketAs(owner);

    const response = await owner
      .patch(`/api/tickets/${ticket.id}/resolution-flag`)
      .send({ problemAppearsResolved: true, currentStatus: "RESOLVED" });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("forbidden");
  });

  it("denies another Requester from flagging someone else's ticket", async () => {
    const owner = await loginAsRequesterA();
    const ticket = await createTicketAs(owner);

    const otherRequester = await loginAsRequesterB();
    const response = await otherRequester
      .patch(`/api/tickets/${ticket.id}/resolution-flag`)
      .send({ problemAppearsResolved: true });

    expect(response.status).toBe(404);
  });

  it("denies IT Staff and Administrator from using the Requester-only resolution-flag route", async () => {
    const owner = await loginAsRequesterA();
    const ticket = await createTicketAs(owner);

    const staff = await loginAsItStaff();
    const staffResponse = await staff
      .patch(`/api/tickets/${ticket.id}/resolution-flag`)
      .send({ problemAppearsResolved: true });
    expect(staffResponse.status).toBe(403);

    const admin = await loginAsAdmin();
    const adminResponse = await admin
      .patch(`/api/tickets/${ticket.id}/resolution-flag`)
      .send({ problemAppearsResolved: true });
    expect(adminResponse.status).toBe(403);
  });
});
