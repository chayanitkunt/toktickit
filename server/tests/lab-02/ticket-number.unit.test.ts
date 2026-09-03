import { describe, expect, it } from "vitest";
import { formatTicketNumber } from "../../src/ticketNumber.js";

describe("formatTicketNumber", () => {
  it("returns a string matching TKT-YYYY-NNNNNN", () => {
    const result = formatTicketNumber(42, new Date("2026-05-12"));

    expect(result).toMatch(/^TKT-\d{4}-\d{6}$/);
  });

  it("pads the id to 6 digits with leading zeros", () => {
    expect(formatTicketNumber(1, new Date("2026-01-01"))).toBe(
      "TKT-2026-000001"
    );
    expect(formatTicketNumber(1234, new Date("2026-01-01"))).toBe(
      "TKT-2026-001234"
    );
  });

  it("uses the year of the provided date", () => {
    expect(formatTicketNumber(7, new Date("2027-12-31"))).toBe(
      "TKT-2027-000007"
    );
  });

  it("does not pad when the id already has 6 or more digits", () => {
    expect(formatTicketNumber(1000000, new Date("2026-01-01"))).toBe(
      "TKT-2026-1000000"
    );
  });

  it("produces a different number for a different id (uniqueness by id)", () => {
    const a = formatTicketNumber(1, new Date("2026-01-01"));
    const b = formatTicketNumber(2, new Date("2026-01-01"));

    expect(a).not.toBe(b);
  });
});
