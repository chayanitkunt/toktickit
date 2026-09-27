import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ActionsTaken from "../../src/components/ActionsTaken.js";

const action = {
  id: 14, ticketId: 101, actionAt: "2026-09-20T09:14:00.000Z",
  description: "Replaced laptop battery.", result: "Battery holds a charge.",
  performedBy: { id: 9, name: "Michael Brown" }, followUpRequired: false,
  followUpNote: null, attachmentNotes: "battery-before.jpg", createdAt: "2026-09-20T09:14:00.000Z",
  updatedAt: "2026-09-20T09:14:00.000Z",
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function mockApi({ actions = [action], create, update }: { actions?: unknown[]; create?: () => Response; update?: () => Response } = {}) {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input); const method = (init?.method ?? "GET").toUpperCase();
    if (url.includes("/api/tickets/101/actions") && method === "GET") return response(actions);
    if (url.includes("/api/staff/tickets/101/actions/14") && method === "PATCH") return update?.() ?? response(action);
    if (url.includes("/api/staff/tickets/101/actions") && method === "POST") return create?.() ?? response({ ...action, id: 15 }, 201);
    throw new Error(`Unexpected request: ${method} ${url}`);
  });
}

describe("ActionsTaken", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("renders Actions Taken oldest first and keeps Requesters read-only", async () => {
    mockApi({ actions: [action, { ...action, id: 15, actionAt: "2026-09-21T09:14:00.000Z", description: "Tested VPN" }] });
    render(<ActionsTaken ticketId={101} canEdit={false} />);
    expect((await screen.findAllByText("Replaced laptop battery.")).length).toBe(2);
    expect(screen.getAllByText("Tested VPN").length).toBe(2);
    expect(screen.queryByRole("button", { name: /add action taken/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^edit$/i })).not.toBeInTheDocument();
  });

  it("validates follow-up notes and submits an authorized create once", async () => {
    mockApi({ actions: [] });
    const user = userEvent.setup();
    render(<ActionsTaken ticketId={101} canEdit />);
    await user.click(await screen.findByRole("button", { name: /add action taken/i }));
    await user.click(screen.getByLabelText("Yes"));
    await user.click(screen.getByRole("button", { name: /^add action taken$/i }));
    expect(await screen.findByText("Action Description is required.")).toBeInTheDocument();
    expect(screen.getByText("Follow-up Note is required when follow-up is needed.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Action Description"), "Replaced battery");
    await user.type(screen.getByLabelText("Result"), "Working");
    await user.type(screen.getByLabelText("Follow-up Note"), "Check tomorrow");
    await user.click(screen.getByRole("button", { name: /^add action taken$/i }));
    await waitFor(() => expect(screen.queryByText("Edit Action Taken")).not.toBeInTheDocument());
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it("keeps an edit visible after a stale-update conflict", async () => {
    mockApi({ update: () => response({ error: "This Action Taken has been updated by someone else", code: "stale_action_taken" }, 409) });
    const user = userEvent.setup();
    render(<ActionsTaken ticketId={101} canEdit />);
    await user.click((await screen.findAllByRole("button", { name: /^edit$/i }))[0]);
    expect(screen.getByLabelText("Action Date/Time")).toHaveAttribute("readonly");
    expect(screen.getByLabelText("Performed By")).toHaveValue("Michael Brown");
    expect(screen.getByLabelText("Performed By")).toHaveAttribute("readonly");
    const description = screen.getByLabelText("Action Description");
    await user.clear(description); await user.type(description, "My unsaved correction");
    await user.click(screen.getByRole("button", { name: /save action taken/i }));
    expect(await screen.findByText(/This action was updated by someone else/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Action Description")).toHaveValue("My unsaved correction");
  });
});
