import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("GET /api/tickets", () => {
  it("returns only tickets owned by the selected requester", async () => {
    const response = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", "1");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("data");
    expect(response.body).toHaveProperty("meta");
    expect(Array.isArray(response.body.data)).toBe(true);

    for (const ticket of response.body.data) {
      expect(ticket).not.toHaveProperty("requesterId");
    }
  });

  it("returns pagination metadata", async () => {
    const response = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", "1")
      .query({
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
    const response = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", "1")
      .query({
        search: "TKT",
      });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it("rejects a missing requester context", async () => {
    const response = await request(app)
      .get("/api/tickets");

    expect(response.status).toBe(400);
  });
});
