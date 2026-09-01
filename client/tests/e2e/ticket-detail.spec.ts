import { test, expect, type Page, type APIRequestContext } from "@playwright/test";

const API_URL = "http://localhost:3000";

async function selectRequester(page: Page, label: string, name: string) {
  await page.goto("/");

  const requesterSelect = page.locator("#requester-select");

  await expect(requesterSelect).toBeVisible();

  await requesterSelect.selectOption({ label });

  await expect(
    page.getByText(`Current requester: ${name}`, { exact: true })
  ).toBeVisible();
}

async function createTicket(
  page: Page,
  summary: string,
  category = "Hardware",
  priority = "MEDIUM"
) {
  await page.getByRole("button", { name: "+ Create Ticket" }).click();

  await expect(
    page.getByRole("heading", { name: "Create Ticket" })
  ).toBeVisible();

  const selects = page.locator("select");

  // 0 = Development Requester, 1 = Category, 2 = Related System, 3 = Priority
  await selects.nth(1).selectOption({ label: category });
  await selects.nth(2).selectOption({ label: "Corporate Laptop" });
  await selects.nth(3).selectOption(priority);

  await page.locator('input[type="text"]').fill(summary);

  await page
    .locator("textarea")
    .fill(`This ticket is created by Playwright for ${summary}.`);

  await page.getByRole("button", { name: "Create Ticket" }).click();

  await expect(
    page.getByRole("heading", { name: "Create Ticket" })
  ).not.toBeVisible();

  await expect(page.getByText("My Tickets", { exact: true })).toBeVisible();
}

async function openTicketBySummary(page: Page, summary: string) {
  const searchInput = page.getByPlaceholder(
    "Search by ticket number or summary..."
  );

  await expect(searchInput).toBeVisible();
  await searchInput.fill(summary);

  const row = page.locator("tbody tr").filter({ hasText: summary });

  await expect(row).toHaveCount(1);

  await row.getByRole("button").click();
}

async function findRequesterId(
  request: APIRequestContext,
  name: string
): Promise<number> {
  const response = await request.get(`${API_URL}/api/requesters`);

  expect(response.ok()).toBe(true);

  const requesters: Array<{ id: number; name: string }> =
    await response.json();

  const requester = requesters.find((item) => item.name === name);

  expect(requester).toBeDefined();

  return requester!.id;
}

test.describe("Requester Ticket Detail — view mode", () => {
  test("opens a ticket from My Tickets and shows read-only ticket information", async ({
    page,
  }) => {
    await selectRequester(
      page,
      "Alice Johnson (alice@example.com)",
      "Alice Johnson"
    );

    const summary = `E2E Ticket Detail View ${Date.now()}`;

    await createTicket(page, summary, "Hardware", "HIGH");
    await openTicketBySummary(page, summary);

    await expect(
      page.getByRole("heading", { name: /^TKT-\d{4}-\d{6}$/ })
    ).toBeVisible();

    await expect(
      page.getByText("Loading...", { exact: true })
    ).toBeHidden();

    await expect(page.getByText(summary, { exact: true })).toBeVisible();
    await expect(page.getByText("Hardware")).toBeVisible();
    await expect(page.getByText("HIGH")).toBeVisible();
    await expect(page.getByText("Corporate Laptop")).toBeVisible();
    await expect(page.getByText("NEW")).toBeVisible();

    await page.getByRole("button", { name: "← Back to My Tickets" }).click();

    await expect(page.getByText("My Tickets", { exact: true })).toBeVisible();
  });
});

