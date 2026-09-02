import { useEffect, useState } from "react";
import * as api from "../api";
import type { Category, RelatedSystem, RequestedPriority } from "../api";

interface CreateTicketProps {
  requesterId: number;
  onCreated?: () => void;
  onSuccess?: () => void;
  onCancel: () => void;
}

export default function CreateTicket({
  requesterId,
  onCreated,
  onSuccess,
  onCancel,
}: CreateTicketProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [systems, setSystems] = useState<RelatedSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdTicketNumber, setCreatedTicketNumber] = useState<
    string | null
  >(null);

  // Form State
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [relatedSystemId, setRelatedSystemId] = useState<number | "">("");
  const [priority, setPriority] = useState<RequestedPriority>("MEDIUM");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  // Validation Errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let isMounted = true;

    async function loadFormData() {
      try {
        setLoading(true);
        setError("");

        const [cats, sysList] = await Promise.all([
          api.getCategories(),
          api.getRelatedSystems(),
        ]);

        if (isMounted) {
          setCategories(cats);
          setSystems(sysList);
        }
      } catch (err) {
        if (isMounted) {
          setError("Failed to load options");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadFormData();
    return () => {
      isMounted = false;
    };
  }, []);

  const validate = () => {
    const errors: Record<string, string> = {};

    if (!categoryId) errors.category = "Please select a category.";
    if (!relatedSystemId) errors.system = "Please select a related system.";
    if (!summary.trim()) {
      errors.summary = "Summary is required.";
    }
    if (!description.trim()) {
      errors.description = "Description is required.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSubmitting(true);
      setError("");
      const created = await api.createTicket(requesterId, {
        categoryId: Number(categoryId),
        relatedSystemId: Number(relatedSystemId),
        requestedPriority: priority,
        summary,
        description,
        attachments: files,
      });
      setCreatedTicketNumber(created.ticketNumber ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create ticket");
    } finally {
      setSubmitting(false);
    }
  };

  if (createdTicketNumber) {
    return (
      <div
        className="card my-4"
        style={{
          border: "1px solid #0B7A46",
          borderRadius: "10px",
          backgroundColor: "#EAF6EF",
        }}
      >
        <div className="card-body p-4 text-center">
          <h2 className="h4 fw-bold mb-2" style={{ color: "#1A2E26" }}>
            Ticket Created
          </h2>
          <p className="mb-1" style={{ color: "#5A6E65" }}>
            Your ticket number is
          </p>
          <p
            className="h3 fw-bold mb-4"
            style={{ color: "#006B3C" }}
          >
            {createdTicketNumber}
          </p>
          <button
            type="button"
            className="btn"
            style={{
              backgroundColor: "#006B3C",
              color: "#FFFFFF",
              border: "none",
            }}
            onClick={() => {
              if (onCreated) onCreated();
              if (onSuccess) onSuccess();
            }}
          >
            Go to My Tickets
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className="card my-4"
        style={{ border: "1px solid #E0E6E2", borderRadius: "10px" }}
      >
        <div className="card-body p-4 text-center">
          <div
            className="spinner-border text-success me-2"
            role="status"
            style={{ color: "#006B3C" }}
          >
            <span className="visually-hidden">Loading...</span>
          </div>
          <span style={{ color: "#1A2E26" }}>Loading ticket form...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="py-3">
      <div className="mb-4">
        <h1 className="h3 fw-bold mb-1" style={{ color: "#1A2E26" }}>
          Create Ticket
        </h1>
        <p style={{ color: "#5A6E65" }}>Submit an IT support request</p>
      </div>

      {error && (
        <div className="alert alert-danger mb-4" role="alert">
          {error}
        </div>
      )}

      <div
        className="card"
        style={{
          border: "1px solid #E0E6E2",
          borderRadius: "10px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
        }}
      >
        <div className="card-body p-4">
          <form onSubmit={handleSubmit} noValidate>
            {/* Category */}
            <div className="mb-3">
              <label className="form-label fw-semibold" style={{ color: "#1A2E26" }}>
                Category
              </label>
              <select
                className={`form-select ${fieldErrors.category ? "is-invalid" : ""}`}
                value={categoryId}
                onChange={(e) =>
                  setCategoryId(e.target.value ? Number(e.target.value) : "")
                }
              >
                <option value="">Select a category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {fieldErrors.category && (
                <div className="invalid-feedback">{fieldErrors.category}</div>
              )}
            </div>

            {/* Related System */}
            <div className="mb-3">
              <label className="form-label fw-semibold" style={{ color: "#1A2E26" }}>
                Related System
              </label>
              <select
                className={`form-select ${fieldErrors.system ? "is-invalid" : ""}`}
                value={relatedSystemId}
                onChange={(e) =>
                  setRelatedSystemId(e.target.value ? Number(e.target.value) : "")
                }
              >
                <option value="">Select a related system</option>
                {systems.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {fieldErrors.system && (
                <div className="invalid-feedback">{fieldErrors.system}</div>
              )}
            </div>

            {/* Requested Priority */}
            <div className="mb-3">
              <label className="form-label fw-semibold" style={{ color: "#1A2E26" }}>
                Requested Priority
              </label>
              <select
                className="form-select"
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as RequestedPriority)
                }
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>

            {/* Summary */}
            <div className="mb-3">
              <label className="form-label fw-semibold" style={{ color: "#1A2E26" }}>
                Summary
              </label>
              <input
                type="text"
                className={`form-control ${fieldErrors.summary ? "is-invalid" : ""}`}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
              {fieldErrors.summary && (
                <div className="invalid-feedback">{fieldErrors.summary}</div>
              )}
              <div className="form-text">10–150 characters ({summary.length}/150)</div>
            </div>

            {/* Description */}
            <div className="mb-3">
              <label className="form-label fw-semibold" style={{ color: "#1A2E26" }}>
                Description
              </label>
              <textarea
                rows={5}
                className={`form-control ${fieldErrors.description ? "is-invalid" : ""}`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              {fieldErrors.description && (
                <div className="invalid-feedback">{fieldErrors.description}</div>
              )}
              <div className="form-text">
                20–2000 characters ({description.length}/2000)
              </div>
            </div>

            {/* Attachments */}
            <div className="mb-4">
              <label className="form-label fw-semibold" style={{ color: "#1A2E26" }}>
                Attachments
              </label>
              <input
                type="file"
                className="form-control"
                multiple
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              />
              <div className="form-text">
                JPG, JPEG, PNG, WEBP, or PDF. Maximum 5 files.
              </div>
            </div>

            {/* Buttons */}
            <div className="d-flex gap-2">
              <button
                type="submit"
                className="btn"
                disabled={submitting}
                style={{
                  backgroundColor: "#006B3C",
                  color: "#FFFFFF",
                  border: "none",
                }}
              >
                {submitting ? "Creating..." : "Create Ticket"}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={onCancel}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
