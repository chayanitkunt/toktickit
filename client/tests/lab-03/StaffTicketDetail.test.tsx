import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider } from "../../src/AuthContext.js";
import StaffTicketDetail from "../../src/components/StaffTicketDetail.js";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const CURRENT_USER = {
  id: 9,
  name: "Michael Brown",
  email: "michael.brown@tiktockit.com",
  role: "IT_STAFF",
  mustChangePassword: false,
};

const ELIGIBLE_OWNERS = [
  { id: 9, name: "Michael Brown", role: "IT_STAFF" },
  { id: 10, name: "Sarah Johnson", role: "IT_STAFF" },
  { id: 20, name: "Jennifer Anderson", role: "ADMINISTRATOR" },
];

function sampleTicket(overrides: Record<string, unknown> = {}) {
  return {
    id: 101,
    ticketNumber: "TKT-2026-000101",
    summary: "Cannot connect to VPN",
    description: "VPN client fails to establish a tunnel.",
    requestedPriority: "HIGH",
    itPriority: "HIGH",
    currentStatus: "NEW",
    problemAppearsResolved: false,
    createdAt: "2026-05-01T09:00:00.000Z",
    updatedAt: "2026-05-02T09:00:00.000Z",
    category: { id: 1, name: "Network" },
    relatedSystem: { id: 1, name: "Corporate VPN" },
    requester: { id: 3, name: "Jennifer Requester" },
    owner: null,
    attachments: [],
    ...overrides,
  };
}

interface Routes {
  ticket?: () => Response;
  claim?: () => Response;
  priority?: () => Response;
  status?: () => Response;
  comments?: () => Response;
  notes?: () => Response;
}

function mockFetchRoutes(routes: Routes) {
  vi.spyOn(globalThis, "fetch").mockImplementation(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = (init?.method ?? "GET").toUpperCase();

      if (url.includes("/api/auth/me")) {
        return jsonResponse(CURRENT_USER, 200);
      }

      if (url.includes("/api/staff/eligible-owners")) {
        return jsonResponse(ELIGIBLE_OWNERS, 200);
      }

      if (url.includes("/claim")) {
        return routes.claim
          ? routes.claim()
          : jsonResponse({ id: 101, owner: { id: 9, name: "Michael Brown" } }, 200);
      }

      if (url.includes("/priority")) {
        return routes.priority
          ? routes.priority()
          : jsonResponse({ id: 101, itPriority: "HIGH" }, 200);
      }

      if (url.includes("/status")) {
        return routes.status
          ? routes.status()
          : jsonResponse({ id: 101, currentStatus: "OPEN" }, 200);
      }

      if (url.includes("/api/staff/tickets/101/notes")) {
        return routes.notes ? routes.notes() : jsonResponse([], 200);
      }

      if (url.includes("/api/tickets/101/comments")) {
        if (method === "POST") {
          return jsonResponse(
            {
              id: 1,
              content: "Test comment",
              createdAt: "2026-05-03T09:00:00.000Z",
              author: { id: 9, name: "Michael Brown", role: "IT_STAFF" },
            },
            201
          );
        }
        return routes.comments ? routes.comments() : jsonResponse([], 200);
      }

      if (url.includes("/api/staff/tickets/101")) {
        return routes.ticket ? routes.ticket() : jsonResponse(sampleTicket(), 200);
      }

      throw new Error(`Unexpected fetch call to ${url} (${method})`);
    }
  );
}

function renderStaffTicketDetail(onBack = vi.fn()) {
  return render(
    <AuthProvider>
      <StaffTicketDetail ticketId={101} onBack={onBack} />
    </AuthProvider>
  );
}

