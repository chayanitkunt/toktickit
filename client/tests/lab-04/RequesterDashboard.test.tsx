import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RequesterDashboard from "../../src/components/RequesterDashboard.js";

function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }); }
const dashboard = { myOpenTickets: 4, waitingForRequester: 1, resolved: 2, closed: 3, recentlyUpdatedTickets: [{ id: 8, ticketNumber: "TKT-2026-000008", summary: "VPN issue", currentStatus: "OPEN", updatedAt: "2026-09-28T00:00:00.000Z" }], recentlyResolvedTickets: [] };

describe("RequesterDashboard", () => {
  beforeEach(() => vi.restoreAllMocks());
  it("renders API metrics and sends card/list drill-downs to the correct callbacks", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json(dashboard));
    const user = userEvent.setup(); const onViewTickets = vi.fn(); const onOpenTicket = vi.fn();
    render(<RequesterDashboard name="Quinn" onCreateTicket={vi.fn()} onOpenTicket={onOpenTicket} onViewTickets={onViewTickets} />);
    expect(await screen.findByText("4")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Waiting for Requester: 1/i }));
    expect(onViewTickets).toHaveBeenCalledWith("WAITING_FOR_REQUESTER");
    await user.click(screen.getByRole("button", { name: "TKT-2026-000008" }));
    expect(onOpenTicket).toHaveBeenCalledWith(8);
  });
  it("renders zero empty state and safe retry feedback", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(json({ myOpenTickets: 0, waitingForRequester: 0, resolved: 0, closed: 0, recentlyUpdatedTickets: [], recentlyResolvedTickets: [] }));
    render(<RequesterDashboard name="Quinn" onCreateTicket={vi.fn()} onOpenTicket={vi.fn()} onViewTickets={vi.fn()} />);
    expect(await screen.findByText(/No Tickets yet/i)).toBeInTheDocument();
    expect(screen.getAllByText("0")).toHaveLength(4);
  });
});
