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
// Issue 6 — GitHub Issue #33: Internal Notes (BR-04/BR-09/AC-14/AC-15)
//
// Public Comments already have full create/read/authorization/validation
// coverage in tests/lab-03/authorization.api.test.ts (Issue 4). This file
// is the Internal Notes counterpart — a deliberately separate resource with
// a different visibility rule (IT Staff/Administrator only, never the
// Requester) — plus a couple of tests confirming the two resources never
// leak into each other.
// ---------------------------------------------------------------------------

const IT_STAFF_EMAIL = "michael.brown@tiktockit.com";

async function loginAsItStaff() {
  const agent = request.agent(app);
  const response = await agent
    .post("/api/auth/login")
    .send({ email: IT_STAFF_EMAIL, password: SEED_PASSWORD });

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

async function createFreshTicket(): Promise<{ id: number }> {
  const requester = await loginAsRequesterA();
  const categoriesResponse = await request(app).get("/api/categories");
  const relatedSystemsResponse = await request(app).get("/api/related-systems");

  const response = await requester
    .post("/api/tickets")
    .field("categoryId", categoriesResponse.body[0].id)
    .field("relatedSystemId", relatedSystemsResponse.body[0].id)
    .field("summary", "Issue 6 test ticket for comments/notes")
    .field(
      "description",
      "Created by tests/lab-03/comments-notes.api.test.ts."
    )
    .field("requestedPriority", "LOW");

  expect(response.status).toBe(201);
  return { id: response.body.id };
}

describe("Internal Notes — create/read (FR-14/AC-14)", () => {
  it("lets IT Staff post and read an Internal Note", async () => {
    const ticket = await createFreshTicket();
    const staff = await loginAsItStaff();

    const postResponse = await staff
      .post(`/api/staff/tickets/${ticket.id}/notes`)
      .send({ content: "Checked the device logs, nothing unusual so far." });

    expect(postResponse.status).toBe(201);
    expect(postResponse.body.content).toBe(
      "Checked the device logs, nothing unusual so far."
    );
    expect(postResponse.body.author.role).toBe("IT_STAFF");
    expect(postResponse.body).toHaveProperty("id");
    expect(postResponse.body).toHaveProperty("createdAt");

    const listResponse = await staff.get(`/api/staff/tickets/${ticket.id}/notes`);
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.length).toBe(1);
    expect(listResponse.body[0].content).toBe(
      "Checked the device logs, nothing unusual so far."
    );
  });

  it("lets an Administrator post and read an Internal Note on any ticket", async () => {
    const ticket = await createFreshTicket();
    const admin = await loginAsAdmin();

    const postResponse = await admin
      .post(`/api/staff/tickets/${ticket.id}/notes`)
      .send({ content: "Escalating to hardware team." });

    expect(postResponse.status).toBe(201);
    expect(postResponse.body.author.role).toBe("ADMINISTRATOR");

    const listResponse = await admin.get(`/api/staff/tickets/${ticket.id}/notes`);
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.length).toBe(1);
  });

  it("Internal Notes are append-only — multiple posts accumulate in order, oldest first", async () => {
    const ticket = await createFreshTicket();
    const staff = await loginAsItStaff();

    await staff.post(`/api/staff/tickets/${ticket.id}/notes`).send({ content: "First note." });
    await staff.post(`/api/staff/tickets/${ticket.id}/notes`).send({ content: "Second note." });

    const listResponse = await staff.get(`/api/staff/tickets/${ticket.id}/notes`);
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.length).toBe(2);
    expect(listResponse.body[0].content).toBe("First note.");
    expect(listResponse.body[1].content).toBe("Second note.");

    // No PATCH/DELETE route exists for notes — append-only is enforced by
    // simply never exposing an edit/delete endpoint.
    const editAttempt = await staff
      .patch(`/api/staff/tickets/${ticket.id}/notes/${listResponse.body[0].id}`)
      .send({ content: "Edited." });
    expect([404, 405]).toContain(editAttempt.status);
  });
});

