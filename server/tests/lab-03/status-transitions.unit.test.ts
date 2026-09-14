import { describe, expect, it } from "vitest";
import {
  isValidStatusTransition,
  transitionRequiresConfirmation,
  TICKET_STATUS_TRANSITIONS,
} from "../../src/ticketStatusTransitions.js";

// ---------------------------------------------------------------------------
// UNIT-02 — BR-08: status transition matrix function.
// Pure-function unit test; no database required.
// ---------------------------------------------------------------------------

describe("isValidStatusTransition — legal transitions (specification.md §5.1)", () => {
  it.each([
    ["NEW", "OPEN"],
    ["NEW", "CANCELLED"],
    ["OPEN", "IN_PROGRESS"],
    ["OPEN", "WAITING_FOR_REQUESTER"],
    ["OPEN", "CANCELLED"],
    ["IN_PROGRESS", "WAITING_FOR_REQUESTER"],
    ["IN_PROGRESS", "RESOLVED"],
    ["IN_PROGRESS", "CANCELLED"],
    ["WAITING_FOR_REQUESTER", "IN_PROGRESS"],
    ["WAITING_FOR_REQUESTER", "RESOLVED"],
    ["WAITING_FOR_REQUESTER", "CANCELLED"],
    ["RESOLVED", "CLOSED"],
    ["RESOLVED", "REOPENED"],
    ["CLOSED", "REOPENED"],
    ["REOPENED", "IN_PROGRESS"],
    ["REOPENED", "RESOLVED"],
    ["REOPENED", "CANCELLED"],
    ["CANCELLED", "REOPENED"],
  ])("allows %s -> %s", (from, to) => {
    expect(isValidStatusTransition(from, to)).toBe(true);
  });
});

describe("isValidStatusTransition — illegal transitions rejected", () => {
  it.each([
    ["NEW", "CLOSED"],
    ["NEW", "RESOLVED"],
    ["NEW", "IN_PROGRESS"],
    ["OPEN", "RESOLVED"],
    ["OPEN", "CLOSED"],
    ["IN_PROGRESS", "CLOSED"],
    ["RESOLVED", "IN_PROGRESS"],
    ["RESOLVED", "NEW"],
    ["CLOSED", "OPEN"],
    ["CLOSED", "IN_PROGRESS"],
    ["CANCELLED", "IN_PROGRESS"],
    ["CANCELLED", "CLOSED"],
  ])("rejects %s -> %s", (from, to) => {
    expect(isValidStatusTransition(from, to)).toBe(false);
  });

  it("rejects an unknown current status", () => {
    expect(isValidStatusTransition("NOT_A_STATUS", "OPEN")).toBe(false);
  });

  it("rejects an unknown target status", () => {
    expect(isValidStatusTransition("NEW", "NOT_A_STATUS")).toBe(false);
  });
});

describe("transitionRequiresConfirmation", () => {
  it.each(["RESOLVED", "CLOSED", "CANCELLED"])(
    "flags %s as requiring confirmation for its next move",
    (status) => {
      expect(transitionRequiresConfirmation(status)).toBe(true);
    }
  );

  it.each(["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"])(
    "does not flag %s",
    (status) => {
      expect(transitionRequiresConfirmation(status)).toBe(false);
    }
  );
});

describe("every status has a defined (possibly empty) transition list", () => {
  it("covers all eight required statuses", () => {
    const statuses = Object.keys(TICKET_STATUS_TRANSITIONS);
    expect(statuses.sort()).toEqual(
      [
        "NEW",
        "OPEN",
        "IN_PROGRESS",
        "WAITING_FOR_REQUESTER",
        "RESOLVED",
        "CLOSED",
        "REOPENED",
        "CANCELLED",
      ].sort()
    );
  });
});
