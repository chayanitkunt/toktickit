import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

// Mock the API module
vi.mock("../../src/api.js");

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the TokTickIT heading", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: /TokTickIT/i })
    ).toBeInTheDocument();
  });

  it("shows Online and the seeded categories on success", async () => {
    // Mock successful API response
    vi.spyOn(api, "checkSystem").mockResolvedValueOnce({
      online: true,
      categories: [
        { id: 1, name: "Account and Access" },
        { id: 2, name: "Hardware" },
        { id: 3, name: "Software" },
        { id: 4, name: "Network" },
      ],
    });

    render(<App />);

    // Trigger the check system action
    const checkBtn = screen.getByRole("button", { name: /Check System/i });
    fireEvent.click(checkBtn);

    // Assert online status and rendered categories
    await waitFor(() => {
      expect(screen.getByText(/Online/i)).toBeInTheDocument();
      expect(screen.getByText("Account and Access")).toBeInTheDocument();
      expect(screen.getByText("Hardware")).toBeInTheDocument();
      expect(screen.getByText("Software")).toBeInTheDocument();
      expect(screen.getByText("Network")).toBeInTheDocument();
    });
  });

  it("shows an Offline error message when the API is unavailable", async () => {
    // Mock API failure
    vi.spyOn(api, "checkSystem").mockRejectedValueOnce(
      new Error("Unable to connect to TokTickIT API")
    );

    render(<App />);

    // Trigger the check system action
    const checkBtn = screen.getByRole("button", { name: /Check System/i });
    fireEvent.click(checkBtn);

    // Assert error state and message
    await waitFor(() => {
      expect(screen.getByText(/Offline/i)).toBeInTheDocument();
      expect(
        screen.getByText("Unable to connect to TokTickIT API")
      ).toBeInTheDocument();
    });
  });
});
