import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import App from "../../src/App.js";
import * as api from "../../src/api.js";
import { DevelopmentRequesterProvider } from "../../src/DevelopmentRequesterContext.js";

// Mock the API module
vi.mock("../../src/api.js");

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(api, "getRequesters").mockResolvedValue([
      {
        id: 1,
        name: "Test User",
        email: "test@example.com",
      },
    ]);
  });

  it("renders the TokTickIT heading", () => {
    render(
      <DevelopmentRequesterProvider>
        <App />
      </DevelopmentRequesterProvider>
    );

    expect(
      screen.getByRole("heading", { name: /TokTickIT/i })
    ).toBeInTheDocument();
  });

  it("shows Online and the seeded categories on success", async () => {
    vi.spyOn(api, "checkSystem").mockResolvedValueOnce({
      online: true,
      categories: [
        { id: 1, name: "Account and Access" },
        { id: 2, name: "Hardware" },
        { id: 3, name: "Software" },
        { id: 4, name: "Network" },
      ],
    });

    render(
      <DevelopmentRequesterProvider>
        <App />
      </DevelopmentRequesterProvider>
    );

    const checkBtn = screen.getByRole("button", {
      name: /Check System/i,
    });

    fireEvent.click(checkBtn);

    await waitFor(() => {
      expect(screen.getByText(/Online/i)).toBeInTheDocument();
      expect(screen.getByText("Account and Access")).toBeInTheDocument();
      expect(screen.getByText("Hardware")).toBeInTheDocument();
      expect(screen.getByText("Software")).toBeInTheDocument();
      expect(screen.getByText("Network")).toBeInTheDocument();
    });
  });

  it("shows an Offline error message when the API is unavailable", async () => {
    vi.spyOn(api, "checkSystem").mockRejectedValueOnce(
      new Error("Unable to connect to TokTickIT API")
    );

    render(
      <DevelopmentRequesterProvider>
        <App />
      </DevelopmentRequesterProvider>
    );

    const checkBtn = screen.getByRole("button", {
      name: /Check System/i,
    });

    fireEvent.click(checkBtn);

    await waitFor(() => {
      expect(screen.getByText(/Offline/i)).toBeInTheDocument();
      expect(
        screen.getByText("Unable to connect to TokTickIT API")
      ).toBeInTheDocument();
    });
  });
});
