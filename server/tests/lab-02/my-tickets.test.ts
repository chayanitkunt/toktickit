import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { loginAsRequesterA } from "../helpers/authClient.js";

// Issue 4 — migrated from X-Requester-Id to the authenticated session.

describe("GET /api/tickets", () => {
  it("returns only tickets owned by the authenticated requester", async () => {
    const agent = await loginAsRequesterA();

    const response = await agent.get("/api/tickets");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("data");
    expect(response.body).toHaveProperty("meta");
    expect(Array.isArray(response.body.data)).toBe(true);

    for (const ticket of response.body.data) {
      expect(ticket).not.toHaveProperty("requesterId");
    }
  });

  it("returns pagination metadata", async () => {
    const agent = await loginAsRequesterA();

    const response = await agent.get("/api/tickets").query({
      page: 1,
      pageSize: 10,
    });

    expect(response.status).toBe(200);

    expect(response.body.meta).toMatchObject({
      page: 1,
      pageSize: 10,
    });

    expect(response.body.meta).toHaveProperty("total");
    expect(response.body.meta).toHaveProperty("totalPages");
  });

  it("supports search by ticket number or summary", async () => {
    const agent = await loginAsRequesterA();

    const response = await agent.get("/api/tickets").query({
      search: "TKT",
    });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it("rejects a request with no authenticated session (AC-05)", async () => {
    const response = await request(app).get("/api/tickets");

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("not_authenticated");
  });
});

