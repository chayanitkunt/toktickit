import { useCallback, useEffect, useState } from "react";
import {
  addAttachments,
  downloadAttachment,
  getTicketDetail,
  removeAttachment,
  type TicketAttachment,
  type TicketDetail as TicketDetailData,
} from "../api";

interface TicketDetailProps {
  ticketId: number;
  requesterId: number;
  onBack: () => void;
}

function formatDate(dateString?: string) {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleString();
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  NEW: { label: "Open", bg: "#E0F2FE", color: "#0369A1" },
  IN_PROGRESS: { label: "In Progress", bg: "#DCFCE7", color: "#15803D" },
  PENDING: { label: "Pending", bg: "#FEF3C7", color: "#B45309" },
  RESOLVED: { label: "Resolved", bg: "#DCFCE7", color: "#15803D" },
  CLOSED: { label: "Closed", bg: "#EEF2F0", color: "#5A6E65" },
};

const PRIORITY_STYLES: Record<string, { bg: string; color: string }> = {
  HIGH: { bg: "#FEE2E2", color: "#B91C1C" },
  MEDIUM: { bg: "#FEF3C7", color: "#B45309" },
  LOW: { bg: "#DCFCE7", color: "#15803D" },
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_LABELS[status] ?? {
    label: status,
    bg: "#EEF2F0",
    color: "#5A6E65",
  };

  return (
    <span
      className="badge rounded-pill fw-semibold px-3 py-2"
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {style.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const style = PRIORITY_STYLES[priority] ?? { bg: "#EEF2F0", color: "#5A6E65" };

  return (
    <span
      className="badge rounded-pill fw-semibold px-3 py-2"
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {priority}
    </span>
  );
}

function ReadOnlyField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <div
        className="small fw-semibold mb-1"
        style={{ color: "#5A6E65" }}
      >
        {label}
      </div>
      <div
        className="px-3 py-2"
        style={{
          backgroundColor: "#F5F7F6",
          border: "1px solid #E0E6E2",
          borderRadius: "8px",
          color: "#1A2E26",
          minHeight: "42px",
          display: "flex",
          alignItems: "center",
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function TicketDetail({
  ticketId,
  requesterId,
  onBack,
}: TicketDetailProps) {
  const [ticket, setTicket] = useState<TicketDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const [removingId, setRemovingId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState("");

  const loadTicket = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getTicketDetail(requesterId, ticketId);
      setTicket(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load ticket details"
      );
    } finally {
      setLoading(false);
    }
  }, [requesterId, ticketId]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  async function handleAddAttachments() {
    if (pendingFiles.length === 0) return;

    try {
      setUploading(true);
      setUploadError("");
      await addAttachments(requesterId, ticketId, pendingFiles);
      setPendingFiles([]);
      await loadTicket();
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Unable to add attachment"
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(attachment: TicketAttachment) {
    try {
      setActionError("");
      setDownloadingId(attachment.id);

      const blob = await downloadAttachment(
        requesterId,
        ticketId,
        attachment.id
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = attachment.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Unable to download attachment"
      );
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleRemove(attachment: TicketAttachment) {
    const reason = window.prompt(
      `Reason for removing "${attachment.fileName}":`
    );

    if (reason === null) {
      return;
    }

    if (reason.trim() === "") {
      setActionError("A removal reason is required.");
      return;
    }

    try {
      setActionError("");
      setRemovingId(attachment.id);
      await removeAttachment(requesterId, ticketId, attachment.id, reason.trim());
      await loadTicket();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Unable to remove attachment"
      );
    } finally {
      setRemovingId(null);
    }
  }

  if (loading) {
    return (
      <div className="py-5 text-center">
        <div
          className="spinner-border mb-3"
          role="status"
          aria-hidden="true"
          style={{ color: "#006B3C" }}
        />
        <div style={{ color: "#1A2E26" }}>Loading...</div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="py-3">
        <div className="alert alert-danger" role="alert">
          {error || "Unable to load ticket details"}
        </div>
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={onBack}
        >
          ← Back to My Tickets
        </button>
      </div>
    );
  }

  const activeAttachments = ticket.attachments.filter((a) => !a.isRemoved);
  const removedAttachments = ticket.attachments.filter((a) => a.isRemoved);

  return (
    <div className="py-3">
      {/* Breadcrumb */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="small" style={{ color: "#5A6E65" }}>
          My Tickets &nbsp;›&nbsp; Ticket Details
        </div>
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={onBack}
        >
          ← Back to My Tickets
        </button>
      </div>

      {/* Ticket Header */}
      <div
        className="card mb-4"
        style={{ border: "1px solid #E0E6E2", borderRadius: "10px" }}
      >
        <div className="card-body p-4">
          <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
            <h1
              className="h3 fw-bold mb-0"
              style={{ color: "#006B3C" }}
            >
              {ticket.ticketNumber}
            </h1>
            <StatusBadge status={ticket.currentStatus} />
          </div>

          <div className="row">
            <div className="col-12 col-md-6">
              <ReadOnlyField
                label="Ticket Date"
                value={formatDate(ticket.createdAt)}
              />
            </div>
            <div className="col-12 col-md-6">
              <ReadOnlyField
                label="Category"
                value={ticket.category?.name ?? "-"}
              />
            </div>
            <div className="col-12 col-md-6">
              <ReadOnlyField
                label="Related System"
                value={ticket.relatedSystem?.name ?? "-"}
              />
            </div>
            <div className="col-12 col-md-6">
              <ReadOnlyField
                label="Requested Priority"
                value={<PriorityBadge priority={ticket.requestedPriority} />}
              />
            </div>
          </div>

          <ReadOnlyField label="Summary" value={ticket.summary} />

          <div className="mb-1">
            <div className="small fw-semibold mb-1" style={{ color: "#5A6E65" }}>
              Description
            </div>
            <div
              className="px-3 py-2"
              style={{
                backgroundColor: "#F5F7F6",
                border: "1px solid #E0E6E2",
                borderRadius: "8px",
                color: "#1A2E26",
                minHeight: "80px",
                whiteSpace: "pre-wrap",
              }}
            >
              {ticket.description}
            </div>
          </div>
        </div>
      </div>

      {/* Attachments Section */}
      <div
        className="card"
        style={{ border: "1px solid #E0E6E2", borderRadius: "10px" }}
      >
        <div className="card-body p-4">
          <h2 className="h5 fw-bold mb-3" style={{ color: "#1A2E26" }}>
            Attachments ({activeAttachments.length})
          </h2>

          {actionError && (
            <div className="alert alert-danger py-2" role="alert">
              {actionError}
            </div>
          )}

          {activeAttachments.length === 0 ? (
            <p className="text-muted mb-3">No active attachments.</p>
          ) : (
            <ul className="list-group mb-3">
              {activeAttachments.map((attachment) => (
                <li
                  key={attachment.id}
                  className="list-group-item d-flex justify-content-between align-items-center flex-wrap gap-2"
                >
                  <div>
                    <div className="fw-semibold" style={{ color: "#1A2E26" }}>
                      {attachment.fileName}
                    </div>
                    <div className="small text-muted">
                      {formatFileSize(attachment.fileSize)} &middot;{" "}
                      {formatDate(attachment.createdAt)}
                    </div>
                  </div>
                  <div className="d-flex gap-2">
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
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      disabled={removingId === attachment.id}
                      onClick={() => handleRemove(attachment)}
                    >
                      {removingId === attachment.id ? "Removing..." : "Remove"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {removedAttachments.length > 0 && (
            <div className="mb-3">
              <div className="small fw-semibold mb-2" style={{ color: "#5A6E65" }}>
                Removed Attachments
              </div>
              {removedAttachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="removed-attachment-item d-flex justify-content-between align-items-center flex-wrap gap-2 px-3 py-2 mb-2"
                  style={{
                    backgroundColor: "#F5F7F6",
                    border: "1px solid #E0E6E2",
                    borderRadius: "8px",
                  }}
                >
                  <div>
                    <div className="fw-semibold text-decoration-line-through" style={{ color: "#5A6E65" }}>
                      {attachment.fileName}
                    </div>
                    <div className="small text-muted">
                      Removed {formatDate(attachment.removedAt ?? undefined)}
                      {attachment.removedReason
                        ? ` — ${attachment.removedReason}`
                        : ""}
                    </div>
                  </div>
                  <span className="badge bg-secondary">Unavailable</span>
                </div>
              ))}
            </div>
          )}

          <hr />

          <div>
            <label
              htmlFor="attachment-input"
              className="form-label fw-semibold"
              style={{ color: "#1A2E26" }}
            >
              Add Attachment
            </label>
            <input
              id="attachment-input"
              type="file"
              className="form-control mb-2"
              multiple
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              onChange={(e) =>
                setPendingFiles(Array.from(e.target.files ?? []))
              }
            />
            <div className="form-text mb-2">
              JPG, JPEG, PNG, WEBP, or PDF. Maximum 5 MB per file, up to 5
              active attachments per ticket.
            </div>

            {uploadError && (
              <div className="alert alert-danger py-2" role="alert">
                {uploadError}
              </div>
            )}

            <button
              type="button"
              className="btn"
              disabled={pendingFiles.length === 0 || uploading}
              onClick={handleAddAttachments}
              style={{
                backgroundColor: "#006B3C",
                color: "#FFFFFF",
                border: "none",
              }}
            >
              {uploading ? "Uploading..." : "Add Attachments"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
