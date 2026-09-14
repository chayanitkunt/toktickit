// ---------------------------------------------------------------------------
// Issue 6 — Ticket status transition matrix (BR-08, specification.md §5.1)
//
// Requesters never reach this — they may only set problemAppearsResolved
// (BR-05), never currentStatus directly. Everything below is IT Staff/
// Administrator only, enforced by PATCH /api/staff/tickets/:id/status.
//
// "Confirmation Required" (specification.md §5.1) is a client-side UX gate
// only — the server enforces the matrix the same way regardless of whether
// the client showed a confirm dialog (AC-13).
// ---------------------------------------------------------------------------

export type CurrentStatus =
  | "NEW"
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_FOR_REQUESTER"
  | "RESOLVED"
  | "CLOSED"
  | "REOPENED"
  | "CANCELLED";

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

// Every transition out of these three statuses is marked "Confirmation
// Required" in specification.md §5.1 (Resolved→Closed/Reopened,
// Closed→Reopened, Cancelled→Reopened). Client-only signal — see header.
export const STATUSES_REQUIRING_CONFIRMATION: CurrentStatus[] = [
  "RESOLVED",
  "CLOSED",
  "CANCELLED",
];

export function isValidStatusTransition(
  from: string,
  to: string
): boolean {
  const allowedNext = TICKET_STATUS_TRANSITIONS[from as CurrentStatus];
  return Array.isArray(allowedNext) && allowedNext.includes(to as CurrentStatus);
}

export function transitionRequiresConfirmation(from: string): boolean {
  return STATUSES_REQUIRING_CONFIRMATION.includes(from as CurrentStatus);
}