import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Issue 8 — GitHub Issue #35: Lab 3 E2E, responsive, and visual QA
// Covers E2E-04 (docs/lab-03/tests.md): the full IT Staff workflow —
// queue search -> open -> claim -> IT Priority -> status -> Public Comment
// -> Internal Note -> reassignment by a second IT Staff member -> Requester
// visibility of the result (BR-04, FR-09 through FR-14).
//
// All seeded accounts share the fake local-dev password documented in
// server/prisma/seed.ts and README.md. Never a real credential.
// ---------------------------------------------------------------------------

const SEED_PASSWORD = "ChangeMe123!";

// quinn.requester@example.com is a dedicated automation Requester account
// exempt from mustChangePassword (see server/prisma/seed.ts), so this spec
// can log straight into My Tickets without exercising the first-login flow.
const REQUESTER_EMAIL = "quinn.requester@example.com";

// michael.brown@tiktockit.com and staff.automation.b@tiktockit.com are the
// two dedicated IT Staff automation accounts, also exempt from
// mustChangePassword, used here to exercise claim + reassignment between
// two different staff members.
const STAFF_A_EMAIL = "michael.brown@tiktockit.com";
const STAFF_A_NAME = "Michael Brown";
const STAFF_B_EMAIL = "staff.automation.b@tiktockit.com";
const STAFF_B_NAME = "Jordan Ops";

async function login(page: import("@playwright/test").Page, email: string) {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /sign in to your account/i })
  ).toBeVisible();

  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/^password$/i).fill(SEED_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
}

async function logout(page: import("@playwright/test").Page) {
  await page
    .getByTestId("current-user-identity")
    .getByRole("button", { name: /logout/i })
    .click();

  await expect(
    page.getByRole("heading", { name: /sign in to your account/i })
  ).toBeVisible();
}

