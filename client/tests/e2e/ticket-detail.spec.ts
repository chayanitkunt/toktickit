import { test, expect, type Page, type APIRequestContext } from "@playwright/test";

const API_URL = "http://localhost:3000";

async function selectRequester(page: Page, label: string) {
  await page.goto("/");

  const requesterSelect = page.locator("#requester-select");

  await expect(requesterSelect).toBeVisible();

  await requesterSelect.selectOption({ label });

  await page.getByRole("button", { name: /Continue/i }).click();
}

async function createTicket(
  page: Page,
  summary: string,
  category = "Hardware",
  system = "Campus Wi-Fi",
  priority = "MEDIUM"
) {
  await page.getByRole("main").getByRole("button", {
    name: "+ Create Ticket",
  }).first().click();

  await expect(
    page.getByRole("heading", { name: "Create Ticket" })
  ).toBeVisible();

  const selects = page.locator("select");

  await selects.nth(0).selectOption({ label: category });
  await selects.nth(1).selectOption({ label: system });
  await selects.nth(2).selectOption(priority);

  await page.locator('input[type="text"]').fill(summary);

  await page
    .locator("textarea")
    .fill(`This ticket is created by Playwright for ${summary}.`);

  await page.getByRole("button", {
    name: "Create Ticket",
    exact: true,
  }).click();

  await expect(
    page.getByRole("heading", { name: "Ticket Created" })
  ).toBeVisible();

  await page.getByRole("button", { name: "Go to My Tickets" }).click();

  await expect(
    page.getByRole("heading", { name: "My Tickets", exact: true })
  ).toBeVisible();
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
    await selectRequester(page, "Alice Johnson");

    const summary = `E2E Ticket Detail View ${Date.now()}`;

    await createTicket(
      page,
      summary,
      "Hardware",
      "Corporate Laptop",
      "HIGH"
    );
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
    await expect(page.getByText("Open", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "← Back to My Tickets" }).click();

    await expect(
      page.getByRole("heading", { name: "My Tickets", exact: true })
    ).toBeVisible();
  });
});

test.describe("Requester Ticket Detail — attachments", () => {
  test("can download an active attachment", async ({ page }) => {
    await selectRequester(page, "Alice Johnson");

    const summary = `E2E Download Attachment ${Date.now()}`;
    await createTicket(page, summary, "Software", "Corporate Laptop", "LOW");
    await openTicketBySummary(page, summary);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "download-test.png",
      mimeType: "image/png",
      buffer: Buffer.from("e2e download attachment test content"),
    });

    await page.getByRole("button", { name: "Add Attachments" }).click();

    await expect(page.getByText("download-test.png")).toBeVisible();

    const downloadPromise = page.waitForEvent("download");

    await page
      .getByRole("button", { name: "Download" })
      .first()
      .click();

    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain("download-test.png");
  });

  test("can add an attachment and then soft-remove it with a reason", async ({
    page,
  }) => {
    await selectRequester(page, "Alice Johnson");

    const summary = `E2E Attachment Lifecycle ${Date.now()}`;

    await createTicket(
      page,
      summary,
      "Software",
      "Corporate Laptop",
      "LOW"
    );
    await openTicketBySummary(page, summary);

    await expect(
      page.getByText("Loading...", { exact: true })
    ).toBeHidden();

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

    page.once("dialog", async (dialog) => {
      expect(dialog.type()).toBe("prompt");
      await dialog.accept("No longer needed for this ticket");
    });

    await attachmentRow.getByRole("button", { name: "Remove" }).click();

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
    await selectRequester(page, "Alice Johnson");

    const summary = `E2E Ownership Isolation ${Date.now()}`;

    await createTicket(
      page,
      summary,
      "Network",
      "Corporate Laptop",
      "MEDIUM"
    );

    const searchInput = page.getByPlaceholder(
      "Search by ticket number or summary..."
    );

    await searchInput.fill(summary);

    await expect(
      page.locator("tbody tr").filter({ hasText: summary })
    ).toHaveCount(1);

    await selectRequester(page, "Bob Smith");

    const bobSearchInput = page.getByPlaceholder(
      "Search by ticket number or summary..."
    );

    await bobSearchInput.fill(summary);

    await expect(
      page.locator("tbody tr").filter({ hasText: summary })
    ).toHaveCount(0);
  });
});