test.describe("Requester Ticket Detail — attachments", () => {
  test("can download an active attachment", async ({ page }) => {
    await selectRequester(
      page,
      "Alice Johnson (alice@example.com)",
      "Alice Johnson"
    );

    // Uses the deterministic seeded ticket (TKT-2026-000001) which always
    // has exactly one active attachment, so this test does not depend on
    // any ticket created earlier in the run.
    await openTicketBySummary(page, "TKT-2026-000001");

    await expect(
      page.getByText("seed-test-attachment", { exact: false })
    ).toBeVisible();

    const downloadPromise = page.waitForEvent("download");

    await page
      .getByRole("button", { name: "Download" })
      .first()
      .click();

    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain("seed-test-attachment");
  });

  test("can add an attachment and then soft-remove it with a reason", async ({
    page,
  }) => {
    await selectRequester(
      page,
      "Alice Johnson (alice@example.com)",
      "Alice Johnson"
    );

    const summary = `E2E Attachment Lifecycle ${Date.now()}`;

    await createTicket(page, summary, "Software", "LOW");
    await openTicketBySummary(page, summary);

    await expect(page.getByText("Attachments (0)")).toBeVisible();
    await expect(page.getByText("No active attachments.")).toBeVisible();

    const fileInput = page.locator('input[type="file"]');

    await fileInput.setInputFiles({
      name: "lifecycle-test.png",
      mimeType: "image/png",
      buffer: Buffer.from("e2e attachment lifecycle test"),
    });

    await page.getByRole("button", { name: "Add Attachments" }).click();

    await expect(page.getByText("Attachments (1)")).toBeVisible();

    const attachmentRow = page
      .locator(".list-group-item")
      .filter({ hasText: "lifecycle-test.png" });

    await expect(attachmentRow).toBeVisible();

    // The app asks for a removal reason via window.prompt().
    page.once("dialog", async (dialog) => {
      expect(dialog.type()).toBe("prompt");
      await dialog.accept("No longer needed for this ticket");
    });

    await attachmentRow.getByRole("button", { name: "Remove" }).click();

    // A soft-removed attachment must disappear from the active list and
    // must not be downloadable — the API filters isRemoved attachments out
    // of GET /api/tickets/:id, so the active count returns to zero.
    await expect(page.getByText("Attachments (0)")).toBeVisible();
    await expect(
      page.locator(".list-group-item").filter({ hasText: "lifecycle-test.png" })
    ).toHaveCount(0);
  });
});

test.describe("Requester Ticket Detail — ownership protection", () => {
  test("a direct API request cannot retrieve another requester's ticket", async ({
    request,
  }) => {
    const aliceId = await findRequesterId(request, "Alice Johnson");
    const bobId = await findRequesterId(request, "Bob Smith");

    const aliceTicketsResponse = await request.get(`${API_URL}/api/tickets`, {
      headers: { "X-Requester-Id": String(aliceId) },
    });

    expect(aliceTicketsResponse.ok()).toBe(true);

    const aliceTickets = await aliceTicketsResponse.json();

    expect(aliceTickets.data.length).toBeGreaterThan(0);

    const ticketId = aliceTickets.data[0].id;

    const crossAccessResponse = await request.get(
      `${API_URL}/api/tickets/${ticketId}`,
      { headers: { "X-Requester-Id": String(bobId) } }
    );

    expect(crossAccessResponse.status()).toBe(404);
  });

  test("one requester's ticket never appears in another requester's My Tickets list", async ({
    page,
  }) => {
    await selectRequester(
      page,
      "Alice Johnson (alice@example.com)",
      "Alice Johnson"
    );

    const summary = `E2E Ownership Isolation ${Date.now()}`;

    await createTicket(page, summary, "Network", "MEDIUM");

    const searchInput = page.getByPlaceholder(
      "Search by ticket number or summary..."
    );

    await searchInput.fill(summary);

    await expect(
      page.locator("tbody tr").filter({ hasText: summary })
    ).toHaveCount(1);

    // Switch to a different requester and confirm the ticket is invisible.
    await selectRequester(
      page,
      "Bob Smith (bob@example.com)",
      "Bob Smith"
    );

    const bobSearchInput = page.getByPlaceholder(
      "Search by ticket number or summary..."
    );

    await bobSearchInput.fill(summary);


    await expect(
      page.locator("tbody tr").filter({ hasText: summary })
    ).toHaveCount(0);
  });
});
