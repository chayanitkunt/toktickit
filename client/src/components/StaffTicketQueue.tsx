import { useEffect, useState } from "react";
import {
  getStaffTicketQueue,
  type Category,
  type CurrentStatus,
  type RequestedPriority,
  type StaffQueueSortField,
  type StaffTicketListItem,
  type TicketListMeta,
} from "../api";

interface StaffTicketQueueProps {
  onOpenTicket?: (ticketId: number) => void;
}

type OwnerFilter = "me" | "unassigned" | "all";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export default function StaffTicketQueue({
  onOpenTicket,
}: StaffTicketQueueProps) {
  const [tickets, setTickets] = useState<StaffTicketListItem[]>([]);
  const [meta, setMeta] = useState<TicketListMeta>({
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0,
  });

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CurrentStatus | undefined>();
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [requestedPriority, setRequestedPriority] =
    useState<RequestedPriority | undefined>();
  const [itPriority, setItPriority] =
    useState<RequestedPriority | undefined>();
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>("all");

  const [sortBy, setSortBy] = useState<StaffQueueSortField>("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [categories, setCategories] = useState<Category[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);

  // Load categories for the Category filter dropdown.
  useEffect(() => {
    async function loadCategories() {
      try {
        const response = await fetch(`${API_URL}/api/categories`);

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

  // Reload the queue whenever search/filter/sort/page changes. Any Ticket
  // regardless of owner may appear here — this is the shared team queue,
  // not "my tickets" (FR-09/FR-10).
  useEffect(() => {
    async function loadQueue() {
      setLoading(true);
      setError("");
      setForbidden(false);

      try {
        const result = await getStaffTicketQueue({
          q: search,
          status,
          categoryId,
          requestedPriority,
          priority: itPriority,
          ownerId: ownerFilter === "all" ? undefined : ownerFilter,
          sort: sortBy,
          dir: sortOrder,
          page: meta.page,
          pageSize: meta.pageSize,
        });

        setTickets(result.data);
        setMeta(result.meta);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unable to retrieve the ticket queue";

        if (
          message.toLowerCase().includes("permission") ||
          message.toLowerCase().includes("forbidden")
        ) {
          setForbidden(true);
        } else {
          setError(message);
        }

        setTickets([]);
      } finally {
        setLoading(false);
      }
    }

    loadQueue();
  }, [
    search,
    status,
    categoryId,
    requestedPriority,
    itPriority,
    ownerFilter,
    sortBy,
    sortOrder,
    meta.page,
    meta.pageSize,
  ]);

  function clearFilters() {
    setSearch("");
    setStatus(undefined);
    setCategoryId(undefined);
    setRequestedPriority(undefined);
    setItPriority(undefined);
    setOwnerFilter("all");
    setSortBy("updatedAt");
    setSortOrder("desc");

    setMeta((previous) => ({ ...previous, page: 1 }));
  }

  function resetToFirstPage() {
    setMeta((previous) => ({ ...previous, page: 1 }));
  }

  function changePage(page: number) {
    if (page < 1 || page > meta.totalPages || page === meta.page) {
      return;
    }

    setMeta((previous) => ({ ...previous, page }));
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString();
  }

  function getPageNumbers(
    current: number,
    total: number
  ): (number | "ellipsis")[] {
    if (total <= 1) return total === 1 ? [1] : [];

    const delta = 1;
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
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1" style={{ color: "#1A2E26" }}>
            My Queue
          </h1>
          <p className="mb-0" style={{ color: "#5A6E65" }}>
            Find and prioritize IT support work across the whole team.
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
            <div className="col-12">
              <label
                htmlFor="staff-search-input"
                className="form-label fw-semibold"
                style={{ color: "#1A2E26" }}
              >
                Search
              </label>
              <input
                id="staff-search-input"
                type="search"
                className="form-control"
                placeholder="Search by ticket number or summary..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  resetToFirstPage();
                }}
                style={{ borderColor: "#C8D4CE", minHeight: "44px" }}
              />
            </div>

            <div className="col-12 col-sm-6 col-md-3">
              <label
                htmlFor="staff-status-select"
                className="form-label fw-semibold"
                style={{ color: "#1A2E26" }}
              >
                Status
              </label>
              <select
                id="staff-status-select"
                className="form-select"
                value={status ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  setStatus(value ? (value as CurrentStatus) : undefined);
                  resetToFirstPage();
                }}
                style={{ borderColor: "#C8D4CE" }}
              >
                <option value="">All Statuses</option>
                <option value="NEW">New</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="WAITING_FOR_REQUESTER">
                  Waiting for Requester
                </option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
                <option value="REOPENED">Reopened</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div className="col-12 col-sm-6 col-md-3">
              <label
                htmlFor="staff-category-select"
                className="form-label fw-semibold"
                style={{ color: "#1A2E26" }}
              >
                Category
              </label>
              <select
                id="staff-category-select"
                className="form-select"
                value={categoryId ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  setCategoryId(value ? Number(value) : undefined);
                  resetToFirstPage();
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

            <div className="col-12 col-sm-6 col-md-3">
              <label
                htmlFor="staff-requested-priority-select"
                className="form-label fw-semibold"
                style={{ color: "#1A2E26" }}
              >
                Requested Priority
              </label>
              <select
                id="staff-requested-priority-select"
                className="form-select"
                value={requestedPriority ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  setRequestedPriority(
                    value ? (value as RequestedPriority) : undefined
                  );
                  resetToFirstPage();
                }}
                style={{ borderColor: "#C8D4CE" }}
              >
                <option value="">All Requested Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>

            <div className="col-12 col-sm-6 col-md-3">
              <label
                htmlFor="staff-it-priority-select"
                className="form-label fw-semibold"
                style={{ color: "#1A2E26" }}
              >
                IT Priority
              </label>
              <select
                id="staff-it-priority-select"
                className="form-select"
                value={itPriority ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  setItPriority(
                    value ? (value as RequestedPriority) : undefined
                  );
                  resetToFirstPage();
                }}
                style={{ borderColor: "#C8D4CE" }}
              >
                <option value="">All IT Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>

            <div className="col-12 col-sm-6 col-md-3">
              <label
                htmlFor="staff-owner-select"
                className="form-label fw-semibold"
                style={{ color: "#1A2E26" }}
              >
                Owner
              </label>
              <select
                id="staff-owner-select"
                className="form-select"
                value={ownerFilter}
                onChange={(event) => {
                  setOwnerFilter(event.target.value as OwnerFilter);
                  resetToFirstPage();
                }}
                style={{ borderColor: "#C8D4CE" }}
              >
                <option value="all">All Owners</option>
                <option value="me">Me</option>
                <option value="unassigned">Unassigned</option>
              </select>
            </div>

            <div className="col-12 col-md-6">
              <label
                htmlFor="staff-sort-by-select"
                className="form-label fw-semibold"
                style={{ color: "#1A2E26" }}
              >
                Sort By
              </label>
              <select
                id="staff-sort-by-select"
                className="form-select"
                value={sortBy}
                onChange={(event) => {
                  setSortBy(event.target.value as StaffQueueSortField);
                  resetToFirstPage();
                }}
                style={{ borderColor: "#C8D4CE" }}
              >
                <option value="updatedAt">Last Updated</option>
                <option value="createdAt">Created Date</option>
                <option value="ticketNumber">Ticket Number</option>
                <option value="priority">IT Priority</option>
              </select>
            </div>

            <div className="col-12 col-md-6">
              <label
                htmlFor="staff-sort-order-select"
                className="form-label fw-semibold"
                style={{ color: "#1A2E26" }}
              >
                Order
              </label>
              <select
                id="staff-sort-order-select"
                className="form-select"
                value={sortOrder}
                onChange={(event) => {
                  setSortOrder(event.target.value as "asc" | "desc");
                  resetToFirstPage();
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

      {/* Forbidden State */}
      {forbidden && (
        <div
          className="alert"
          style={{
            color: "#B45309",
            backgroundColor: "#FEF3C7",
            border: "1px solid #FDE68A",
            borderRadius: "8px",
          }}
        >
          You do not have permission to view the IT Staff Ticket Queue.
        </div>
      )}

      {/* Error Banner (safe failure) */}
      {!forbidden && error && (
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

      {/* Loading */}
      {!forbidden && loading && (
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

      {/* Empty State — no tickets exist at all */}
      {!forbidden && !loading && !error && meta.total === 0 && (
        <div
          className="card text-center"
          style={{ border: "1px solid #E0E6E2", borderRadius: "10px" }}
        >
          <div className="card-body py-5">
            <h2 className="h5 fw-bold" style={{ color: "#1A2E26" }}>
              There are no tickets in the queue yet.
            </h2>
            <p style={{ color: "#5A6E65" }}>
              New tickets submitted by Requesters will appear here.
            </p>
          </div>
        </div>
      )}

      {/* No-Results State — filters/search matched zero tickets */}
      {!forbidden &&
        !loading &&
        !error &&
        meta.total > 0 &&
        tickets.length === 0 && (
          <div
            className="card text-center"
            style={{ border: "1px solid #E0E6E2", borderRadius: "10px" }}
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

      {/* Main Queue Table */}
      {!forbidden && !loading && !error && tickets.length > 0 && (
        <>
          <div
            className="responsive-ticket-table table-responsive"
            style={{
              border: "1px solid #E0E6E2",
              borderRadius: "10px",
              backgroundColor: "#FFFFFF",
            }}
          >
            <table
              className="table table-hover align-middle mb-0"
              style={{ minWidth: "1150px" }}
            >
              <thead>
                <tr style={{ backgroundColor: "#F5F7F6" }}>
                  <th
                    style={{
                      color: "#1A2E26",
                      minWidth: "160px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Ticket No.
                  </th>
                  <th
                    style={{
                      color: "#1A2E26",
                      minWidth: "160px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Created Date
                  </th>
                  <th style={{ color: "#1A2E26" }}>Summary</th>
                  <th style={{ color: "#1A2E26" }}>Category</th>
                  <th style={{ color: "#1A2E26" }}>Req. Priority</th>
                  <th style={{ color: "#1A2E26" }}>IT Priority</th>
                  <th style={{ color: "#1A2E26" }}>Status</th>
                  <th style={{ color: "#1A2E26" }}>Owner</th>
                  <th
                    style={{
                      color: "#1A2E26",
                      minWidth: "160px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Last Updated
                  </th>
                </tr>
              </thead>

              <tbody>
                {tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    role="button"
                    onClick={() => onOpenTicket?.(ticket.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <td
                      data-label="Ticket No."
                      style={{ whiteSpace: "nowrap" }}
                    >
                      <button
                        type="button"
                        className="btn btn-link p-0 fw-semibold text-nowrap"
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenTicket?.(ticket.id);
                        }}
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
                    <td data-label="Req. Priority">
                      {renderPriorityBadge(ticket.requestedPriority)}
                    </td>
                    <td data-label="IT Priority">
                      {renderPriorityBadge(ticket.itPriority)}
                    </td>
                    <td data-label="Status">
                      {renderStatusBadge(ticket.currentStatus)}
                    </td>
                    <td
                      data-label="Owner"
                      className="small"
                      style={{ color: "#1A2E26" }}
                    >
                      {ticket.ownerName ?? "Unassigned"}
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

          {/* Pagination */}
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3 mt-4">
            <span className="small" style={{ color: "#5A6E65" }}>
              Showing{" "}
              {Math.min((meta.page - 1) * meta.pageSize + 1, meta.total)} to{" "}
              {Math.min(meta.page * meta.pageSize, meta.total)} of{" "}
              {meta.total} tickets
            </span>

            <nav aria-label="Queue pagination">
              <ul
                className="pagination mb-0 flex-wrap justify-content-center"
                style={{ rowGap: "0.5rem" }}
              >
                <li
                  className={`page-item ${
                    meta.page === 1 ? "disabled" : ""
                  }`}
                >
                  <button
                    className="page-link"
                    onClick={() => changePage(meta.page - 1)}
                    disabled={meta.page === 1}
                    style={{ color: meta.page === 1 ? "#A0AEA7" : "#006B3C" }}
                  >
                    &lt; Previous
                  </button>
                </li>

                {getPageNumbers(meta.page, meta.totalPages).map(
                  (page, index) =>
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
                          aria-current={
                            page === meta.page ? "page" : undefined
                          }
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
                      color:
                        meta.page === meta.totalPages
                          ? "#A0AEA7"
                          : "#006B3C",
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

