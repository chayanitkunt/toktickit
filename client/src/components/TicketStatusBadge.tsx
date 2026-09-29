import type { CurrentStatus } from "../api";

const STATUS_STYLES: Record<CurrentStatus, { label: string; bg: string; color: string }> = {
  NEW: { label: "New", bg: "#E0F2FE", color: "#0369A1" },
  OPEN: { label: "Open", bg: "#E0F2FE", color: "#0369A1" },
  IN_PROGRESS: { label: "In Progress", bg: "#DCFCE7", color: "#15803D" },
  WAITING_FOR_REQUESTER: { label: "Waiting for Requester", bg: "#FEF3C7", color: "#B45309" },
  RESOLVED: { label: "Resolved", bg: "#DCFCE7", color: "#15803D" },
  CLOSED: { label: "Closed", bg: "#EEF2F0", color: "#5A6E65" },
  REOPENED: { label: "Reopened", bg: "#FEE2E2", color: "#B91C1C" },
  CANCELLED: { label: "Cancelled", bg: "#EEF2F0", color: "#5A6E65" },
};

export default function TicketStatusBadge({ status }: { status: CurrentStatus }) {
  const style = STATUS_STYLES[status];
  return <span className="badge rounded-pill fw-semibold" style={{ backgroundColor: style.bg, color: style.color }}>{style.label}</span>;
}
