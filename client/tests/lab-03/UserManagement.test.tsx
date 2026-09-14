import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider } from "../../src/AuthContext.js";
import UserManagement from "../../src/components/UserManagement.js";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const CURRENT_ADMIN = {
  id: 20,
  name: "Jennifer Anderson",
  email: "jennifer.anderson@tiktockit.com",
  role: "ADMINISTRATOR",
  mustChangePassword: false,
};

const OTHER_ADMIN = {
  id: 21,
  name: "Sam Root",
  email: "sam.root@tiktockit.com",
  role: "ADMINISTRATOR",
  isActive: true,
  mustChangePassword: false,
  createdAt: "2026-01-01T00:00:00.000Z",
};

function sampleUsers() {
  return [
    {
      id: 20,
      name: "Jennifer Anderson",
      email: "jennifer.anderson@tiktockit.com",
      role: "ADMINISTRATOR",
      isActive: true,
      mustChangePassword: false,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: 9,
      name: "Michael Brown",
      email: "michael.brown@tiktockit.com",
      role: "IT_STAFF",
      isActive: true,
      mustChangePassword: false,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ];
}

interface Routes {
  list?: () => Response;
  create?: () => Response;
  patch?: () => Response;
  resetPassword?: () => Response;
}

function mockFetchRoutes(routes: Routes) {
  vi.spyOn(globalThis, "fetch").mockImplementation(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = (init?.method ?? "GET").toUpperCase();

      if (url.includes("/api/auth/me")) {
        return jsonResponse(CURRENT_ADMIN, 200);
      }

      if (url.includes("/api/admin/users") && method === "GET") {
        return routes.list
          ? routes.list()
          : jsonResponse(
              {
                data: sampleUsers(),
                meta: { total: 2, page: 1, pageSize: 50, totalPages: 1 },
              },
              200
            );
      }

      if (url.includes("/api/admin/users") && method === "POST" && url.includes("reset-password")) {
        return routes.resetPassword
          ? routes.resetPassword()
          : jsonResponse(OTHER_ADMIN, 200);
      }

      if (url.includes("/api/admin/users") && method === "POST") {
        return routes.create
          ? routes.create()
          : jsonResponse(
              {
                id: 99,
                name: "New Person",
                email: "new.person@tiktockit.com",
                role: "REQUESTER",
                isActive: true,
                mustChangePassword: true,
                createdAt: "2026-01-01T00:00:00.000Z",
              },
              201
            );
      }

      if (url.includes("/api/admin/users") && method === "PATCH") {
        return routes.patch
          ? routes.patch()
          : jsonResponse(
              { ...sampleUsers()[1], name: "Updated Name" },
              200
            );
      }

      throw new Error(`Unexpected fetch call to ${method} ${url}`);
    }
  );
}

function renderScreen() {
  return render(
    <AuthProvider>
      <UserManagement />
    </AuthProvider>
  );
}

