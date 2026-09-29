import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StaffDashboard from "../../src/components/StaffDashboard.js";
function json(body: unknown) { return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } }); }
const dashboard = { byStatus: { new: 2, open: 3, inProgress: 4, waitingForRequester: 5 }, unassigned: 6, myAssigned: 7, byItPriority: { low: 1, medium: 2, high: 3 }, myRecentTickets: [{ id: 9, ticketNumber: "TKT-2026-000009", summary: "Network issue", currentStatus: "OPEN", updatedAt: "2026-09-28T00:00:00.000Z" }] };
describe("StaffDashboard", () => {
  beforeEach(() => vi.restoreAllMocks());
  it("renders operational metrics and sends exact queue filters", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json(dashboard));
    const user = userEvent.setup(); const onViewQueue = vi.fn(); const onOpenTicket = vi.fn(); const onSearchTickets = vi.fn();
    render(<StaffDashboard name="Michael" onOpenTicket={onOpenTicket} onViewQueue={onViewQueue} onSearchTickets={onSearchTickets} />);
    expect(await screen.findByText("7")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Unassigned.*6 active Tickets/i }));
    expect(onViewQueue).toHaveBeenCalledWith({ owner: "unassigned" });
    await user.click(screen.getByRole("button", { name: "High: 3" }));
    expect(onViewQueue).toHaveBeenCalledWith({ priority: "HIGH" });
    await user.click(screen.getByRole("button", { name: "TKT-2026-000009" }));
    expect(onOpenTicket).toHaveBeenCalledWith(9);
    await user.click(screen.getByRole("button", { name: /Search Tickets/i }));
    expect(onSearchTickets).toHaveBeenCalledOnce();
  });
  it("shows safe failure feedback", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ error: "Internal detail" }), { status: 500 }));
    render(<StaffDashboard name="Michael" onOpenTicket={vi.fn()} onViewQueue={vi.fn()} onSearchTickets={vi.fn()} />);
    expect(await screen.findByText(/could not load the dashboard/i)).toBeInTheDocument();
    expect(screen.queryByText("Internal detail")).not.toBeInTheDocument();
  });
});
