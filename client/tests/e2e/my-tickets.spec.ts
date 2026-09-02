import { test, expect } from "@playwright/test";

test.describe("My Tickets", () => {
  async function selectAlice(page: any) {
    await page.goto("/");

    const requesterSelect = page.locator("#requester-select");

    await expect(requesterSelect).toBeVisible();

    await requesterSelect.selectOption({
      label: "Alice Johnson",
    });

    await page.getByRole("button", { name: /Continue/i }).click();
  }

  async function createTicket(
    page: any,
    summary: string,
    category = "Hardware",
    priority = "MEDIUM"
  ) {
    await page.getByRole("main").getByRole("button", {
      name: "+ Create Ticket",
    }).first().click();

    await expect(
      page.getByRole("heading", { name: "Create Ticket" })
    ).toBeVisible();

    const selects = page.locator("select");

    await selects.nth(0).selectOption({
      label: category,
    });

    await selects.nth(1).selectOption({
      label: "Corporate Laptop",
    });

    await selects.nth(2).selectOption(priority);

    await page.locator('input[type="text"]').fill(summary);

    await page.locator("textarea").fill(
      `This ticket is created by Playwright for ${summary}.`
    );

    await page.getByRole("button", {
      name: "Create Ticket",
      exact: true,
    }).click();

    await expect(
      page.getByRole("heading", { name: "Ticket Created" })
    ).toBeVisible();

    await page
      .getByRole("button", { name: "Go to My Tickets" })
      .click();

    await expect(
      page.getByRole("heading", { name: "My Tickets", exact: true })
    ).toBeVisible();
  }

  async function searchTicket(page: any, summary: string) {
    const searchInput = page.getByPlaceholder(
      "Search by ticket number or summary..."
    );

    await expect(searchInput).toBeVisible();

    await searchInput.fill(summary);

    await expect(
      page.getByText(summary, { exact: true }).first()
    ).toBeVisible();
  }

  test("displays the newly created ticket", async ({ page }) => {
    await selectAlice(page);

    const summary =
      `E2E My Tickets test ticket ${Date.now()}`;

    await createTicket(page, summary, "Hardware", "HIGH");

    await searchTicket(page, summary);
  });

  test("can search tickets by summary", async ({ page }) => {
    await selectAlice(page);

    const summary =
      `E2E Search Ticket Test ${Date.now()}`;

    await createTicket(page, summary, "Hardware", "MEDIUM");

    await searchTicket(page, summary);
  });

  test("can filter tickets by category", async ({ page }) => {
    await selectAlice(page);

    const hardwareSummary =
      `E2E Hardware Filter ${Date.now()}`;

    const softwareSummary =
      `E2E Software Filter ${Date.now()}`;

    await createTicket(
      page,
      hardwareSummary,
      "Hardware",
      "MEDIUM"
    );

    await createTicket(
      page,
      softwareSummary,
      "Software",
      "MEDIUM"
    );

    const categorySelect = page.locator("select").filter({
      has: page.locator('option', { hasText: "All Categories" }),
    });

    await expect(categorySelect).toBeVisible();

    await categorySelect.selectOption({
      label: "Hardware",
    });

    await searchTicket(page, hardwareSummary);

    const searchInput = page.getByPlaceholder(
      "Search by ticket number or summary..."
    );

    await searchInput.fill("");

    await expect(
      page.getByText(softwareSummary, { exact: true })
    ).toHaveCount(0);
  });

  test("can filter tickets by requested priority", async ({
    page,
  }) => {
    await selectAlice(page);

    const highSummary =
      `E2E High Priority Filter ${Date.now()}`;

    const lowSummary =
      `E2E Low Priority Filter ${Date.now()}`;

    await createTicket(
      page,
      highSummary,
      "Hardware",
      "HIGH"
    );

    await createTicket(
      page,
      lowSummary,
      "Hardware",
      "LOW"
    );

    // Selects on My Tickets are ordered: 0 = Category, 1 = Requested
    // Priority, 2 = IT Priority, 3 = Current Status.
    const prioritySelect = page.locator("select").nth(1);

    await expect(prioritySelect).toBeVisible();

    await prioritySelect.selectOption("HIGH");

    await searchTicket(page, highSummary);

    const searchInput = page.getByPlaceholder(
      "Search by ticket number or summary..."
    );

    await searchInput.fill("");

    await expect(
      page.getByText(lowSummary, { exact: true })
    ).toHaveCount(0);
  });

  test("can filter tickets by status", async ({ page }) => {
    await selectAlice(page);

    const summary =
      `E2E Status Filter ${Date.now()}`;

    await createTicket(
      page,
      summary,
      "Hardware",
      "MEDIUM"
    );

    const statusSelect = page.locator("select").nth(3);

    await expect(statusSelect).toBeVisible();

    await statusSelect.selectOption("NEW");

    await searchTicket(page, summary);
  });

  test("can sort tickets by summary ascending", async ({ page }) => {
    await selectAlice(page);

    const timestamp = Date.now();

    const summaryA = `AAA E2E Sort ${timestamp}`;
    const summaryB = `ZZZ E2E Sort ${timestamp}`;

    await createTicket(
      page,
      summaryB,
      "Hardware",
      "MEDIUM"
    );

    await createTicket(
      page,
      summaryA,
      "Hardware",
      "MEDIUM"
    );

    const sortBySelect = page.locator("select").nth(4);
    const orderSelect = page.locator("select").nth(5);

    await sortBySelect.selectOption("summary");
    await orderSelect.selectOption("asc");

    await expect(
      page.getByRole("heading", { name: "My Tickets", exact: true })
    ).toBeVisible();

    await expect(
      page.getByText("Loading...", { exact: true })
    ).toBeHidden();

    const searchInput = page.getByPlaceholder(
      "Search by ticket number or summary..."
    );

    await searchInput.fill(`E2E Sort ${timestamp}`);

    const summaryALocator = page.getByText(summaryA, {
      exact: true,
    });

    const summaryBLocator = page.getByText(summaryB, {
      exact: true,
    });

    await expect(summaryALocator.first()).toBeVisible();
    await expect(summaryBLocator.first()).toBeVisible();

    const summaryTexts = await page
      .getByText(/^(AAA|ZZZ) E2E Sort \d+$/, { exact: false })
      .allTextContents();

    const indexA = summaryTexts.indexOf(summaryA);
    const indexB = summaryTexts.indexOf(summaryB);

    expect(indexA).toBeGreaterThanOrEqual(0);
    expect(indexB).toBeGreaterThanOrEqual(0);

    expect(indexA).toBeLessThan(indexB);
  });

  test("can sort tickets by summary descending", async ({ page }) => {
    await selectAlice(page);

    const timestamp = Date.now();

    const summaryA = `AAA E2E Desc Sort ${timestamp}`;
    const summaryB = `ZZZ E2E Desc Sort ${timestamp}`;

    await createTicket(
      page,
      summaryA,
      "Hardware",
      "MEDIUM"
    );

    await createTicket(
      page,
      summaryB,
      "Hardware",
      "MEDIUM"
    );

    const sortBySelect = page.locator("select").nth(4);
    const orderSelect = page.locator("select").nth(5);

    await sortBySelect.selectOption("summary");
    await orderSelect.selectOption("desc");

    await expect(
      page.getByText("Loading...", { exact: true })
    ).toBeHidden();

    const searchInput = page.getByPlaceholder(
      "Search by ticket number or summary..."
    );

    await searchInput.fill(`E2E Desc Sort ${timestamp}`);

    const summaryALocator = page.getByText(summaryA, {
      exact: true,
    }).first();

    const summaryBLocator = page.getByText(summaryB, {
      exact: true,
    }).first();

    await expect(summaryALocator).toBeVisible();
    await expect(summaryBLocator).toBeVisible();

    const boxA = await summaryALocator.boundingBox();
    const boxB = await summaryBLocator.boundingBox();

    expect(boxA).not.toBeNull();
    expect(boxB).not.toBeNull();

    expect(boxB!.y).toBeLessThan(boxA!.y);
  });

  test("can paginate through tickets", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name === "mobile",
      "Mobile uses card layout, not a table — covered by visual QA instead"
    );

    await selectAlice(page);

    const timestamp = Date.now();

    for (let i = 1; i <= 11; i++) {
      await createTicket(
        page,
        `E2E Pagination ${timestamp} ${i}`,
        "Hardware",
        "MEDIUM"
      );
    }

    const searchInput = page.getByPlaceholder(
      "Search by ticket number or summary..."
    );

    await searchInput.fill("");

    const pagination = page.getByRole("navigation", {
      name: "Ticket pagination",
    });

    await expect(pagination).toBeVisible();

    const pageTwo = pagination.getByRole("button", {
      name: "2",
      exact: true,
    });

    await expect(pageTwo).toBeVisible();

    await pageTwo.evaluate(() => {
      const buttons = Array.from(
        document.querySelectorAll("button")
      );

      const button = buttons.find(
        (btn) => btn.textContent?.trim() === "2"
      ) as HTMLButtonElement | undefined;

      if (!button) {
        throw new Error("Page 2 button not found");
      }

      button.click();
    });

    await expect(
      page.getByText(/Showing 11 to \d+ of \d+/)
    ).toBeVisible();

    await expect(
      page.locator("tbody tr").first()
    ).toBeVisible();

    const previousButton = pagination.getByRole("button", {
      name: "Previous",
    });

    await expect(previousButton).toBeEnabled();

    const pageOne = pagination.getByRole("button", {
      name: "1",
      exact: true,
    });

    await pageOne.evaluate(() => {
      const buttons = Array.from(
        document.querySelectorAll("button")
      );

      const button = buttons.find(
        (btn) => btn.textContent?.trim() === "1"
      ) as HTMLButtonElement | undefined;

      if (!button) {
        throw new Error("Page 1 button not found");
      }

      button.click();
    });

    await expect(
      page.getByText(/Showing 1 to 10 of \d+/)
    ).toBeVisible();

    await expect(
      page.locator("tbody tr").first()
    ).toBeVisible();

    await expect(previousButton).toBeDisabled();
  });

  test("clear filters resets the ticket list", async ({ page }) => {
    await selectAlice(page);

    const summary =
      `E2E Clear Filters Test ${Date.now()}`;

    await createTicket(
      page,
      summary,
      "Hardware",
      "MEDIUM"
    );

    const searchInput = page.getByPlaceholder(
      "Search by ticket number or summary..."
    );

    await searchInput.fill(summary);

    await expect(
      page.getByText(summary, { exact: true }).first()
    ).toBeVisible();

    await page.getByRole("button", {
      name: "Clear Filters",
    }).click();

    await expect(searchInput).toHaveValue("");

    await searchInput.fill(summary);

    await expect(
      page.getByText(summary, { exact: true }).first()
    ).toBeVisible();
  });
});