describe("UserManagement", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a loading state, then renders the user list", async () => {
    mockFetchRoutes({});

    renderScreen();

    await waitFor(() => {
      expect(screen.getByText("Michael Brown")).toBeInTheDocument();
    });

    expect(screen.getByText("michael.brown@tiktockit.com")).toBeInTheDocument();
    const row = screen.getByText("Michael Brown").closest("tr")!;
    expect(within(row).getByText("IT Staff")).toBeInTheDocument();
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
  });

  it("renders the forbidden state for a non-Administrator", async () => {
    mockFetchRoutes({
      list: () =>
        jsonResponse(
          { error: "You do not have permission to perform this action" },
          403
        ),
    });

    renderScreen();

    await waitFor(() => {
      expect(
        screen.getByText(/do not have permission to view user management/i)
      ).toBeInTheDocument();
    });
  });

  it("renders the empty/no-results state when search matches nothing", async () => {
    mockFetchRoutes({
      list: () =>
        jsonResponse(
          { data: [], meta: { total: 0, page: 1, pageSize: 50, totalPages: 0 } },
          200
        ),
    });

    renderScreen();

    await waitFor(() => {
      expect(screen.getByText(/no users match your search/i)).toBeInTheDocument();
    });
  });

  it("shows a safe error banner on unexpected API failure", async () => {
    mockFetchRoutes({
      list: () => jsonResponse({ error: "Unable to retrieve users" }, 500),
    });

    renderScreen();

    await waitFor(() => {
      expect(screen.getByText("Unable to retrieve users")).toBeInTheDocument();
    });
  });

  it("validates the create-user form and blocks submit on missing fields", async () => {
    const user = userEvent.setup();
    mockFetchRoutes({});

    renderScreen();

    await waitFor(() => {
      expect(screen.getByText("Michael Brown")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /create user/i }));

    const dialog = await screen.findByRole("dialog", { name: /create new user/i });
    await user.click(within(dialog).getByRole("button", { name: /save user/i }));

    expect(
      within(dialog).getByText(/full name is required/i)
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(/initial password is required/i)
    ).toBeInTheDocument();
  });

  it("creates a user and shows a success toast", async () => {
    const user = userEvent.setup();
    mockFetchRoutes({});

    renderScreen();

    await waitFor(() => {
      expect(screen.getByText("Michael Brown")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /create user/i }));

    const dialog = await screen.findByRole("dialog", { name: /create new user/i });

    await user.type(within(dialog).getByLabelText(/full name/i), "New Person");
    await user.type(
      within(dialog).getByLabelText(/email address/i),
      "new.person@tiktockit.com"
    );
    await user.type(
      within(dialog).getByLabelText(/initial password/i),
      "TempPass1!"
    );

    await user.click(within(dialog).getByRole("button", { name: /save user/i }));

    await waitFor(() => {
      expect(screen.getByText("User created")).toBeInTheDocument();
    });
  });

  it("shows a duplicate-email conflict banner inside the panel instead of closing it", async () => {
    const user = userEvent.setup();
    mockFetchRoutes({
      create: () =>
        jsonResponse(
          { error: "A user with this email already exists", code: "conflict" },
          409
        ),
    });

    renderScreen();

    await waitFor(() => {
      expect(screen.getByText("Michael Brown")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /create user/i }));

    const dialog = await screen.findByRole("dialog", { name: /create new user/i });

    await user.type(within(dialog).getByLabelText(/full name/i), "Dup Person");
    await user.type(
      within(dialog).getByLabelText(/email address/i),
      "michael.brown@tiktockit.com"
    );
    await user.type(
      within(dialog).getByLabelText(/initial password/i),
      "TempPass1!"
    );

    await user.click(within(dialog).getByRole("button", { name: /save user/i }));

    await waitFor(() => {
      expect(
        within(dialog).getByText(/a user with this email already exists/i)
      ).toBeInTheDocument();
    });
  });

  it("edits a user's basic account information", async () => {
    const user = userEvent.setup();
    mockFetchRoutes({});

    renderScreen();

    await waitFor(() => {
      expect(screen.getByText("Michael Brown")).toBeInTheDocument();
    });

    const row = screen.getByText("Michael Brown").closest("tr")!;
    await user.click(within(row).getByRole("button", { name: /edit/i }));

    const dialog = await screen.findByRole("dialog", { name: /edit user/i });
    const nameInput = within(dialog).getByLabelText(/full name/i);

    await user.clear(nameInput);
    await user.type(nameInput, "Updated Name");
    await user.click(within(dialog).getByRole("button", { name: /save user/i }));

    await waitFor(() => {
      expect(screen.getByText("User updated")).toBeInTheDocument();
    });
  });

  it("disables self-deactivation and shows the safety-rule message", async () => {
    const user = userEvent.setup();
    mockFetchRoutes({});

    renderScreen();

    await waitFor(() => {
      expect(screen.getByText("Jennifer Anderson")).toBeInTheDocument();
    });

    const row = screen.getByText("Jennifer Anderson").closest("tr")!;
    await user.click(within(row).getByRole("button", { name: /edit/i }));

    const dialog = await screen.findByRole("dialog", { name: /edit user/i });

    expect(
      within(dialog).getByRole("button", { name: /deactivate user/i })
    ).toBeDisabled();
    expect(
      within(dialog).getByText(/you can't deactivate your own account/i)
    ).toBeInTheDocument();
  });

  it("shows the last-active-Administrator banner returned by the API", async () => {
    const user = userEvent.setup();
    mockFetchRoutes({
      list: () =>
        jsonResponse(
          {
            data: [
              {
                id: 30,
                name: "Only Admin",
                email: "only.admin@tiktockit.com",
                role: "ADMINISTRATOR",
                isActive: true,
                mustChangePassword: false,
                createdAt: "2026-01-01T00:00:00.000Z",
              },
            ],
            meta: { total: 1, page: 1, pageSize: 50, totalPages: 1 },
          },
          200
        ),
      patch: () =>
        jsonResponse(
          { error: "Cannot remove the last active Administrator", code: "last_admin" },
          409
        ),
    });

    renderScreen();

    await waitFor(() => {
      expect(screen.getByText("Only Admin")).toBeInTheDocument();
    });

    const row = screen.getByText("Only Admin").closest("tr")!;
    await user.click(within(row).getByRole("button", { name: /edit/i }));

    const dialog = await screen.findByRole("dialog", { name: /edit user/i });
    await user.click(
      within(dialog).getByRole("button", { name: /deactivate user/i })
    );

    await waitFor(() => {
      expect(
        within(dialog).getByText(/cannot remove the last active administrator/i)
      ).toBeInTheDocument();
    });
  });

  it("sets a new initial password from the edit panel", async () => {
    const user = userEvent.setup();
    mockFetchRoutes({});

    renderScreen();

    await waitFor(() => {
      expect(screen.getByText("Michael Brown")).toBeInTheDocument();
    });

    const row = screen.getByText("Michael Brown").closest("tr")!;
    await user.click(within(row).getByRole("button", { name: /edit/i }));

    const dialog = await screen.findByRole("dialog", { name: /edit user/i });
    await user.click(
      within(dialog).getByRole("button", { name: /set new initial password/i })
    );

    await user.type(
      within(dialog).getByLabelText(/new initial password/i),
      "FreshPass1!"
    );
    await user.click(within(dialog).getByRole("button", { name: /^set password$/i }));

    await waitFor(() => {
      expect(screen.getByText("New initial password set")).toBeInTheDocument();
    });
  });

  it("filters the user list by role", async () => {
    const user = userEvent.setup();
    const list = vi.fn(() =>
      jsonResponse(
        {
          data: sampleUsers(),
          meta: { total: 2, page: 1, pageSize: 50, totalPages: 1 },
        },
        200
      )
    );
    mockFetchRoutes({ list });

    renderScreen();

    await waitFor(() => {
      expect(screen.getByText("Michael Brown")).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText(/^role$/i), "IT_STAFF");

    await waitFor(() => {
      const lastCall = list.mock.calls.length;
      expect(lastCall).toBeGreaterThan(1);
    });
  });
});
