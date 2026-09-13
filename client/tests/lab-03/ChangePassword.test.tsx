import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider } from "../../src/AuthContext.js";
import App from "../../src/App.js";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const MUST_CHANGE_USER = {
  id: 5,
  name: "Ethan Hunt",
  email: "ethan@example.com",
  role: "REQUESTER",
  mustChangePassword: true,
};

function mockFetchRoutes(routes: { changePassword?: () => Response }) {
  vi.spyOn(globalThis, "fetch").mockImplementation(
    async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("/api/auth/me")) {
        return jsonResponse(MUST_CHANGE_USER, 200);
      }

      if (url.includes("/api/auth/change-password")) {
        return routes.changePassword
          ? routes.changePassword()
          : jsonResponse(
              { error: "New password does not meet the password requirements" },
              400
            );
      }

      if (url.includes("/api/requesters")) {
        // Reached once mustChangePassword flips to false and the app shell
        // (still wrapped in DevelopmentRequesterProvider pending Issue 4)
        // mounts underneath the Change Password screen.
        return jsonResponse([]);
      }

      throw new Error(`Unexpected fetch call to ${url}`);
    }
  );
}

describe("Change Password screen", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("is shown instead of the app shell when mustChangePassword is true", async () => {
    mockFetchRoutes({});

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /change your password/i })
      ).toBeInTheDocument();
    });
  });

  it("shows a live checklist that updates as the new password is typed", async () => {
    mockFetchRoutes({});
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
    });

    expect(screen.getByText("Be at least 8 characters")).toBeInTheDocument();

    await user.type(screen.getByLabelText(/^new password$/i), "Str0ng!Pass");

    // All three rule items should now render the satisfied checkmark.
    const checkmarks = screen.getAllByText("✓");
    expect(checkmarks).toHaveLength(3);
  });

  it("rejects submission when confirm password does not match", async () => {
    mockFetchRoutes({});
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/current \(temporary\) password/i)).toBeInTheDocument();
    });

    await user.type(
      screen.getByLabelText(/current \(temporary\) password/i),
      "ChangeMe123!"
    );
    await user.type(screen.getByLabelText(/^new password$/i), "Str0ng!Pass");
    await user.type(
      screen.getByLabelText(/confirm new password/i),
      "Different!Pass1"
    );
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(
      await screen.findByText("Passwords do not match.")
    ).toBeInTheDocument();
  });

  it("submits a valid change and unlocks the app on success", async () => {
    mockFetchRoutes({
      changePassword: () =>
        jsonResponse({
          id: 5,
          name: "Ethan Hunt",
          role: "REQUESTER",
          mustChangePassword: false,
        }),
    });
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/current \(temporary\) password/i)).toBeInTheDocument();
    });

    await user.type(
      screen.getByLabelText(/current \(temporary\) password/i),
      "ChangeMe123!"
    );
    await user.type(screen.getByLabelText(/^new password$/i), "Str0ng!Pass");
    await user.type(
      screen.getByLabelText(/confirm new password/i),
      "Str0ng!Pass"
    );
    await user.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: /change your password/i })
      ).not.toBeInTheDocument();
    });
  });
});