describe("StaffTicketDetail", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a loading state, then renders ticket details", async () => {
    mockFetchRoutes({});

    renderStaffTicketDetail();

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000101")).toBeInTheDocument();
    });

    expect(screen.getByText("Cannot connect to VPN")).toBeInTheDocument();
    expect(screen.getByText("Jennifer Requester")).toBeInTheDocument();
  });

  it("renders a not-found state for a missing ticket", async () => {
    mockFetchRoutes({
      ticket: () => jsonResponse({ error: "Ticket not found", code: "not_found" }, 404),
    });

    renderStaffTicketDetail();

    expect(
      await screen.findByText("This ticket could not be found.")
    ).toBeInTheDocument();
  });

  it("renders a forbidden state for a non-staff caller", async () => {
    mockFetchRoutes({
      ticket: () =>
        jsonResponse(
          { error: "You do not have permission to perform this action", code: "forbidden" },
          403
        ),
    });

    renderStaffTicketDetail();

    expect(
      await screen.findByText("You do not have permission to view this ticket.")
    ).toBeInTheDocument();
  });

  it("shows a Claim button for an unassigned ticket and calls the claim API", async () => {
    mockFetchRoutes({});
    const user = userEvent.setup();

    renderStaffTicketDetail();

    const claimButton = await screen.findByRole("button", { name: /claim/i });
    await user.click(claimButton);

    await waitFor(() => {
      expect(
        globalThis.fetch as unknown as ReturnType<typeof vi.fn>
      ).toHaveBeenCalledWith(
        expect.stringContaining("/api/staff/tickets/101/claim"),
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("does not show a Claim button once the ticket already has an owner", async () => {
    mockFetchRoutes({
      ticket: () =>
        jsonResponse(
          sampleTicket({ owner: { id: 10, name: "Sarah Johnson" } }),
          200
        ),
    });

    renderStaffTicketDetail();

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000101")).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("button", { name: /^claim$/i })
    ).not.toBeInTheDocument();
  });

  it("changing the IT Priority dropdown calls the priority API", async () => {
    mockFetchRoutes({});
    const user = userEvent.setup();

    renderStaffTicketDetail();

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000101")).toBeInTheDocument();
    });

    const prioritySelect = screen.getByLabelText("IT Priority");
    await user.selectOptions(prioritySelect, "MEDIUM");

    await waitFor(() => {
      expect(
        globalThis.fetch as unknown as ReturnType<typeof vi.fn>
      ).toHaveBeenCalledWith(
        expect.stringContaining("/api/staff/tickets/101/priority"),
        expect.objectContaining({ method: "PATCH" })
      );
    });
  });

  it("the status dropdown only offers transitions allowed from the current status (BR-08)", async () => {
    mockFetchRoutes({});

    renderStaffTicketDetail();

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000101")).toBeInTheDocument();
    });

    // Ticket starts at NEW: only OPEN and CANCELLED are legal next statuses.
    const statusSelect = screen.getByLabelText("Current Status");
    const options = within(statusSelect).getAllByRole("option");
    const optionValues = options.map((o) => (o as HTMLOptionElement).value);

    expect(optionValues).toContain("OPEN");
    expect(optionValues).toContain("CANCELLED");
    expect(optionValues).not.toContain("CLOSED");
    expect(optionValues).not.toContain("RESOLVED");
  });

  it("changing status calls the status API", async () => {
    mockFetchRoutes({});
    const user = userEvent.setup();

    renderStaffTicketDetail();

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000101")).toBeInTheDocument();
    });

    const statusSelect = screen.getByLabelText("Current Status");
    await user.selectOptions(statusSelect, "OPEN");

    await waitFor(() => {
      expect(
        globalThis.fetch as unknown as ReturnType<typeof vi.fn>
      ).toHaveBeenCalledWith(
        expect.stringContaining("/api/staff/tickets/101/status"),
        expect.objectContaining({ method: "PATCH" })
      );
    });
  });

  it("asks for confirmation when moving out of a terminal status (Resolved/Closed/Cancelled)", async () => {
    // specification.md §5.1: confirmation is required for every transition
    // OUT OF Resolved/Closed/Cancelled (e.g. Resolved -> Closed/Reopened),
    // not for transitions into them — see ticketStatusTransitions.ts.
    mockFetchRoutes({
      ticket: () => jsonResponse(sampleTicket({ currentStatus: "RESOLVED" }), 200),
    });
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();

    renderStaffTicketDetail();

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000101")).toBeInTheDocument();
    });

    const statusSelect = screen.getByLabelText("Current Status");
    await user.selectOptions(statusSelect, "CLOSED");

    expect(confirmSpy).toHaveBeenCalled();

    // The user declined the confirmation, so no status PATCH should fire.
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(
      fetchMock.mock.calls.some(([calledUrl, calledInit]) =>
        String(calledUrl).includes("/status") &&
        (calledInit as RequestInit | undefined)?.method === "PATCH"
      )
    ).toBe(false);
  });

  it("switches between Public Comments and Internal Notes tabs, each visually distinct", async () => {
    mockFetchRoutes({
      comments: () =>
        jsonResponse(
          [
            {
              id: 1,
              content: "Visible to everyone.",
              createdAt: "2026-05-01T10:00:00.000Z",
              author: { id: 3, name: "Jennifer Requester", role: "REQUESTER" },
            },
          ],
          200
        ),
      notes: () =>
        jsonResponse(
          [
            {
              id: 2,
              content: "Internal-only detail.",
              createdAt: "2026-05-01T11:00:00.000Z",
              author: { id: 9, name: "Michael Brown", role: "IT_STAFF" },
            },
          ],
          200
        ),
    });
    const user = userEvent.setup();

    renderStaffTicketDetail();

    expect(await screen.findByText("Visible to everyone.")).toBeInTheDocument();
    expect(screen.queryByText("Internal-only detail.")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /internal notes/i }));

    expect(await screen.findByText("Internal-only detail.")).toBeInTheDocument();
    expect(screen.getByText(/not visible to Requester/i)).toBeInTheDocument();
  });

  it("renders existing Attachments in the Attachments tab", async () => {
    mockFetchRoutes({
      ticket: () =>
        jsonResponse(
          sampleTicket({
            attachments: [
              {
                id: 5,
                fileName: "screenshot.png",
                fileSize: 2048,
                mimeType: "image/png",
                createdAt: "2026-05-01T09:30:00.000Z",
                isRemoved: false,
                removedAt: null,
                removedReason: null,
              },
            ],
          }),
          200
        ),
    });
    const user = userEvent.setup();

    renderStaffTicketDetail();

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000101")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: /attachments/i }));

    expect(await screen.findByText("screenshot.png")).toBeInTheDocument();
  });
});
