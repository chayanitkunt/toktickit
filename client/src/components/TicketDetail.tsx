import { useEffect, useState } from "react";
import {
  addAttachments,
  downloadAttachment,
  getTicketDetail,
  removeAttachment,
  type TicketDetail as TicketDetailType,
} from "../api";

interface TicketDetailProps {
  requesterId: number;
  ticketId: number;
  onBack: () => void;
}

function formatDate(date: string) {
  return new Date(date).toLocaleString();
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TicketDetail({
  requesterId,
  ticketId,
  onBack,
}: TicketDetailProps) {
  const [ticket, setTicket] =
    useState<TicketDetailType | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedFiles, setSelectedFiles] =
    useState<File[]>([]);

  const [uploading, setUploading] = useState(false);

  const [removingId, setRemovingId] =
    useState<number | null>(null);

  const loadTicket = async () => {
    try {
      setLoading(true);
      setError("");

      const result = await getTicketDetail(
        requesterId,
        ticketId
      );

      setTicket(result);
    } catch (err) {
        setTicket(null);
        setError(
            err instanceof Error
                ? err.message
                : "Unable to retrieve ticket"
        );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTicket();
  }, [requesterId, ticketId]);

  const handleDownloadAttachment = async (
  attachmentId: number,
  fileName: string
) => {
  try {
    setError("");

    const blob = await downloadAttachment(
      requesterId,
      ticketId,
      attachmentId
    );

    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(url);
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Unable to download attachment"
    );
  }
};

  const handleAddAttachments = async () => {
    if (selectedFiles.length === 0) {
      return;
    }

    try {
      setUploading(true);
      setError("");

      await addAttachments(
        requesterId,
        ticketId,
        selectedFiles
      );

      setSelectedFiles([]);
      await loadTicket();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to add attachments"
      );
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAttachment = async (
    attachmentId: number
  ) => {
    const reason = window.prompt(
      "Please enter a reason for removing this attachment:"
    );

    if (reason === null) {
      return;
    }

    if (!reason.trim()) {
      window.alert("Removal reason is required.");
      return;
    }

    try {
      setRemovingId(attachmentId);
      setError("");

      await removeAttachment(
        requesterId,
        ticketId,
        attachmentId,
        reason
      );

      await loadTicket();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to remove attachment"
      );
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="container py-4">
        <p>Loading ticket...</p>
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <div className="container py-4">
        <button
          className="btn btn-outline-secondary mb-3"
          onClick={onBack}
        >
          ← Back to My Tickets
        </button>

        <div className="alert alert-danger">
          {error}
        </div>
      </div>
    );
  }

  if (!ticket) {
    return null;
  }

  return (
    <div className="container py-4">
      <button
        className="btn btn-outline-secondary mb-4"
        onClick={onBack}
      >
        ← Back to My Tickets
      </button>

      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h2 className="mb-1">{ticket.ticketNumber}</h2>
          <p className="text-muted mb-0">
            Created {formatDate(ticket.createdAt)}
          </p>
        </div>

        <span className="badge bg-success fs-6">
          {ticket.currentStatus}
        </span>
      </div>

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      <div className="card mb-4">
        <div className="card-body">
          <h4 className="card-title mb-4">
            Ticket Information
          </h4>

          <div className="row g-3">
            <div className="col-md-6">
              <strong>Summary</strong>
              <p>{ticket.summary}</p>
            </div>

            <div className="col-md-3">
              <strong>Category</strong>
              <p>{ticket.category.name}</p>
            </div>

            <div className="col-md-3">
              <strong>Priority</strong>
              <p>{ticket.requestedPriority}</p>
            </div>

            <div className="col-md-6">
              <strong>Related System</strong>
              <p>{ticket.relatedSystem.name}</p>
            </div>

            <div className="col-12">
              <strong>Description</strong>
              <p className="mb-0">
                {ticket.description}
              </p>
            </div>

            <div className="col-12">
              <strong>Last Updated</strong>
              <p className="mb-0">
                {formatDate(ticket.updatedAt)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h4 className="card-title mb-3">
            Attachments ({ticket.attachments.length})
          </h4>

          {ticket.attachments.length === 0 ? (
            <p className="text-muted">
              No active attachments.
            </p>
          ) : (
            <div className="list-group mb-4">
              {ticket.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="list-group-item d-flex justify-content-between align-items-center"
                >
                  <div>
                    <strong>
                      {attachment.fileName}
                    </strong>

                    <div className="text-muted small">
                      {attachment.mimeType} ·{" "}
                      {formatFileSize(
                        attachment.fileSize
                      )}
                    </div>
                  </div>

                  <div className="d-flex gap-2">
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() =>
                            handleDownloadAttachment(
                                attachment.id,
                                attachment.fileName
                            )
                        }
                    >
                        Download
                </button>

                    <button
                      className="btn btn-sm btn-outline-danger"
                      disabled={
                        removingId === attachment.id
                      }
                      onClick={() =>
                        handleRemoveAttachment(
                          attachment.id
                        )
                      }
                    >
                      {removingId === attachment.id
                        ? "Removing..."
                        : "Remove"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <hr />

          <h5>Add Attachments</h5>

          <p className="text-muted small">
            JPG, JPEG, PNG, WEBP, or PDF. Maximum 5 active
            attachments per ticket.
          </p>

          <input
            type="file"
            className="form-control mb-3"
            multiple
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            onChange={(event) => {
              setSelectedFiles(
                Array.from(event.target.files ?? [])
              );
            }}
          />

          {selectedFiles.length > 0 && (
            <p className="small">
              {selectedFiles.length} file(s) selected
            </p>
          )}

          <button
            className="btn btn-success"
            disabled={
              uploading || selectedFiles.length === 0
            }
            onClick={handleAddAttachments}
          >
            {uploading
              ? "Uploading..."
              : "Add Attachments"}
          </button>
        </div>
      </div>
    </div>
  );
}
