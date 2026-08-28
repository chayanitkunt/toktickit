import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DevelopmentRequesterProvider } from "../../src/DevelopmentRequesterContext.js";
import RequesterSelector from "../../src/components/RequesterSelector.js";

const mockRequesters = [
  {
    id: 1,
    name: "Alice Johnson",
    email: "alice@example.com",
  },
  {
    id: 2,
    name: "Bob Smith",
    email: "bob@example.com",
  },
];

describe("RequesterSelector", () => {
  beforeEach(() => {
    localStorage.clear();

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockRequesters), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      })
    );
  });

  it("loads and displays active requesters", async () => {
    render(
      <DevelopmentRequesterProvider>
        <RequesterSelector />
      </DevelopmentRequesterProvider>
    );

    expect(
      screen.getByText("Loading requesters…")
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Alice Johnson (alice@example.com)")).toBeInTheDocument();
      expect(screen.getByText("Bob Smith (bob@example.com)")).toBeInTheDocument();
    });
  });

  it("allows the user to select a requester", async () => {
    const user = userEvent.setup();

    render(
      <DevelopmentRequesterProvider>
        <RequesterSelector />
      </DevelopmentRequesterProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Development Requester")).toBeInTheDocument();
    });

    const select = screen.getByLabelText("Development Requester");

    await user.selectOptions(select, "2");

    expect(
      screen.getByText((_, element) =>
        element?.textContent?.replace(/\s+/g, " ").trim() ===
         "Current requester: Bob Smith"
        )
    ).toBeInTheDocument();
  });
});
