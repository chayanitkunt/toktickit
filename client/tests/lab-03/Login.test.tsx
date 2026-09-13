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

function mockFetchRoutes(routes: {
  me?: () => Response;
  login?: () => Response;
}) {
  vi.spyOn(globalThis, "fetch").mockImplementation(
    async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("/api/auth/me")) {
        return routes.me
          ? routes.me()
          : jsonResponse({ error: "Authentication required" }, 401);
      }

      if (url.includes("/api/auth/login")) {
        return routes.login
          ? routes.login()
          : jsonResponse({ error: "Invalid email or password" }, 401);
      }

      throw new Error(`Unexpected fetch call to ${url}`);
    }
  );
}

describe("Login screen", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the Login screen when there is no active session", async () => {
    mockFetchRoutes({});

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /sign in to your account/i })
      ).toBeInTheDocument();
    });
  });

  it("shows validation errors when submitting an empty form", async () => {
    mockFetchRoutes({});
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(
      await screen.findByText("Email address is required.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Password is required.")
    ).toBeInTheDocument();
  });

  it("shows a safe error banner on invalid credentials", async () => {
    mockFetchRoutes({
      login: () => jsonResponse({ error: "Invalid email or password" }, 401),
    });
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/email address/i), "jennifer.anderson@tiktockit.com");
    await user.type(screen.getByLabelText(/^password$/i), "wrong-password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(
      await screen.findByText("Invalid email or password")
    ).toBeInTheDocument();
  });

  it("shows a busy state while the login request is in flight", async () => {
    let resolveLogin: (() => void) | undefined;

    vi.spyOn(globalThis, "fetch").mockImplementation(
      async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input.toString();

        if (url.includes("/api/auth/me")) {
          return jsonResponse({ error: "Authentication required" }, 401);
        }

        if (url.includes("/api/auth/login")) {
          return new Promise<Response>((resolve) => {
            resolveLogin = () =>
              resolve(
                jsonResponse({
                  id: 10,
                  name: "Jennifer Anderson",
                  role: "ADMINISTRATOR",
                  mustChangePassword: false,
                })
              );
          });
        }

        if (url.includes("/api/requesters")) {
          return jsonResponse([]);
        }

        throw new Error(`Unexpected fetch call to ${url}`);
      }
    );

    const user = userEvent.setup();

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    });

    await user.type(
      screen.getByLabelText(/email address/i),
      "jennifer.anderson@tiktockit.com"
    );
    await user.type(screen.getByLabelText(/^password$/i), "ChangeMe123!");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(
      await screen.findByRole("button", { name: /signing in/i })
    ).toBeDisabled();

    resolveLogin?.();

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: /sign in to your account/i })
      ).not.toBeInTheDocument();
    });
  });
});
