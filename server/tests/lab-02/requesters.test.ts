import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../src/app.js";

describe("GET /api/requesters", () => {
  it("returns only active requesters", async () => {
    const response = await request(app).get("/api/requesters");

    expect(response.status).toBe(200);

    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Alice Johnson",
          email: "alice@example.com",
        }),
        expect.objectContaining({
          name: "Bob Smith",
          email: "bob@example.com",
        }),
      ]),
    );

    expect(response.body).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Charlie Brown",
          email: "charlie@example.com",
        }),
      ]),
    );
  });

  it("returns requesters in id order", async () => {
    const response = await request(app).get("/api/requesters");

    expect(response.status).toBe(200);

    const ids = response.body.map((requester: { id: number }) => requester.id);

    expect(ids).toEqual([...ids].sort((a, b) => a - b));
  });
});
