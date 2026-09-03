import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateTicket from "../../src/components/CreateTicket.js";

const mockCategories = [
  { id: 1, name: "Hardware" },
  { id: 2, name: "Software" },
];

const mockSystems = [
  { id: 1, name: "Corporate Laptop" },
  { id: 2, name: "VPN" },
];

function mockFetchOnce(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function setupFetchMock() {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = typeof input === "string" ? input : input.toString();

    if (url.includes("/api/categories")) {
      return mockFetchOnce(200, mockCategories);
    }

    if (url.includes("/api/related-systems")) {
      return mockFetchOnce(200, mockSystems);
    }

    if (url.includes("/api/tickets")) {
      return mockFetchOnce(201, {
        id: 1,
        ticketNumber: "TKT-2026-000001",
        currentStatus: "NEW",
      });
    }

    throw new Error(`Unexpected fetch call: ${url}`);
  });
}

describe("CreateTicket", () => {
  beforeEach(() => {
    setupFetchMock();
  });

  it("loads Category and Related System options from the backend", async () => {
    render(
      <CreateTicket requesterId={1} onCancel={() => {}} />
    );

    expect(screen.getByText("Loading ticket form...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Hardware")).toBeInTheDocument();
      expect(screen.getByText("Corporate Laptop")).toBeInTheDocument();
    });
  });

  it("shows field-level validation messages and does not submit when required fields are empty (AC-01 negative path)", async () => {
    const user = userEvent.setup();

    render(<CreateTicket requesterId={1} onCancel={() => {}} />);

    const submitButton = await screen.findByRole("button", {
      name: "Create Ticket",
    });
    const fetchCallsBefore = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls.length;

    await user.click(submitButton);

    expect(
      await screen.findByText("Please select a category.")
    ).toBeInTheDocument();
    expect(screen.getByText("Please select a related system.")).toBeInTheDocument();
    expect(screen.getByText("Summary is required.")).toBeInTheDocument();
    expect(screen.getByText("Description is required.")).toBeInTheDocument();

    // No additional network call (i.e. no POST /api/tickets) should have
    // happened — only the two reference-data GETs from initial load.
    expect(
      (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length
    ).toBe(fetchCallsBefore);
  });

  it("submits a valid ticket and shows the generated Ticket Number (AC-01 happy path)", async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();

    render(<CreateTicket requesterId={1} onCancel={() => {}} onCreated={onCreated} />);

    await waitFor(() => {
      expect(screen.getByText("Hardware")).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText("Category"), "1");
    await user.selectOptions(screen.getByLabelText("Related System"), "1");
    await user.type(
      screen.getByLabelText("Summary"),
      "Laptop battery drains quickly"
    );
    await user.type(
      screen.getByLabelText("Description"),
      "My laptop battery is draining much faster than usual even when idle."
    );

    await user.click(screen.getByRole("button", { name: "Create Ticket" }));

    expect(await screen.findByText("Ticket Created")).toBeInTheDocument();
    expect(screen.getByText("TKT-2026-000001")).toBeInTheDocument();
  });
});
