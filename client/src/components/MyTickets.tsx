import { useEffect, useState } from "react";
import {
  getMyTickets,
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
  const [requestedPriority, setRequestedPriority] =
    useState<RequestedPriority | undefined>();
  const [itPriority, setItPriority] =
    useState<RequestedPriority | undefined>();
  const [status, setStatus] = useState<CurrentStatus | undefined>();

  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [categories, setCategories] = useState<Category[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load categories
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

  // Reload tickets whenever requester or filters change
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
          priority: requestedPriority,
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
    requestedPriority,
    itPriority,
    status,
    sortBy,
    sortOrder,
    meta.page,
    meta.pageSize,
  ]);

  function clearFilters() {
    setSearch("");
    setCategoryId(undefined);
    setRequestedPriority(undefined);
    setItPriority(undefined);
    setStatus(undefined);
    setSortBy("createdAt");
    setSortOrder("desc");

    setMeta((previous) => ({
      ...previous,
      page: 1,
    }));
  }

  function changePage(page: number) {
    if (page < 1 || page > meta.totalPages || page === meta.page) {
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

  // Returns a truncated list of page numbers (with "ellipsis" markers)
  // instead of rendering a button for every page. This prevents the
  // pagination control from overflowing the page width when there are
  // many pages (e.g. 62 pages for 613 tickets).
  function getPageNumbers(
    current: number,
    total: number
  ): (number | "ellipsis")[] {
    if (total <= 1) return total === 1 ? [1] : [];

    const delta = 1; // pages to show on each side of the current page
    const left = Math.max(2, current - delta);
    const right = Math.min(total - 1, current + delta);

    const range: (number | "ellipsis")[] = [1];

    if (left > 2) {
      range.push("ellipsis");
    }

    for (let i = left; i <= right; i++) {
      range.push(i);
    }

    if (right < total - 1) {
      range.push("ellipsis");
    }

    range.push(total);

    return range;
  }

  // Helper for rendering priority badges
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

  // Helper for rendering status badges
  function renderStatusBadge(statusStr: string) {
    const styles: Record<string, { bg: string; color: string; label: string }> = {
      NEW: { bg: "#E0F2FE", color: "#0369A1", label: "Open" },
      IN_PROGRESS: { bg: "#DCFCE7", color: "#15803D", label: "In Progress" },
      PENDING: { bg: "#FEF3C7", color: "#B45309", label: "Pending" },
      RESOLVED: { bg: "#DCFCE7", color: "#15803D", label: "Resolved" },
      CLOSED: { bg: "#EEF2F0", color: "#5A6E65", label: "Closed" },
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

  if (!currentRequester) {
    return (
      <div
        className="alert mb-4"
        style={{
          color: "#D97706",
          backgroundColor: "#FEF3C7",
          border: "1px solid #FCD34D",
          borderRadius: "8px",
        }}
      >
        Please select a Development Requester first.
      </div>
    );
  }

  return (
    <div className="py-3">
      {/* Header Section & Action Bar */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1" style={{ color: "#1A2E26" }}>
            My Tickets
          </h1>
          <p className="mb-0" style={{ color: "#5A6E65" }}>
            View and track all of your support requests.
          </p>
        </div>

        <div className="d-flex gap-2 align-self-start align-self-md-auto">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={clearFilters}
            style={{
              borderColor: "#C8D4CE",
              color: "#1A2E26",
              backgroundColor: "#FFFFFF",
            }}
          >
            ↻ Clear Filters
          </button>

          <button
            type="button"
            className="btn"
            onClick={onCreateTicket}
            style={{
              backgroundColor: "#006B3C",
              color: "#FFFFFF",
              border: "none",
            }}
          >
            + Create Ticket
          </button>
        </div>
      </div>

      {/* Search & Filters Panel */}
      <div
        className="card mb-4"
        style={{
          border: "1px solid #E0E6E2",
          borderRadius: "10px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
        }}
      >
        <div className="card-body p-3 p-md-4">
          <div className="row g-3">
            {/* Search Input */}
            <div className="col-12">
              <label htmlFor="search-input" className="form-label fw-semibold" style={{ color: "#1A2E26" }}>
                Search
              </label>
              <input
                id="search-input"
                type="search"
                className="form-control"
                placeholder="Search by ticket number or summary..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setMeta((previous) => ({ ...previous, page: 1 }));
                }}
                style={{
                  borderColor: "#C8D4CE",
                  minHeight: "44px",
                }}
              />
            </div>

            {/* Filter: Category */}
            <div className="col-12 col-sm-6 col-md-3">
              <label htmlFor="category-select" className="form-label fw-semibold" style={{ color: "#1A2E26" }}>
                Category
              </label>
              <select
                id="category-select"
                className="form-select"
                value={categoryId ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  setCategoryId(value ? Number(value) : undefined);
                  setMeta((previous) => ({ ...previous, page: 1 }));
                }}
                style={{ borderColor: "#C8D4CE" }}
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter: Requested Priority */}
            <div className="col-12 col-sm-6 col-md-3">
              <label htmlFor="priority-select" className="form-label fw-semibold" style={{ color: "#1A2E26" }}>
                Requested Priority
              </label>
              <select
                id="priority-select"
                className="form-select"
                value={requestedPriority ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  setRequestedPriority(value ? (value as RequestedPriority) : undefined);
                  setMeta((previous) => ({ ...previous, page: 1 }));
                }}
                style={{ borderColor: "#C8D4CE" }}
              >
                <option value="">All Requested Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>

            {/* Filter: IT Priority */}
            <div className="col-12 col-sm-6 col-md-3">
              <label htmlFor="it-priority-select" className="form-label fw-semibold" style={{ color: "#1A2E26" }}>
                IT Priority
              </label>
              <select
                id="it-priority-select"
                className="form-select"
                value={itPriority ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  setItPriority(value ? (value as RequestedPriority) : undefined);
                  setMeta((previous) => ({ ...previous, page: 1 }));
                }}
                style={{ borderColor: "#C8D4CE" }}
              >
                <option value="">All IT Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>

            {/* Filter: Current Status */}
            <div className="col-12 col-sm-6 col-md-3">
              <label htmlFor="status-select" className="form-label fw-semibold" style={{ color: "#1A2E26" }}>
                Current Status
              </label>
              <select
                id="status-select"
                className="form-select"
                value={status ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  setStatus(value ? (value as CurrentStatus) : undefined);
                  setMeta((previous) => ({ ...previous, page: 1 }));
                }}
                style={{ borderColor: "#C8D4CE" }}
              >
                <option value="">All Statuses</option>
                <option value="NEW">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="PENDING">Pending</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            {/* Sort Options */}
            <div className="col-12 col-md-6">
              <label htmlFor="sort-by-select" className="form-label fw-semibold" style={{ color: "#1A2E26" }}>
                Sort By
              </label>
              <select
                id="sort-by-select"
                className="form-select"
                value={sortBy}
                onChange={(event) => {
                  setSortBy(event.target.value);
                  setMeta((previous) => ({ ...previous, page: 1 }));
                }}
                style={{ borderColor: "#C8D4CE" }}
              >
                <option value="createdAt">Created Date</option>
                <option value="updatedAt">Last Updated</option>
                <option value="ticketNumber">Ticket Number</option>
                <option value="summary">Summary</option>
              </select>
            </div>

            <div className="col-12 col-md-6">
              <label htmlFor="sort-order-select" className="form-label fw-semibold" style={{ color: "#1A2E26" }}>
                Order
              </label>
              <select
                id="sort-order-select"
                className="form-select"
                value={sortOrder}
                onChange={(event) => {
                  setSortOrder(event.target.value as "asc" | "desc");
                  setMeta((previous) => ({ ...previous, page: 1 }));
                }}
                style={{ borderColor: "#C8D4CE" }}
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          className="alert mb-4"
          style={{
            color: "#D32F2F",
            backgroundColor: "#FDE8E8",
            border: "1px solid #D32F2F",
          }}
        >
          {error}
        </div>
      )}

      {/* Loading Spinner */}
      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border" style={{ color: "#006B3C" }} role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && meta.total === 0 && (
        <div
          className="card text-center"
          style={{
            border: "1px solid #E0E6E2",
            borderRadius: "10px",
          }}
        >
          <div className="card-body py-5">
            <h2 className="h5 fw-bold" style={{ color: "#1A2E26" }}>
              You haven't submitted any IT support tickets yet.
            </h2>
            <p style={{ color: "#5A6E65" }}>
              Create your first ticket to request IT support.
            </p>
            <button
              type="button"
              className="btn px-4"
              onClick={onCreateTicket}
              style={{
                backgroundColor: "#006B3C",
                color: "#FFFFFF",
                border: "none",
              }}
            >
              + Create Ticket
            </button>
          </div>
        </div>
      )}

      {/* No-Results State (filters/search matched zero tickets) */}
      {!loading && !error && meta.total > 0 && tickets.length === 0 && (
        <div
          className="card text-center"
          style={{
            border: "1px solid #E0E6E2",
            borderRadius: "10px",
          }}
        >
          <div className="card-body py-5">
            <h2 className="h5 fw-bold" style={{ color: "#1A2E26" }}>
              No tickets match your search or filters.
            </h2>
            <p style={{ color: "#5A6E65" }}>
              Try adjusting your search term or filters.
            </p>
            <button
              type="button"
              className="btn px-4"
              onClick={clearFilters}
              style={{
                backgroundColor: "#006B3C",
                color: "#FFFFFF",
                border: "none",
              }}
            >
              ↻ Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Main Tickets List */}
      {!loading && !error && tickets.length > 0 && (
        <>
          {/*
            Single responsive table: on md+ widths this renders as a normal
            data table; below 768px, client/src/index.css turns the same
            <tbody><tr><td> elements into a stacked card layout (see
            .responsive-ticket-table). Only one set of ticket rows ever
            exists in the DOM, so there is no risk of duplicate or
            hidden-but-matching elements across viewport sizes.
          */}
          <div
            className="responsive-ticket-table table-responsive"
            style={{
              border: "1px solid #E0E6E2",
              borderRadius: "10px",
              backgroundColor: "#FFFFFF",
            }}
          >
            <table className="table table-hover align-middle mb-0" style={{ minWidth: "1150px" }}>
              <thead>
                <tr style={{ backgroundColor: "#F5F7F6" }}>
                  <th style={{ color: "#1A2E26", minWidth: "160px", whiteSpace: "nowrap" }}>
                    Ticket No.
                  </th>
                  <th style={{ color: "#1A2E26", minWidth: "160px", whiteSpace: "nowrap" }}>
                    Created Date
                  </th>
                  <th style={{ color: "#1A2E26" }}>Summary</th>
                  <th style={{ color: "#1A2E26" }}>Category</th>
                  <th style={{ color: "#1A2E26" }}>Requested Priority</th>
                  <th style={{ color: "#1A2E26" }}>IT Priority</th>
                  <th style={{ color: "#1A2E26" }}>Current Status</th>
                  <th style={{ color: "#1A2E26" }}>Ticket Owner</th>
                  <th style={{ color: "#1A2E26", minWidth: "160px", whiteSpace: "nowrap" }}>
                    Last Updated
                  </th>
                </tr>
              </thead>

              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td data-label="Ticket No." style={{ whiteSpace: "nowrap" }}>
                      <button
                        type="button"
                        className="btn btn-link p-0 fw-semibold text-nowrap"
                        onClick={() => onOpenTicket?.(ticket.id)}
                        style={{
                          color: "#006B3C",
                          textDecoration: "none",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {ticket.ticketNumber}
                      </button>
                    </td>
                    <td
                      data-label="Created Date"
                      className="small text-nowrap"
                      style={{ color: "#5A6E65", whiteSpace: "nowrap" }}
                    >
                      {formatDate(ticket.createdAt)}
                    </td>
                    <td data-label="Summary" style={{ color: "#1A2E26" }}>
                      {ticket.summary}
                    </td>
                    <td data-label="Category" style={{ color: "#1A2E26" }}>
                      {ticket.categoryName}
                    </td>
                    <td data-label="Requested Priority">
                      {renderPriorityBadge(ticket.requestedPriority)}
                    </td>
                    <td data-label="IT Priority">
                      {renderPriorityBadge((ticket as any).itPriority)}
                    </td>
                    <td data-label="Current Status">
                      {renderStatusBadge(ticket.currentStatus)}
                    </td>
                    <td data-label="Ticket Owner" className="small" style={{ color: "#1A2E26" }}>
                      {(ticket as any).assignedToName || (ticket as any).ownerName || "Unassigned"}
                    </td>
                    <td
                      data-label="Last Updated"
                      className="small text-nowrap"
                      style={{ color: "#5A6E65", whiteSpace: "nowrap" }}
                    >
                      {formatDate(ticket.lastUpdated)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Section */}
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3 mt-4">
            <span className="small" style={{ color: "#5A6E65" }}>
              Showing {Math.min((meta.page - 1) * meta.pageSize + 1, meta.total)} to{" "}
              {Math.min(meta.page * meta.pageSize, meta.total)} of {meta.total} tickets
            </span>

            <nav aria-label="Ticket pagination">
              <ul
                className="pagination mb-0 flex-wrap justify-content-center"
                style={{ rowGap: "0.5rem" }}
              >
                <li className={`page-item ${meta.page === 1 ? "disabled" : ""}`}>
                  <button
                    className="page-link"
                    onClick={() => changePage(meta.page - 1)}
                    disabled={meta.page === 1}
                    style={{ color: meta.page === 1 ? "#A0AEA7" : "#006B3C" }}
                  >
                    &lt; Previous
                  </button>
                </li>

                {getPageNumbers(meta.page, meta.totalPages).map((page, index) =>
                  page === "ellipsis" ? (
                    <li
                      key={`ellipsis-${index}`}
                      className="page-item disabled"
                      aria-hidden="true"
                    >
                      <span
                        className="page-link"
                        style={{
                          border: "none",
                          backgroundColor: "transparent",
                          color: "#5A6E65",
                        }}
                      >
                        …
                      </span>
                    </li>
                  ) : (
                    <li key={page} className="page-item">
                      <button
                        className="page-link"
                        onClick={() => changePage(page)}
                        aria-current={page === meta.page ? "page" : undefined}
                        style={{
                          backgroundColor:
                            page === meta.page ? "#006B3C" : "#FFFFFF",
                          color: page === meta.page ? "#FFFFFF" : "#006B3C",
                          borderColor:
                            page === meta.page ? "#006B3C" : "#DEE2E6",
                          fontWeight: page === meta.page ? 600 : 400,
                        }}
                      >
                        {page}
                      </button>
                    </li>
                  )
                )}

                <li
                  className={`page-item ${
                    meta.page === meta.totalPages ? "disabled" : ""
                  }`}
                >
                  <button
                    className="page-link"
                    onClick={() => changePage(meta.page + 1)}
                    disabled={meta.page === meta.totalPages}
                    style={{
                      color: meta.page === meta.totalPages ? "#A0AEA7" : "#006B3C",
                    }}
                  >
                    Next &gt;
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
