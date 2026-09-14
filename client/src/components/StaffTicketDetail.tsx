import { useEffect, useState } from "react";
import {
  getComments,
  getStaffTicketDetail,
  type StaffTicketDetail as StaffTicketDetailData,
  type TicketComment,
} from "../api";

interface StaffTicketDetailProps {
  ticketId: number;
  onBack: () => void;
}

// ---------------------------------------------------------------------------
// Issue 5 — "Open Ticket Detail" action from the Ticket Queue.
//
// This is intentionally read-only. Claiming/reassigning ownership, setting
// IT Priority, changing status, and Internal Notes are the "IT Staff Ticket
// operations" issue (docs/lab-03/specification.md FR-11–FR-14) and will
// extend this screen there — see ui-spec.md §5 for the full target layout.
// ---------------------------------------------------------------------------
export default function StaffTicketDetail({
  ticketId,
  onBack,
}: StaffTicketDetailProps) {
  const [ticket, setTicket] = useState<StaffTicketDetailData | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      setError("");
      setNotFound(false);
      setForbidden(false);

      try {
        const [ticketResult, commentsResult] = await Promise.all([
          getStaffTicketDetail(ticketId),
          getComments(ticketId),
        ]);

        if (isMounted) {
          setTicket(ticketResult);
          setComments(commentsResult);
        }
      } catch (err) {
        if (!isMounted) return;

        const message =
          err instanceof Error ? err.message : "Unable to retrieve ticket";

        if (message.toLowerCase().includes("not found")) {
          setNotFound(true);
        } else if (
          message.toLowerCase().includes("permission") ||
          message.toLowerCase().includes("forbidden")
        ) {
          setForbidden(true);
        } else {
          setError(message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [ticketId]);

  function formatDate(date: string) {
    return new Date(date).toLocaleString();
  }

  function renderPriorityBadge(priority?: string) {
    if (!priority) return <span className="text-muted small">-</span>;

    const styles: Record<string, { bg: string; color: string }> = {
      HIGH: { bg: "#FEE2E2", color: "#B91C1C" },
      MEDIUM: { bg: "#FEF3C7", color: "#B45309" },
      LOW: { bg: "#DCFCE7", color: "#15803D" },
    };

    const style = styles[priority] || { bg: "#EEF2F0", color: "#5A6E65" };

    return (
      <span
        className="badge rounded-pill fw-semibold"
        style={{ backgroundColor: style.bg, color: style.color }}
      >
        {priority}
      </span>
    );
  }

  function renderStatusBadge(statusStr: string) {
    const styles: Record<
      string,
      { bg: string; color: string; label: string }
    > = {
      NEW: { bg: "#E0F2FE", color: "#0369A1", label: "New" },
      OPEN: { bg: "#E0F2FE", color: "#0369A1", label: "Open" },
      IN_PROGRESS: { bg: "#DCFCE7", color: "#15803D", label: "In Progress" },
      WAITING_FOR_REQUESTER: {
        bg: "#FEF3C7",
        color: "#B45309",
        label: "Waiting for Requester",
      },
      RESOLVED: { bg: "#DCFCE7", color: "#15803D", label: "Resolved" },
      CLOSED: { bg: "#EEF2F0", color: "#5A6E65", label: "Closed" },
      REOPENED: { bg: "#FEE2E2", color: "#B91C1C", label: "Reopened" },
      CANCELLED: { bg: "#EEF2F0", color: "#5A6E65", label: "Cancelled" },
    };

    const style = styles[statusStr] || {
      bg: "#EEF2F0",
      color: "#5A6E65",
      label: statusStr,
    };

    return (
      <span
        className="badge rounded-pill fw-semibold"
        style={{ backgroundColor: style.bg, color: style.color }}
      >
        {style.label}
      </span>
    );
  }

  return (
    <div className="py-3">
      <button
        type="button"
        className="btn btn-link p-0 mb-3"
        onClick={onBack}
        style={{ color: "#006B3C", textDecoration: "none" }}
      >
        ← Back to Queue
      </button>

      {loading && (
        <div className="text-center py-5">
          <div
            className="spinner-border"
            style={{ color: "#006B3C" }}
            role="status"
          >
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}

      {!loading && notFound && (
        <div
          className="alert"
          style={{
            color: "#5A6E65",
            backgroundColor: "#F5F7F6",
            border: "1px solid #E0E6E2",
          }}
        >
          This ticket could not be found.
        </div>
      )}

      {!loading && forbidden && (
        <div
          className="alert"
          style={{
            color: "#B45309",
            backgroundColor: "#FEF3C7",
            border: "1px solid #FDE68A",
          }}
        >
          You do not have permission to view this ticket.
        </div>
      )}

      {!loading && error && (
        <div
          className="alert"
          style={{
            color: "#D32F2F",
            backgroundColor: "#FDE8E8",
            border: "1px solid #D32F2F",
          }}
        >
          {error}
        </div>
      )}

      {!loading && !notFound && !forbidden && !error && ticket && (
        <div
          className="card"
          style={{ border: "1px solid #E0E6E2", borderRadius: "10px" }}
        >
          <div className="card-body p-3 p-md-4">
            <div className="row g-3 mb-3">
              <div className="col-12 col-md-4">
                <div className="small fw-semibold" style={{ color: "#5A6E65" }}>
                  Ticket No.
                </div>
                <div style={{ color: "#1A2E26" }}>{ticket.ticketNumber}</div>
              </div>
              <div className="col-12 col-md-4">
                <div className="small fw-semibold" style={{ color: "#5A6E65" }}>
                  Category
                </div>
                <div style={{ color: "#1A2E26" }}>
                  {ticket.category.name}
                </div>
              </div>
              <div className="col-12 col-md-4">
                <div className="small fw-semibold" style={{ color: "#5A6E65" }}>
                  Related System
                </div>
                <div style={{ color: "#1A2E26" }}>
                  {ticket.relatedSystem.name}
                </div>
              </div>

              <div className="col-12 col-md-4">
                <div className="small fw-semibold" style={{ color: "#5A6E65" }}>
                  Requester
                </div>
                <div style={{ color: "#1A2E26" }}>{ticket.requester.name}</div>
              </div>
              <div className="col-12 col-md-4">
                <div className="small fw-semibold" style={{ color: "#5A6E65" }}>
                  Requested Priority
                </div>
                <div>{renderPriorityBadge(ticket.requestedPriority)}</div>
              </div>
              <div className="col-12 col-md-4">
                <div className="small fw-semibold" style={{ color: "#5A6E65" }}>
                  Current Status
                </div>
                <div>{renderStatusBadge(ticket.currentStatus)}</div>
              </div>

              <div className="col-12 col-md-4">
                <div className="small fw-semibold" style={{ color: "#5A6E65" }}>
                  Ticket Owner
                </div>
                <div style={{ color: "#1A2E26" }}>
                  {ticket.owner?.name ?? "Unassigned"}
                </div>
              </div>
              <div className="col-12 col-md-4">
                <div className="small fw-semibold" style={{ color: "#5A6E65" }}>
                  IT Priority
                </div>
                <div>{renderPriorityBadge(ticket.itPriority)}</div>
              </div>
              <div className="col-12 col-md-4">
                <div className="small fw-semibold" style={{ color: "#5A6E65" }}>
                  Last Updated
                </div>
                <div className="small" style={{ color: "#5A6E65" }}>
                  {formatDate(ticket.updatedAt)}
                </div>
              </div>
            </div>

            <div className="mb-3">
              <div className="small fw-semibold mb-1" style={{ color: "#5A6E65" }}>
                Summary
              </div>
              <div style={{ color: "#1A2E26" }}>{ticket.summary}</div>
            </div>

            <div className="mb-3">
              <div className="small fw-semibold mb-1" style={{ color: "#5A6E65" }}>
                Description
              </div>
              <div style={{ color: "#1A2E26", whiteSpace: "pre-wrap" }}>
                {ticket.description}
              </div>
            </div>

            {ticket.problemAppearsResolved && (
              <div
                className="alert py-2 px-3 mb-3"
                style={{
                  color: "#15803D",
                  backgroundColor: "#DCFCE7",
                  border: "1px solid #86EFAC",
                  display: "inline-block",
                }}
              >
                Requester indicated this appears resolved.
              </div>
            )}

            <div
              className="alert py-2 px-3"
              style={{
                color: "#0369A1",
                backgroundColor: "#E0F2FE",
                border: "1px solid #7DD3FC",
              }}
            >
              Claim/reassign ownership, IT Priority, status changes, and
              Internal Notes are available in the next Lab 3 increment.
            </div>

            <hr />

            <h2 className="h6 fw-bold mb-3" style={{ color: "#1A2E26" }}>
              Public Comments ({comments.length})
            </h2>

            {comments.length === 0 && (
              <p className="small" style={{ color: "#5A6E65" }}>
                No public comments yet.
              </p>
            )}

            {comments.map((comment) => (
              <div key={comment.id} className="mb-3">
                <div className="d-flex align-items-center gap-2">
                  <span className="fw-semibold" style={{ color: "#1A2E26" }}>
                    {comment.author.name}
                  </span>
                  <span
                    className="badge"
                    style={{ backgroundColor: "#EEF2F0", color: "#5A6E65" }}
                  >
                    {comment.author.role}
                  </span>
                  <span className="small" style={{ color: "#5A6E65" }}>
                    {formatDate(comment.createdAt)}
                  </span>
                </div>
                <div style={{ color: "#1A2E26" }}>{comment.content}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
