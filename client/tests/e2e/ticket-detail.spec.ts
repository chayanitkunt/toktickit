import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
import {
  loginAsRequester,
  switchToRequester,
  REQUESTER_A,
  REQUESTER_B,
  SEED_PASSWORD,
} from "./helpers/auth";

const API_URL = "http://localhost:3000";

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

// Issue 4: GET /api/requesters (the Development Requester list) is removed.
// Ownership checks now go through a real authenticated session cookie
// instead of an X-Requester-Id header, so this logs in via the API and
// returns the resulting request context (which carries the cookie) plus
// the caller's own id from /api/auth/me.
async function loginApi(
  request: APIRequestContext,
  email: string
): Promise<{ id: number }> {
  const loginResponse = await request.post(`${API_URL}/api/auth/login`, {
    data: { email, password: SEED_PASSWORD },
  });

  expect(loginResponse.ok()).toBe(true);

  const me = await loginResponse.json();
  return { id: me.id };
}

test.describe("Requester Ticket Detail — view mode", () => {
  test("opens a ticket from My Tickets and shows read-only ticket information", async ({
    page,
  }) => {
    await loginAsRequester(page, REQUESTER_A.email);

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
    // Lab 3: IT Priority defaults to Requested Priority (BR-07), so both
    // badges read "HIGH" here — .first() avoids a strict-mode violation
    // while still confirming the priority rendered somewhere on the page.
    await expect(page.getByText("HIGH").first()).toBeVisible();
    await expect(page.getByText("Corporate Laptop")).toBeVisible();
    // Lab 3 added a dedicated "New" status ahead of "Open" in the required
    // status set (§4.5); ticket creation sets currentStatus to NEW, and
    // only IT Staff can later transition it to Open — a freshly created
    // ticket reads "New", not "Open".
    await expect(page.getByText("New", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "← Back to My Tickets" }).click();

    await expect(
      page.getByRole("heading", { name: "My Tickets", exact: true })
    ).toBeVisible();
  });
});

test.describe("Requester Ticket Detail — attachments", () => {
  test("can download an active attachment", async ({ page }) => {
    await loginAsRequester(page, REQUESTER_A.email);

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
    await loginAsRequester(page, REQUESTER_A.email);

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
    // Log in as Requester A directly against the API; supertest-style
    // APIRequestContext carries the resulting session cookie automatically
    // for subsequent calls made with this same `request` fixture.
    const requesterA = await loginApi(request, REQUESTER_A.email);

    const aTicketsResponse = await request.get(`${API_URL}/api/tickets`);
    expect(aTicketsResponse.ok()).toBe(true);

    const aTickets = await aTicketsResponse.json();

    // Make sure Requester A actually owns at least one ticket to test
    // against, creating one via the API if necessary.
    let ticketId: number;
    if (aTickets.data.length > 0) {
      ticketId = aTickets.data[0].id;
    } else {
      const categoriesResponse = await request.get(`${API_URL}/api/categories`);
      const relatedSystemsResponse = await request.get(
        `${API_URL}/api/related-systems`
      );
      const categories = await categoriesResponse.json();
      const relatedSystems = await relatedSystemsResponse.json();

      const createResponse = await request.post(`${API_URL}/api/tickets`, {
        multipart: {
          categoryId: String(categories[0].id),
          relatedSystemId: String(relatedSystems[0].id),
          summary: "Ownership protection API test ticket",
          description:
            "Created directly via the API to test cross-requester access.",
          requestedPriority: "LOW",
        },
      });
      expect(createResponse.ok()).toBe(true);
      ticketId = (await createResponse.json()).id;
    }

    void requesterA; // id retained for clarity/debugging only

    // A brand-new API request context has no session cookie at all, so
    // logging in as Requester B here uses a fresh context to avoid mixing
    // cookies with Requester A's session on the shared `request` fixture.
    const loginAsB = await request.post(`${API_URL}/api/auth/login`, {
      data: { email: REQUESTER_B.email, password: SEED_PASSWORD },
    });
    expect(loginAsB.ok()).toBe(true);

    // NOTE: Playwright's `request` fixture shares one cookie jar per test,
    // so logging in as B above has already replaced A's session cookie
    // with B's. The next call is therefore made "as B".
    const crossAccessResponse = await request.get(
      `${API_URL}/api/tickets/${ticketId}`
    );

    expect(crossAccessResponse.status()).toBe(404);
  });

  test("one requester's ticket never appears in another requester's My Tickets list", async ({
    page,
  }) => {
    await loginAsRequester(page, REQUESTER_A.email);

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

    await switchToRequester(page, REQUESTER_B.email);

    const bobSearchInput = page.getByPlaceholder(
      "Search by ticket number or summary..."
    );

    await bobSearchInput.fill(summary);


    await expect(
      page.locator("tbody tr").filter({ hasText: summary })
    ).toHaveCount(0);
  });
});
