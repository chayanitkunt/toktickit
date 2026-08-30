import { useEffect, useState } from "react";
import {
  createTicket,
  type Category,
  type RequestedPriority,
} from "../api";
import { useDevelopmentRequester } from "../DevelopmentRequesterContext";

interface RelatedSystem {
  id: number;
  name: string;
}

interface CreateTicketProps {
  onCancel: () => void;
  onCreated: () => void;
}

export default function CreateTicket({
  onCancel,
  onCreated,
}: CreateTicketProps) {
  const { currentRequester } = useDevelopmentRequester();

  const [categories, setCategories] = useState<Category[]>([]);
  const [systems, setSystems] = useState<RelatedSystem[]>([]);

  const [categoryId, setCategoryId] = useState("");
  const [relatedSystemId, setRelatedSystemId] = useState("");
  const [priority, setPriority] =
    useState<RequestedPriority>("MEDIUM");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const API_URL =
          import.meta.env.VITE_API_URL ??
          "http://localhost:3000";

        const [categoriesResponse, systemsResponse] =
          await Promise.all([
            fetch(`${API_URL}/api/categories`),
            fetch(`${API_URL}/api/related-systems`),
          ]);

        if (!categoriesResponse.ok) {
          throw new Error("Unable to retrieve categories");
        }

        if (!systemsResponse.ok) {
          throw new Error(
            "Unable to retrieve related systems"
          );
        }

        const categoryData: Category[] =
          await categoriesResponse.json();

        const systemData: RelatedSystem[] =
          await systemsResponse.json();

        setCategories(categoryData);
        setSystems(systemData);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load ticket form"
        );
      }
    }

    loadData();
  }, []);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!currentRequester) {
      setError("Please select a requester first.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await createTicket(currentRequester.id, {
        categoryId: Number(categoryId),
        relatedSystemId: Number(relatedSystemId),
        requestedPriority: priority,
        summary,
        description,
        attachments,
      });

      onCreated();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create ticket"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1">Create Ticket</h1>
          <p className="text-muted mb-0">
            Submit an IT support request
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="card-body">
            <div className="mb-3">
              <label className="form-label fw-semibold">
                Category
              </label>

              <select
                className="form-select"
                value={categoryId}
                onChange={(event) =>
                  setCategoryId(event.target.value)
                }
                required
              >
                <option value="">
                  Select a category
                </option>

                {categories.map((category) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">
                Related System
              </label>

              <select
                className="form-select"
                value={relatedSystemId}
                onChange={(event) =>
                  setRelatedSystemId(event.target.value)
                }
                required
              >
                <option value="">
                  Select a related system
                </option>

                {systems.map((system) => (
                  <option
                    key={system.id}
                    value={system.id}
                  >
                    {system.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">
                Requested Priority
              </label>

              <select
                className="form-select"
                value={priority}
                onChange={(event) =>
                  setPriority(
                    event.target.value as RequestedPriority
                  )
                }
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">
                Summary
              </label>

              <input
                type="text"
                className="form-control"
                value={summary}
                onChange={(event) =>
                  setSummary(event.target.value)
                }
                minLength={10}
                maxLength={150}
                required
              />

              <div className="form-text">
                10–150 characters
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">
                Description
              </label>

              <textarea
                className="form-control"
                rows={6}
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                minLength={20}
                maxLength={2000}
                required
              />

              <div className="form-text">
                20–2000 characters
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label fw-semibold">
                Attachments
              </label>

              <input
                type="file"
                className="form-control"
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                multiple
                onChange={(event) => {
                  const files = Array.from(
                    event.target.files ?? []
                  );

                  setAttachments(files.slice(0, 5));
                }}
              />

              <div className="form-text">
                JPG, JPEG, PNG, WEBP, or PDF. Maximum 5 files.
              </div>
            </div>

            <div className="d-flex gap-2">
              <button
                type="submit"
                className="btn btn-success"
                disabled={loading}
              >
                {loading
                  ? "Creating..."
                  : "Create Ticket"}
              </button>

              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}