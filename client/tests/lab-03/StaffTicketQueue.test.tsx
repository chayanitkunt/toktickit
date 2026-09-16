import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StaffTicketQueue from "../../src/components/StaffTicketQueue.js";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const CATEGORIES = [
  { id: 1, name: "Hardware" },
  { id: 2, name: "Network" },
];

const SAMPLE_TICKET = {
  id: 101,
  ticketNumber: "TKT-2026-000101",
  createdAt: "2026-05-01T09:00:00.000Z",
  summary: "Cannot connect to VPN",
  categoryName: "Network",
  requestedPriority: "HIGH",
  itPriority: "HIGH",
  currentStatus: "IN_PROGRESS",
  ownerId: 9,
  ownerName: "Michael Brown",
  lastUpdated: "2026-05-02T09:00:00.000Z",
};

function mockFetchRoutes(routes: {
  queue?: (url: string) => Response;
}) {
  vi.spyOn(globalThis, "fetch").mockImplementation(
    async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("/api/categories")) {
        return jsonResponse(CATEGORIES, 200);
      }

      if (url.includes("/api/staff/tickets")) {
        return routes.queue
          ? routes.queue(url)
          : jsonResponse(
              {
                data: [SAMPLE_TICKET],
                meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 },
              },
              200
            );
      }

      throw new Error(`Unexpected fetch call to ${url}`);
    }
  );
}

describe("StaffTicketQueue", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a loading state, then renders queue rows", async () => {
    mockFetchRoutes({});

    render(<StaffTicketQueue />);

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000101")).toBeInTheDocument();
    });

    expect(screen.getByText("Cannot connect to VPN")).toBeInTheDocument();
    expect(screen.getByText("Michael Brown")).toBeInTheDocument();
  });

  it("renders the empty state when there are no tickets at all", async () => {
    mockFetchRoutes({
      queue: () =>
        jsonResponse(
          { data: [], meta: { total: 0, page: 1, pageSize: 10, totalPages: 0 } },
          200
        ),
    });

    render(<StaffTicketQueue />);

    expect(
      await screen.findByText("There are no tickets in the queue yet.")
    ).toBeInTheDocument();
  });

  it("renders the no-results state when filters/search match nothing", async () => {
    mockFetchRoutes({
      queue: (url) => {
        if (url.includes("q=zzz")) {
          return jsonResponse(
            {
              data: [],
              meta: { total: 5, page: 1, pageSize: 10, totalPages: 1 },
            },
            200
          );
        }

        return jsonResponse(
          {
            data: [SAMPLE_TICKET],
            meta: { total: 5, page: 1, pageSize: 10, totalPages: 1 },
          },
          200
        );
      },
    });

    const user = userEvent.setup();
    render(<StaffTicketQueue />);

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000101")).toBeInTheDocument();
    });

    await user.type(
      screen.getByPlaceholderText("Search by ticket number or summary..."),
      "zzz"
    );

    expect(
      await screen.findByText("No tickets match your search or filters.")
    ).toBeInTheDocument();
  });

  it("renders a forbidden state when the API rejects the caller's role", async () => {
    mockFetchRoutes({
      queue: () =>
        jsonResponse(
          {
            error: "You do not have permission to perform this action",
            code: "forbidden",
          },
          403
        ),
    });

    render(<StaffTicketQueue />);

    expect(
      await screen.findByText(
        "You do not have permission to view the IT Staff Ticket Queue."
      )
    ).toBeInTheDocument();
  });

  it("renders a safe failure banner on a server error", async () => {
    mockFetchRoutes({
      queue: () =>
        jsonResponse(
          { error: "Unable to retrieve the ticket queue", code: "server_error" },
          500
        ),
    });

    render(<StaffTicketQueue />);

    expect(
      await screen.findByText("Unable to retrieve the ticket queue")
    ).toBeInTheDocument();
  });

  it("calls onOpenTicket when a ticket number is clicked", async () => {
    mockFetchRoutes({});
    const onOpenTicket = vi.fn();
    const user = userEvent.setup();

    render(<StaffTicketQueue onOpenTicket={onOpenTicket} />);

    const ticketLink = await screen.findByText("TKT-2026-000101");
    await user.click(ticketLink);

    expect(onOpenTicket).toHaveBeenCalledWith(101);
  });
});

