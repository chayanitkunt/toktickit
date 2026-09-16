import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import {
  claimTicket,
  downloadAttachment,
  getComments,
  getEligibleOwners,
  getInternalNotes,
  getStaffTicketDetail,
  postComment,
  postInternalNote,
  updateItPriority,
  updateTicketStatus,
  type CurrentStatus,
  type EligibleOwner,
  type RequestedPriority,
  type StaffTicketDetail as StaffTicketDetailData,
  type TicketAttachment,
  type TicketComment,
  type TicketNote,
} from "../api";
import {
  getAllowedNextStatuses,
  STATUS_LABELS,
  transitionRequiresConfirmation,
} from "../ticketStatusTransitions";

interface StaffTicketDetailProps {
  ticketId: number;
  onBack: () => void;
}

type ActiveTab = "comments" | "notes" | "attachments";

function formatDate(date?: string) {
  if (!date) return "-";
  return new Date(date).toLocaleString();
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function PriorityBadge({ priority }: { priority?: string }) {
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

const STATUS_BADGE_STYLES: Record<string, { bg: string; color: string }> = {
  NEW: { bg: "#E0F2FE", color: "#0369A1" },
  OPEN: { bg: "#E0F2FE", color: "#0369A1" },
  IN_PROGRESS: { bg: "#DCFCE7", color: "#15803D" },
  WAITING_FOR_REQUESTER: { bg: "#FEF3C7", color: "#B45309" },
  RESOLVED: { bg: "#DCFCE7", color: "#15803D" },
  CLOSED: { bg: "#EEF2F0", color: "#5A6E65" },
  REOPENED: { bg: "#FEE2E2", color: "#B91C1C" },
  CANCELLED: { bg: "#EEF2F0", color: "#5A6E65" },
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_BADGE_STYLES[status] || { bg: "#EEF2F0", color: "#5A6E65" };
  const label = STATUS_LABELS[status as CurrentStatus] ?? status;

  return (
    <span
      className="badge rounded-pill fw-semibold"
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Issue 6 — GitHub Issue #33: IT Staff Ticket Detail workflow
//
// Extends the Issue 5 read-only screen with:
//   - Ticket Owner: claim (self) / assign / reassign (FR-11/BR-06)
//   - IT Priority (FR-12/BR-07)
//   - Current Status, restricted to the BR-08 transition matrix, with a
//     confirmation dialog for terminal transitions (§5.1)
//   - Public Comments / Internal Notes / Attachments tabs — visually
//     distinct so private info is never posted publicly by mistake (BR-04)
// ---------------------------------------------------------------------------
export default function StaffTicketDetail({
  ticketId,
  onBack,
}: StaffTicketDetailProps) {
  const { user } = useAuth();

  const [ticket, setTicket] = useState<StaffTicketDetailData | null>(null);
  const [owners, setOwners] = useState<EligibleOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  const [activeTab, setActiveTab] = useState<ActiveTab>("comments");

  // Ownership
  const [ownerSelection, setOwnerSelection] = useState<string>("");
  const [savingOwner, setSavingOwner] = useState(false);
  const [ownerError, setOwnerError] = useState("");

  // IT Priority
  const [savingPriority, setSavingPriority] = useState(false);
  const [priorityError, setPriorityError] = useState("");

  // Status
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusError, setStatusError] = useState("");

  // Public Comments
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState("");
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [commentPostError, setCommentPostError] = useState("");

  // Internal Notes
  const [notes, setNotes] = useState<TicketNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState("");
  const [newNote, setNewNote] = useState("");
  const [postingNote, setPostingNote] = useState(false);
  const [notePostError, setNotePostError] = useState("");

  // Attachments
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [attachmentError, setAttachmentError] = useState("");

  const loadTicket = useCallback(async (isStale: () => boolean) => {
    setLoading(true);
    setError("");
    setNotFound(false);
    setForbidden(false);

    try {
      const [ticketResult, ownersResult] = await Promise.all([
        getStaffTicketDetail(ticketId),
        getEligibleOwners(),
      ]);

      // Issue 8 (E2E-04) — guard against a stale/duplicate invocation.
      // React StrictMode double-invokes effects on mount in development,
      // so without this check a slower first call can resolve AFTER a
      // faster second call (or after the user has already changed the
      // Ticket Owner selection), silently reverting ownerSelection back
      // to the server's original value.
      if (isStale()) return;

      setTicket(ticketResult);
      setOwners(ownersResult);
      setOwnerSelection(
        ticketResult.owner ? String(ticketResult.owner.id) : ""
      );
    } catch (err) {
      if (isStale()) return;

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
      if (!isStale()) {
        setLoading(false);
      }
    }
  }, [ticketId]);

  const loadComments = useCallback(async () => {
    try {
      setCommentsLoading(true);
      setCommentsError("");
      setComments(await getComments(ticketId));
    } catch (err) {
      setCommentsError(
        err instanceof Error ? err.message : "Unable to load Public Comments"
      );
    } finally {
      setCommentsLoading(false);
    }
  }, [ticketId]);

  const loadNotes = useCallback(async () => {
    try {
      setNotesLoading(true);
      setNotesError("");
      setNotes(await getInternalNotes(ticketId));
    } catch (err) {
      setNotesError(
        err instanceof Error ? err.message : "Unable to load Internal Notes"
      );
    } finally {
      setNotesLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    let cancelled = false;
    loadTicket(() => cancelled);

    return () => {
      cancelled = true;
    };
  }, [loadTicket]);

  // Load each tab's data lazily the first time it's opened, then keep it
  // cached — avoids fetching Internal Notes before the ticket/role check
  // above has even resolved.
  useEffect(() => {
    if (loading || notFound || forbidden || error) return;

    if (activeTab === "comments" && comments.length === 0 && !commentsLoading) {
      loadComments();
    }

    if (activeTab === "notes" && notes.length === 0 && !notesLoading) {
      loadNotes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, loading, notFound, forbidden, error]);

  async function handleOwnerSave() {
    if (!ticket) return;

    try {
      setSavingOwner(true);
      setOwnerError("");

      const targetOwnerId =
        ownerSelection === "" ? undefined : Number(ownerSelection);

      const updated = await claimTicket(ticket.id, targetOwnerId);
      setTicket({ ...ticket, owner: updated.owner });
    } catch (err) {
      setOwnerError(
        err instanceof Error ? err.message : "Unable to update Ticket Owner"
      );
    } finally {
      setSavingOwner(false);
    }
  }

  async function handleClaim() {
    if (!ticket || !user) return;

    try {
      setSavingOwner(true);
      setOwnerError("");
      const updated = await claimTicket(ticket.id);
      setTicket({ ...ticket, owner: updated.owner });
      setOwnerSelection(updated.owner ? String(updated.owner.id) : "");
    } catch (err) {
      setOwnerError(
        err instanceof Error ? err.message : "Unable to claim this ticket"
      );
    } finally {
      setSavingOwner(false);
    }
  }

  async function handlePriorityChange(newPriority: RequestedPriority) {
    if (!ticket) return;

    try {
      setSavingPriority(true);
      setPriorityError("");
      const updated = await updateItPriority(ticket.id, newPriority);
      setTicket({ ...ticket, itPriority: updated.itPriority });
    } catch (err) {
      setPriorityError(
        err instanceof Error ? err.message : "Unable to update IT Priority"
      );
    } finally {
      setSavingPriority(false);
    }
  }

  async function handleStatusChange(newStatus: CurrentStatus) {
    if (!ticket) return;

    if (transitionRequiresConfirmation(ticket.currentStatus)) {
      const confirmed = window.confirm(
        `Change status from "${STATUS_LABELS[ticket.currentStatus]}" to "${STATUS_LABELS[newStatus]}"? This may be a terminal change.`
      );

      if (!confirmed) return;
    }

    try {
      setSavingStatus(true);
      setStatusError("");
      const updated = await updateTicketStatus(ticket.id, newStatus);
      setTicket({ ...ticket, currentStatus: updated.currentStatus });
    } catch (err) {
      setStatusError(
        err instanceof Error ? err.message : "Unable to update ticket status"
      );
    } finally {
      setSavingStatus(false);
    }
  }

  async function handlePostComment(e: React.FormEvent) {
    e.preventDefault();

    const trimmed = newComment.trim();
    if (trimmed === "") {
      setCommentPostError("Comment cannot be empty.");
      return;
    }

    try {
      setPostingComment(true);
      setCommentPostError("");
      const created = await postComment(ticketId, trimmed);
      setComments((prev) => [...prev, created]);
      setNewComment("");
    } catch (err) {
      setCommentPostError(
        err instanceof Error ? err.message : "Unable to post comment"
      );
    } finally {
      setPostingComment(false);
    }
  }

  async function handlePostNote(e: React.FormEvent) {
    e.preventDefault();

    const trimmed = newNote.trim();
    if (trimmed === "") {
      setNotePostError("Internal Note cannot be empty.");
      return;
    }

    try {
      setPostingNote(true);
      setNotePostError("");
      const created = await postInternalNote(ticketId, trimmed);
      setNotes((prev) => [...prev, created]);
      setNewNote("");
    } catch (err) {
      setNotePostError(
        err instanceof Error ? err.message : "Unable to post Internal Note"
      );
    } finally {
      setPostingNote(false);
    }
  }

  async function handleDownload(attachment: TicketAttachment) {
    try {
      setAttachmentError("");
      setDownloadingId(attachment.id);

      const blob = await downloadAttachment(ticketId, attachment.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = attachment.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setAttachmentError(
        err instanceof Error ? err.message : "Unable to download attachment"
      );
    } finally {
      setDownloadingId(null);
    }
  }

  const activeAttachments =
    ticket?.attachments.filter((a) => !a.isRemoved) ?? [];

  const isCurrentOwner = !!ticket?.owner && ticket.owner.id === user?.id;
  const canClaim = !!ticket && !ticket.owner;

  function tabButtonStyle(tab: ActiveTab) {
    const active = activeTab === tab;
    return {
      border: "none",
      borderBottom: active ? "3px solid #006B3C" : "3px solid transparent",
      backgroundColor: "transparent",
      color: active ? "#006B3C" : "#5A6E65",
      fontWeight: active ? 700 : 500,
      padding: "0.5rem 1rem",
    } as const;
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
        <>
          <div
            className="card mb-4"
            style={{ border: "1px solid #E0E6E2", borderRadius: "10px" }}
          >
            <div className="card-body p-3 p-md-4">
              <div className="row g-2 g-md-3 mb-3">
                <div className="col-6 col-md-4">
                  <div className="small fw-semibold" style={{ color: "#5A6E65" }}>
                    Ticket No.
                  </div>
                  <div style={{ color: "#1A2E26" }}>{ticket.ticketNumber}</div>
                </div>
                <div className="col-6 col-md-4">
                  <div className="small fw-semibold" style={{ color: "#5A6E65" }}>
                    Category
                  </div>
                  <div style={{ color: "#1A2E26" }}>{ticket.category.name}</div>
                </div>
                <div className="col-6 col-md-4">
                  <div className="small fw-semibold" style={{ color: "#5A6E65" }}>
                    Related System
                  </div>
                  <div style={{ color: "#1A2E26" }}>
                    {ticket.relatedSystem.name}
                  </div>
                </div>

                <div className="col-6 col-md-4">
                  <div className="small fw-semibold" style={{ color: "#5A6E65" }}>
                    Requester
                  </div>
                  <div style={{ color: "#1A2E26" }}>{ticket.requester.name}</div>
                </div>
                <div className="col-6 col-md-4">
                  <div className="small fw-semibold" style={{ color: "#5A6E65" }}>
                    Requested Priority
                  </div>
                  <div>
                    <PriorityBadge priority={ticket.requestedPriority} />
                  </div>
                </div>
                <div className="col-6 col-md-4">
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

              <hr />

              {/* Operational panel: Ticket Owner / IT Priority / Status */}
              <div className="row g-3">
                <div className="col-12 col-md-4">
                  <label
                    htmlFor="ticket-owner-select"
                    className="small fw-semibold mb-1 d-block"
                    style={{ color: "#5A6E65" }}
                  >
                    Ticket Owner
                  </label>
                  <select
                    id="ticket-owner-select"
                    className="form-select mb-2"
                    value={ownerSelection}
                    disabled={savingOwner}
                    onChange={(e) => setOwnerSelection(e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {owners.map((owner) => (
                      <option key={owner.id} value={owner.id}>
                        {owner.name}
                        {owner.id === user?.id ? " (Me)" : ""}
                      </option>
                    ))}
                  </select>
                  <div className="d-flex gap-2 flex-wrap">
                    {canClaim && (
                      <button
                        type="button"
                        className="btn btn-sm"
                        disabled={savingOwner}
                        onClick={handleClaim}
                        style={{
                          backgroundColor: "#006B3C",
                          color: "#FFFFFF",
                          border: "none",
                        }}
                      >
                        {savingOwner ? "Claiming..." : "Claim"}
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-success"
                      disabled={
                        savingOwner ||
                        (ticket.owner?.id ?? "") ===
                          (ownerSelection === "" ? "" : Number(ownerSelection))
                      }
                      onClick={handleOwnerSave}
                    >
                      {savingOwner
                        ? "Saving..."
                        : isCurrentOwner
                        ? "Reassign"
                        : "Assign"}
                    </button>
                  </div>
                  {ownerError && (
                    <div className="small mt-1" style={{ color: "#D32F2F" }}>
                      {ownerError}
                    </div>
                  )}
                </div>

                <div className="col-12 col-md-4">
                  <label
                    htmlFor="it-priority-select"
                    className="small fw-semibold mb-1 d-block"
                    style={{ color: "#5A6E65" }}
                  >
                    IT Priority
                  </label>
                  <select
                    id="it-priority-select"
                    className="form-select"
                    value={ticket.itPriority}
                    disabled={savingPriority}
                    onChange={(e) =>
                      handlePriorityChange(e.target.value as RequestedPriority)
                    }
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                  {priorityError && (
                    <div className="small mt-1" style={{ color: "#D32F2F" }}>
                      {priorityError}
                    </div>
                  )}
                </div>

                <div className="col-12 col-md-4">
                  <label
                    htmlFor="current-status-select"
                    className="small fw-semibold mb-1 d-block"
                    style={{ color: "#5A6E65" }}
                  >
                    Current Status
                  </label>
                  <div className="mb-2">
                    <StatusBadge status={ticket.currentStatus} />
                  </div>
                  <select
                    id="current-status-select"
                    className="form-select"
                    value=""
                    disabled={
                      savingStatus ||
                      getAllowedNextStatuses(ticket.currentStatus).length === 0
                    }
                    onChange={(e) => {
                      if (e.target.value) {
                        handleStatusChange(e.target.value as CurrentStatus);
                      }
                    }}
                  >
                    <option value="" disabled>
                      {savingStatus ? "Saving..." : "Change status to..."}
                    </option>
                    {getAllowedNextStatuses(ticket.currentStatus).map(
                      (status) => (
                        <option key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </option>
                      )
                    )}
                  </select>
                  {statusError && (
                    <div className="small mt-1" style={{ color: "#D32F2F" }}>
                      {statusError}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs: Public Comments | Internal Notes | Attachments |
              Service Actions (reserved, disabled — Lab 4) */}
          <div
            className="card"
            style={{ border: "1px solid #E0E6E2", borderRadius: "10px" }}
          >
            <div
              className="d-flex flex-wrap"
              style={{ borderBottom: "1px solid #E0E6E2" }}
              role="tablist"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "comments"}
                className="btn"
                style={tabButtonStyle("comments")}
                onClick={() => setActiveTab("comments")}
              >
                Public Comments ({comments.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "notes"}
                className="btn"
                style={tabButtonStyle("notes")}
                onClick={() => setActiveTab("notes")}
              >
                🔒 Internal Notes ({notes.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "attachments"}
                className="btn"
                style={tabButtonStyle("attachments")}
                onClick={() => setActiveTab("attachments")}
              >
                Attachments ({activeAttachments.length})
              </button>
              <button
                type="button"
                role="tab"
                disabled
                className="btn"
                style={{
                  ...tabButtonStyle("comments"),
                  color: "#B7C2BC",
                  cursor: "not-allowed",
                }}
                title="Available in Lab 4"
              >
                Service Actions
              </button>
            </div>

            <div className="card-body p-3 p-md-4">
              {activeTab === "comments" && (
                <div>
                  {commentsError && (
                    <div className="alert alert-danger py-2" role="alert">
                      {commentsError}
                    </div>
                  )}

                  {commentsLoading ? (
                    <div className="text-center py-3">
                      <div
                        className="spinner-border spinner-border-sm"
                        role="status"
                        style={{ color: "#006B3C" }}
                      />
                    </div>
                  ) : comments.length === 0 ? (
                    <p className="text-muted mb-3">No public comments yet.</p>
                  ) : (
                    <ul className="list-group mb-3">
                      {comments.map((comment) => (
                        <li key={comment.id} className="list-group-item">
                          <div className="d-flex justify-content-between align-items-baseline flex-wrap gap-2 mb-1">
                            <span
                              className="fw-semibold"
                              style={{ color: "#1A2E26" }}
                            >
                              {comment.author.name}
                              <span
                                className="badge ms-2"
                                style={{
                                  backgroundColor: "#EEF2F0",
                                  color: "#5A6E65",
                                  fontWeight: 500,
                                }}
                              >
                                {comment.author.role}
                              </span>
                            </span>
                            <span className="small text-muted">
                              {formatDate(comment.createdAt)}
                            </span>
                          </div>
                          <div style={{ color: "#1A2E26", whiteSpace: "pre-wrap" }}>
                            {comment.content}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  <hr />

                  <form onSubmit={handlePostComment}>
                    <label
                      htmlFor="new-public-comment"
                      className="form-label fw-semibold"
                      style={{ color: "#1A2E26" }}
                    >
                      Add Public Comment
                    </label>
                    <textarea
                      id="new-public-comment"
                      rows={3}
                      className="form-control mb-2"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      maxLength={2000}
                      placeholder="Visible to the Requester..."
                    />
                    <div className="form-text mb-2">
                      Visible to the Requester, IT Staff, and Administrators.{" "}
                      {newComment.length}/2000
                    </div>

                    {commentPostError && (
                      <div className="alert alert-danger py-2" role="alert">
                        {commentPostError}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="btn"
                      disabled={postingComment || newComment.trim() === ""}
                      style={{
                        backgroundColor: "#006B3C",
                        color: "#FFFFFF",
                        border: "none",
                      }}
                    >
                      {postingComment ? "Posting..." : "Post Comment"}
                    </button>
                  </form>
                </div>
              )}

              {activeTab === "notes" && (
                <div>
                  <div
                    className="small fw-semibold mb-3 px-3 py-2"
                    style={{
                      color: "#B45309",
                      backgroundColor: "#FEF3C7",
                      border: "1px solid #FDE68A",
                      borderRadius: "8px",
                      display: "inline-block",
                    }}
                  >
                    🔒 Internal — not visible to Requester
                  </div>

                  {notesError && (
                    <div className="alert alert-danger py-2" role="alert">
                      {notesError}
                    </div>
                  )}

                  {notesLoading ? (
                    <div className="text-center py-3">
                      <div
                        className="spinner-border spinner-border-sm"
                        role="status"
                        style={{ color: "#006B3C" }}
                      />
                    </div>
                  ) : notes.length === 0 ? (
                    <p className="text-muted mb-3">No Internal Notes yet.</p>
                  ) : (
                    <ul className="list-group mb-3">
                      {notes.map((note) => (
                        <li
                          key={note.id}
                          className="list-group-item"
                          style={{ backgroundColor: "#FFFBEB" }}
                        >
                          <div className="d-flex justify-content-between align-items-baseline flex-wrap gap-2 mb-1">
                            <span
                              className="fw-semibold"
                              style={{ color: "#1A2E26" }}
                            >
                              {note.author.name}
                              <span
                                className="badge ms-2"
                                style={{
                                  backgroundColor: "#FEF3C7",
                                  color: "#B45309",
                                  fontWeight: 500,
                                }}
                              >
                                {note.author.role}
                              </span>
                            </span>
                            <span className="small text-muted">
                              {formatDate(note.createdAt)}
                            </span>
                          </div>
                          <div style={{ color: "#1A2E26", whiteSpace: "pre-wrap" }}>
                            {note.content}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  <hr />

                  <form onSubmit={handlePostNote}>
                    <label
                      htmlFor="new-internal-note"
                      className="form-label fw-semibold"
                      style={{ color: "#1A2E26" }}
                    >
                      Add Internal Note
                    </label>
                    <textarea
                      id="new-internal-note"
                      rows={3}
                      className="form-control mb-2"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      maxLength={2000}
                      placeholder="Not visible to the Requester..."
                    />
                    <div className="form-text mb-2">
                      Visible only to IT Staff and Administrators.{" "}
                      {newNote.length}/2000
                    </div>

                    {notePostError && (
                      <div className="alert alert-danger py-2" role="alert">
                        {notePostError}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="btn"
                      disabled={postingNote || newNote.trim() === ""}
                      style={{
                        backgroundColor: "#B45309",
                        color: "#FFFFFF",
                        border: "none",
                      }}
                    >
                      {postingNote ? "Posting..." : "Post Internal Note"}
                    </button>
                  </form>
                </div>
              )}

              {activeTab === "attachments" && (
                <div>
                  {attachmentError && (
                    <div className="alert alert-danger py-2" role="alert">
                      {attachmentError}
                    </div>
                  )}

                  {activeAttachments.length === 0 ? (
                    <p className="text-muted mb-0">No active attachments.</p>
                  ) : (
                    <ul className="list-group">
                      {activeAttachments.map((attachment) => (
                        <li
                          key={attachment.id}
                          className="list-group-item d-flex justify-content-between align-items-center flex-wrap gap-2"
                        >
                          <div>
                            <div
                              className="fw-semibold"
                              style={{ color: "#1A2E26" }}
                            >
                              {attachment.fileName}
                            </div>
                            <div className="small text-muted">
                              {formatFileSize(attachment.fileSize)} &middot;{" "}
                              {formatDate(attachment.createdAt)}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-success"
                            disabled={downloadingId === attachment.id}
                            onClick={() => handleDownload(attachment)}
                          >
                            {downloadingId === attachment.id
                              ? "Downloading..."
                              : "Download"}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