test.describe.serial("IT Staff Ticket Flow (E2E-04)", () => {
  let ticketNumber: string;

  test("Requester creates a fresh, unassigned ticket for this run", async ({
    page,
  }) => {
    await login(page, REQUESTER_EMAIL);
    await expect(
      page.getByRole("heading", { name: "My Tickets", exact: true })
    ).toBeVisible();

    const summary = `E2E Staff Flow Ticket ${Date.now()}`;

    await page
      .getByRole("main")
      .getByRole("button", { name: "+ Create Ticket" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Create Ticket" })
    ).toBeVisible();

    const selects = page.locator("select");
    await selects.nth(0).selectOption({ label: "Hardware" });
    await selects.nth(1).selectOption({ label: "Corporate Laptop" });
    await selects.nth(2).selectOption("MEDIUM");

    await page.locator('input[type="text"]').fill(summary);
    await page
      .locator("textarea")
      .fill("Created by the Lab 3 staff-ticket-flow E2E spec.");

    await page
      .getByRole("button", { name: "Create Ticket", exact: true })
      .click();

    await expect(
      page.getByRole("heading", { name: "Ticket Created" })
    ).toBeVisible();

    const ticketNumberText = await page
      .getByText(/TKT-\d{4}-\d{6}/)
      .innerText();
    ticketNumber = ticketNumberText.match(/TKT-\d{4}-\d{6}/)![0];
    expect(ticketNumber).toBeTruthy();

    await page.getByRole("button", { name: "Go to My Tickets" }).click();
    await logout(page);
  });

  test("IT Staff A finds the ticket in the queue, claims it, sets IT Priority and status, posts a Public Comment and an Internal Note", async ({
    page,
  }) => {
    await login(page, STAFF_A_EMAIL);
    await expect(
      page.getByRole("heading", { name: "My Queue", exact: true })
    ).toBeVisible();

    // --- Search ---
    await page.getByLabel(/^search$/i).fill(ticketNumber);

    const row = page.locator("tr", { hasText: ticketNumber });
    await expect(row).toBeVisible();
    await expect(row).toContainText("Unassigned");

    await row.getByRole("button", { name: ticketNumber }).click();

    await expect(page.getByText(ticketNumber)).toBeVisible();

    // --- Claim (FR-11/BR-06) ---
    await page.getByRole("button", { name: /^claim$/i }).click();

    const ownerSelect = page.getByLabel(/ticket owner/i);
    await expect(ownerSelect.locator("option:checked")).toHaveText(
      new RegExp(`${STAFF_A_NAME} \\(Me\\)`)
    );

    // --- IT Priority (FR-12/BR-07) ---
    await page.getByLabel(/it priority/i).selectOption("HIGH");
    await expect(page.getByLabel(/it priority/i)).toHaveValue("HIGH");

    // --- Status: NEW -> OPEN -> IN_PROGRESS (FR-13/BR-08) ---
    await page.getByLabel(/current status/i).selectOption("OPEN");
    await expect(page.getByText("Open", { exact: true }).first()).toBeVisible();

    await page.getByLabel(/current status/i).selectOption("IN_PROGRESS");
    await expect(
      page.getByText("In Progress", { exact: true }).first()
    ).toBeVisible();

    // --- Public Comment (FR-14/BR-04) ---
    await page
      .getByLabel(/add public comment/i)
      .fill("We are investigating this. Will update you shortly.");
    await page.getByRole("button", { name: /post comment/i }).click();

    await expect(page.getByText(/Public Comments \(1\)/i)).toBeVisible();
    await expect(
      page.getByText("We are investigating this. Will update you shortly.")
    ).toBeVisible();

    // --- Internal Note — visually distinct, staff-only (FR-14/BR-04) ---
    await page.getByRole("tab", { name: /internal notes/i }).click();
    await page
      .getByLabel(/add internal note/i)
      .fill("Ordered a replacement part; ETA two business days.");
    await page.getByRole("button", { name: /post internal note/i }).click();

    await expect(page.getByText(/Internal Notes \(1\)/i)).toBeVisible();
    await expect(
      page.getByText("Ordered a replacement part; ETA two business days.")
    ).toBeVisible();
    // Internal — not visible to Requester banner confirms visual separation
    // from Public Comments (BR-04).
    await expect(
      page.getByText(/internal.*not visible to requester/i)
    ).toBeVisible();

    await logout(page);
  });

  test("IT Staff B reassigns the ticket and can see IT Staff A's Internal Note", async ({
    page,
  }) => {
    await login(page, STAFF_B_EMAIL);
    await expect(
      page.getByRole("heading", { name: "My Queue", exact: true })
    ).toBeVisible();

    await page.getByLabel(/^search$/i).fill(ticketNumber);
    const row = page.locator("tr", { hasText: ticketNumber });
    await expect(row).toContainText(STAFF_A_NAME);

    await row.getByRole("button", { name: ticketNumber }).click();
    await expect(page.getByText(ticketNumber)).toBeVisible();

    // Currently owned by Staff A, so the button reads "Assign", not "Claim".
    await expect(page.getByRole("button", { name: /^claim$/i })).toHaveCount(
      0
    );

    const ownerSelect = page.getByLabel(/ticket owner/i);
    await ownerSelect.selectOption({ label: `${STAFF_B_NAME} (Me)` });

    // Sanity-check the <select>'s own value actually changed before we
    // blame the Assign button — if this fails, the bug is in how the
    // dropdown's onChange updates state, not in the button's disabled
    // condition.
    const bOption = ownerSelect.locator("option", {
      hasText: `${STAFF_B_NAME} (Me)`,
    });
    const bValue = await bOption.getAttribute("value");
    await expect(ownerSelect).toHaveValue(bValue!);

    const assignButton = page.getByRole("button", { name: /^assign$/i });
    // Fail fast with a clear assertion instead of a 30s actionability
    // timeout if the button is genuinely stuck disabled.
    await expect(assignButton).toBeEnabled({ timeout: 5000 });
    await assignButton.click();

    await expect(ownerSelect.locator("option:checked")).toHaveText(
      new RegExp(`${STAFF_B_NAME} \\(Me\\)`)
    );

    // Internal Notes are shared across all IT Staff/Administrator accounts,
    // not scoped to whoever wrote them (BR-04).
    await page.getByRole("tab", { name: /internal notes/i }).click();
    await expect(
      page.getByText("Ordered a replacement part; ETA two business days.")
    ).toBeVisible();

    await logout(page);
  });

  test("Requester sees the Public Comment, never sees Internal Notes, and can flag the problem as appearing resolved", async ({
    page,
  }) => {
    await login(page, REQUESTER_EMAIL);
    await expect(
      page.getByRole("heading", { name: "My Tickets", exact: true })
    ).toBeVisible();

    await page.getByLabel(/^search$/i).fill(ticketNumber);
    const row = page.locator("tr", { hasText: ticketNumber });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: ticketNumber }).click();

    await expect(
      page.getByRole("heading", { name: ticketNumber })
    ).toBeVisible();

    // Public Comment from IT Staff is visible to the Requester (BR-04).
    await expect(
      page.getByText("We are investigating this. Will update you shortly.")
    ).toBeVisible();

    // Internal Note content and any "Internal Notes" UI must never appear
    // on the Requester's own Ticket Detail screen (BR-04/AC-04).
    await expect(
      page.getByText("Ordered a replacement part; ETA two business days.")
    ).toHaveCount(0);
    await expect(page.getByText(/internal notes/i)).toHaveCount(0);

    // Requester may flag the problem as appearing resolved, but cannot
    // formally resolve/close the Ticket (BR-05) — status stays In Progress.
    await page
      .getByRole("button", { name: /mark problem appears resolved/i })
      .click();

    await expect(
      page.getByText("You marked this resolved")
    ).toBeVisible();
    await expect(page.getByText("In Progress", { exact: true })).toBeVisible();

    // --- Role-based authorization: direct API check (AC-04/BR-04) ---
    // Even with an authenticated Requester session, the Internal Notes
    // endpoint must reject the request without leaking note content —
    // using a different, always-present seeded ticket id here so this
    // check doesn't depend on knowing this run's numeric ticket id.
    const apiBaseURL = process.env.VITE_API_URL ?? "http://localhost:3000";
    const notesResponse = await page.request.get(
      `${apiBaseURL}/api/staff/tickets/1/notes`
    );
    expect(notesResponse.status()).toBe(403);

    const notesBody = await notesResponse.json().catch(() => null);
    expect(Array.isArray(notesBody)).toBe(false);
  });
});