describe("Internal Notes authorization (BR-04/AC-15)", () => {
  it("rejects a Requester with 403 and never returns note content", async () => {
    const ticket = await createFreshTicket();
    const staff = await loginAsItStaff();
    await staff
      .post(`/api/staff/tickets/${ticket.id}/notes`)
      .send({ content: "Sensitive internal detail the Requester must never see." });

    const requester = await loginAsRequesterA();

    const readResponse = await requester.get(
      `/api/staff/tickets/${ticket.id}/notes`
    );
    expect(readResponse.status).toBe(403);
    expect(JSON.stringify(readResponse.body)).not.toContain(
      "Sensitive internal detail"
    );

    const postResponse = await requester
      .post(`/api/staff/tickets/${ticket.id}/notes`)
      .send({ content: "A Requester should never be able to post this." });
    expect(postResponse.status).toBe(403);
  });

  it("rejects a different Requester the same way as the owning Requester", async () => {
    const ticket = await createFreshTicket();
    const otherRequester = await loginAsRequesterB();

    const response = await otherRequester.get(
      `/api/staff/tickets/${ticket.id}/notes`
    );
    expect(response.status).toBe(403);
  });

  it("requires authentication to read or post Internal Notes", async () => {
    const ticket = await createFreshTicket();

    const readResponse = await request(app).get(
      `/api/staff/tickets/${ticket.id}/notes`
    );
    expect(readResponse.status).toBe(401);

    const postResponse = await request(app)
      .post(`/api/staff/tickets/${ticket.id}/notes`)
      .send({ content: "Should be rejected, no session." });
    expect(postResponse.status).toBe(401);
  });
});

describe("Internal Notes validation (BR-09)", () => {
  it("rejects empty content", async () => {
    const ticket = await createFreshTicket();
    const staff = await loginAsItStaff();

    const response = await staff
      .post(`/api/staff/tickets/${ticket.id}/notes`)
      .send({ content: "" });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("invalid_input");
  });

  it("rejects whitespace-only content", async () => {
    const ticket = await createFreshTicket();
    const staff = await loginAsItStaff();

    const response = await staff
      .post(`/api/staff/tickets/${ticket.id}/notes`)
      .send({ content: "     " });

    expect(response.status).toBe(400);
  });

  it("rejects content over 2000 characters", async () => {
    const ticket = await createFreshTicket();
    const staff = await loginAsItStaff();

    const response = await staff
      .post(`/api/staff/tickets/${ticket.id}/notes`)
      .send({ content: "a".repeat(2001) });

    expect(response.status).toBe(400);
  });

  it("accepts content at exactly the 2000 character limit", async () => {
    const ticket = await createFreshTicket();
    const staff = await loginAsItStaff();

    const response = await staff
      .post(`/api/staff/tickets/${ticket.id}/notes`)
      .send({ content: "a".repeat(2000) });

    expect(response.status).toBe(201);
  });

  it("trims leading/trailing whitespace before storing", async () => {
    const ticket = await createFreshTicket();
    const staff = await loginAsItStaff();

    const response = await staff
      .post(`/api/staff/tickets/${ticket.id}/notes`)
      .send({ content: "  padded note  " });

    expect(response.status).toBe(201);
    expect(response.body.content).toBe("padded note");
  });

  it("returns 404 for a ticket id that does not exist", async () => {
    const staff = await loginAsItStaff();

    const response = await staff
      .post("/api/staff/tickets/999999999/notes")
      .send({ content: "Note on a ticket that doesn't exist." });

    expect(response.status).toBe(404);
  });
});

describe("Internal Notes never appear on the Public Comments endpoint", () => {
  it("a posted Internal Note is invisible via GET /api/tickets/:id/comments", async () => {
    const ticket = await createFreshTicket();
    const staff = await loginAsItStaff();

    await staff
      .post(`/api/staff/tickets/${ticket.id}/notes`)
      .send({ content: "Internal-only detail." });

    const requester = await loginAsRequesterA();
    const commentsResponse = await requester.get(
      `/api/tickets/${ticket.id}/comments`
    );

    expect(commentsResponse.status).toBe(200);
    expect(
      commentsResponse.body.some(
        (comment: { content: string }) =>
          comment.content === "Internal-only detail."
      )
    ).toBe(false);
  });

  it("a posted Public Comment is invisible via GET /api/staff/tickets/:id/notes", async () => {
    const ticket = await createFreshTicket();
    const requester = await loginAsRequesterA();

    await requester
      .post(`/api/tickets/${ticket.id}/comments`)
      .send({ content: "Public-only detail." });

    const staff = await loginAsItStaff();
    const notesResponse = await staff.get(`/api/staff/tickets/${ticket.id}/notes`);

    expect(notesResponse.status).toBe(200);
    expect(
      notesResponse.body.some(
        (note: { content: string }) => note.content === "Public-only detail."
      )
    ).toBe(false);
  });
});
