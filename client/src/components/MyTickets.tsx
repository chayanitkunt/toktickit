import { useEffect, useState } from "react";
import {
  getMyTickets,
  getRequesters,
  type Category,
  type CurrentStatus,
  type RequestedPriority,
  type TicketListItem,
  type TicketListMeta,
} from "../api";
import { useDevelopmentRequester } from "../DevelopmentRequesterContext";

interface MyTicketsProps {
  onCreateTicket?: () => void;
  onOpenTicket?: (ticketId: number) => void;
}

export default function MyTickets({
  onCreateTicket,
  onOpenTicket,
}: MyTicketsProps) {
  const { currentRequester } = useDevelopmentRequester();

  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [meta, setMeta] = useState<TicketListMeta>({
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0,
  });

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [priority, setPriority] =
    useState<RequestedPriority | undefined>();
  const [status, setStatus] =
    useState<CurrentStatus | undefined>();

  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] =
    useState<"asc" | "desc">("desc");

  const [categories, setCategories] = useState<Category[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load categories for the filter dropdown.
  useEffect(() => {
    async function loadCategories() {
      try {
        const response = await fetch(
          `${
            import.meta.env.VITE_API_URL ?? "http://localhost:3000"
          }/api/categories`
        );

        if (!response.ok) {
          throw new Error("Unable to retrieve categories");
        }

        const data: Category[] = await response.json();
        setCategories(data);
      } catch (err) {
        console.error(err);
      }
    }

    loadCategories();
  }, []);

  // Reload tickets whenever requester or filters change.
  useEffect(() => {
  if (!currentRequester) {
    setTickets([]);
    return;
  }

  const requesterId = currentRequester.id;

  async function loadTickets() {
    setLoading(true);
    setError("");

    try {
      const result = await getMyTickets({
        requesterId,
        search,
        categoryId,
        priority,
        status,
        sortBy,
        sortOrder,
        page: meta.page,
        pageSize: meta.pageSize,
      });

      setTickets(result.data);
      setMeta(result.meta);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to retrieve tickets"
      );
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }

  loadTickets();
}, [
  currentRequester,
  search,
  categoryId,
  priority,
  status,
  sortBy,
  sortOrder,
  meta.page,
  meta.pageSize,
]);

  function clearFilters() {
    setSearch("");
    setCategoryId(undefined);
    setPriority(undefined);
    setStatus(undefined);
    setSortBy("createdAt");
    setSortOrder("desc");
    setMeta((previous) => ({
      ...previous,
      page: 1,
    }));
  }

  function changePage(page: number) {
    if (
      page < 1 ||
      page > meta.totalPages ||
      page === meta.page
    ) {
      return;
    }

    setMeta((previous) => ({
      ...previous,
      page,
    }));
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString();
  }

  function priorityBadgeClass(priority: RequestedPriority) {
    switch (priority) {
      case "HIGH":
        return "badge text-bg-danger";
      case "MEDIUM":
        return "badge text-bg-warning";
      case "LOW":
        return "badge text-bg-success";
    }
  }

  function statusBadgeClass(status: CurrentStatus) {
    if (status === "NEW") {
      return "badge text-bg-info";
    }

    return "badge text-bg-secondary";
  }

  if (!currentRequester) {
    return (
      <div className="alert alert-warning">
        Please select a Development Requester first.
      </div>
    );
  }

  return (
    <div className="py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1">My Tickets</h1>
          <p className="text-muted mb-0">
            Tickets submitted by {currentRequester.name}
          </p>
        </div>

        <button
          type="button"
          className="btn btn-success"
          onClick={onCreateTicket}
        >
          + Create Ticket
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-12">
              <label className="form-label fw-semibold">
                Search
              </label>

              <input
                type="search"
                className="form-control"
                placeholder="Search by ticket number or summary..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setMeta((previous) => ({
                    ...previous,
                    page: 1,
                  }));
                }}
              />
            </div>

            <div className="col-md-4">
              <label className="form-label fw-semibold">
                Category
              </label>

              <select
                className="form-select"
                value={categoryId ?? ""}
                onChange={(event) => {
                  const value = event.target.value;

                  setCategoryId(
                    value ? Number(value) : undefined
                  );

                  setMeta((previous) => ({
                    ...previous,
                    page: 1,
                  }));
                }}
              >
                <option value="">All Categories</option>

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

            <div className="col-md-4">
              <label className="form-label fw-semibold">
                Requested Priority
              </label>

              <select
                className="form-select"
                value={priority ?? ""}
                onChange={(event) => {
                  const value = event.target.value;

                  setPriority(
                    value
                      ? (value as RequestedPriority)
                      : undefined
                  );

                  setMeta((previous) => ({
                    ...previous,
                    page: 1,
                  }));
                }}
              >
                <option value="">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label fw-semibold">
                Status
              </label>

              <select
                className="form-select"
                value={status ?? ""}
                onChange={(event) => {
                  const value = event.target.value;

                  setStatus(
                    value
                      ? (value as CurrentStatus)
                      : undefined
                  );

                  setMeta((previous) => ({
                    ...previous,
                    page: 1,
                  }));
                }}
              >
                <option value="">All Statuses</option>
                <option value="NEW">New</option>
                <option value="IN_PROGRESS">
                  In Progress
                </option>
                <option value="PENDING">Pending</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            <div className="col-md-6">
              <label className="form-label fw-semibold">
                Sort By
              </label>

              <select
                className="form-select"
                value={sortBy}
                onChange={(event) => {
                  setSortBy(event.target.value);
                  setMeta((previous) => ({
                    ...previous,
                    page: 1,
                  }));
                }}
              >
                <option value="createdAt">
                  Created Date
                </option>
                <option value="updatedAt">
                  Last Updated
                </option>
                <option value="ticketNumber">
                  Ticket Number
                </option>
                <option value="summary">Summary</option>
              </select>
            </div>

            <div className="col-md-6">
              <label className="form-label fw-semibold">
                Order
              </label>

              <select
                className="form-select"
                value={sortOrder}
                onChange={(event) => {
                  setSortOrder(
                    event.target.value as "asc" | "desc"
                  );

                  setMeta((previous) => ({
                    ...previous,
                    page: 1,
                  }));
                }}
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>

            <div className="col-12">
              <button
                type="button"
                className="btn btn-outline-success"
                onClick={clearFilters}
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-5">
          <div
            className="spinner-border text-success"
            role="status"
          >
            <span className="visually-hidden">
              Loading...
            </span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && meta.total === 0 && (
        <div className="card text-center">
          <div className="card-body py-5">
            <h2 className="h5">
              You haven't submitted any IT support tickets yet.
            </h2>

            <p className="text-muted">
              Create your first ticket to request IT support.
            </p>

            <button
              type="button"
              className="btn btn-success"
              onClick={onCreateTicket}
            >
              Create Ticket
            </button>
          </div>
        </div>
      )}

      {/* Ticket list */}
      {!loading && !error && meta.total > 0 && (
        <>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <span className="text-muted">
              Showing{" "}
              {Math.min(
                (meta.page - 1) * meta.pageSize + 1,
                meta.total
              )}{" "}
              to{" "}
              {Math.min(
                meta.page * meta.pageSize,
                meta.total
              )}{" "}
              of {meta.total} tickets
            </span>
          </div>

          {/* Desktop table */}
          <div className="table-responsive">
  <table
    className="table table-hover align-middle text-nowrap"
    style={{ minWidth: "1000px" }}
  >
              <thead>
                <tr>
                  <th>Ticket No.</th>
                  <th>Created Date</th>
                  <th>Summary</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                </tr>
              </thead>

              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td>
                      <button
                        type="button"
                        className="btn btn-link p-0"
                        onClick={() => onOpenTicket?.(ticket.id)}
                      >
                        {ticket.ticketNumber}
                      </button>
                    </td>

                    <td>
                      {formatDate(ticket.createdAt)}
                    </td>

                    <td>{ticket.summary}</td>

                    <td>{ticket.categoryName}</td>

                    <td>
                      <span
                        className={priorityBadgeClass(
                          ticket.requestedPriority
                        )}
                      >
                        {ticket.requestedPriority}
                      </span>
                    </td>

                    <td>
                      <span
                        className={statusBadgeClass(
                          ticket.currentStatus
                        )}
                      >
                        {ticket.currentStatus}
                      </span>
                    </td>

                    <td>
                      {formatDate(ticket.lastUpdated)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <nav
            aria-label="Ticket pagination"
            className="mt-4"
          >
            <ul className="pagination justify-content-center">
              <li
                className={`page-item ${
                  meta.page === 1 ? "disabled" : ""
                }`}
              >
                <button
                  className="page-link"
                  onClick={() =>
                    changePage(meta.page - 1)
                  }
                  disabled={meta.page === 1}
                >
                  Previous
                </button>
              </li>

              {Array.from(
                { length: meta.totalPages },
                (_, index) => index + 1
              ).map((page) => (
                <li
                  key={page}
                  className={`page-item ${
                    page === meta.page ? "active" : ""
                  }`}
                >
                  <button
                    className="page-link"
                    onClick={() => changePage(page)}
                  >
                    {page}
                  </button>
                </li>
              ))}

              <li
                className={`page-item ${
                  meta.page === meta.totalPages
                    ? "disabled"
                    : ""
                }`}
              >
                <button
                  className="page-link"
                  onClick={() =>
                    changePage(meta.page + 1)
                  }
                  disabled={
                    meta.page === meta.totalPages
                  }
                >
                  Next
                </button>
              </li>
            </ul>
          </nav>
        </>
      )}
    </div>
  );
}
