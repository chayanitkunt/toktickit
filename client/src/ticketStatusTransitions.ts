import type { CurrentStatus } from "./api";

// ---------------------------------------------------------------------------
// Issue 6 — client-side mirror of server/src/ticketStatusTransitions.ts
// (BR-08, specification.md §5.1). This only drives which options appear in
// the Current Status dropdown and whether a confirmation dialog is shown —
// it is a UX convenience, not a security boundary. The server independently
// validates every PATCH /api/staff/tickets/:id/status against its own copy
// of this matrix and rejects anything illegal with 422, regardless of what
// the client sent (AC-13).
// ---------------------------------------------------------------------------

export const TICKET_STATUS_TRANSITIONS: Record<CurrentStatus, CurrentStatus[]> = {
  NEW: ["OPEN", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  CANCELLED: ["REOPENED"],
};

// Every transition out of these three statuses is "Confirmation Required"
// per specification.md §5.1 (Resolved→Closed/Reopened, Closed→Reopened,
// Cancelled→Reopened).
export const STATUSES_REQUIRING_CONFIRMATION: CurrentStatus[] = [
  "RESOLVED",
  "CLOSED",
  "CANCELLED",
];

export function getAllowedNextStatuses(from: CurrentStatus): CurrentStatus[] {
  return TICKET_STATUS_TRANSITIONS[from] ?? [];
}

export function transitionRequiresConfirmation(from: CurrentStatus): boolean {
  return STATUSES_REQUIRING_CONFIRMATION.includes(from);
}

export const STATUS_LABELS: Record<CurrentStatus, string> = {
  NEW: "New",
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  WAITING_FOR_REQUESTER: "Waiting for Requester",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  REOPENED: "Reopened",
  CANCELLED: "Cancelled",
};
