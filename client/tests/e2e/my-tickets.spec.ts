import { test, expect } from "@playwright/test";

test.describe("My Tickets", () => {
  async function selectAlice(page: any) {
    await page.goto("/");

    const requesterSelect = page.locator("#requester-select");

    await expect(requesterSelect).toBeVisible();

    await requesterSelect.selectOption({
      label: "Alice Johnson (alice@example.com)",
    });

    await expect(
      page.getByText("Current requester: Alice Johnson", {
        exact: true,
      })
    ).toBeVisible();
  }

  async function createTicket(
    page: any,
    summary: string,
    category = "Hardware",
    priority = "MEDIUM"
  ) {
    await page.getByRole("button", {
      name: "+ Create Ticket",
    }).click();

    await expect(
      page.getByRole("heading", { name: "Create Ticket" })
    ).toBeVisible();

    const selects = page.locator("select");

    await selects.nth(1).selectOption({
      label: category,
    });

    await selects.nth(2).selectOption({
      label: "Corporate Laptop",
    });

    await selects.nth(3).selectOption(priority);

    await page.locator('input[type="text"]').fill(summary);

    await page.locator("textarea").fill(
      `This ticket is created by Playwright for ${summary}.`
    );

    await page.getByRole("button", {
      name: "Create Ticket",
    }).click();

    await expect(
      page.getByText("My Tickets", { exact: true })
    ).toBeVisible();
  }

  async function searchTicket(page: any, summary: string) {
    const searchInput = page.getByPlaceholder(
      "Search by ticket number or summary..."
    );

    await expect(searchInput).toBeVisible();

    await searchInput.fill(summary);

    await expect(
      page.getByRole("cell", {
        name: summary,
      }).first()
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

    const categorySelect = page.locator("select").nth(1);

    await expect(categorySelect).toBeVisible();

    // Filter by Hardware.
    await categorySelect.selectOption({
      label: "Hardware",
    });

    // Search specifically for the Hardware ticket.
    await searchTicket(page, hardwareSummary);

    // Clear search so the category filter can be tested independently.
    const searchInput = page.getByPlaceholder(
      "Search by ticket number or summary..."
    );

    await searchInput.fill("");

    // The Software ticket should not appear in the current filtered results.
    await expect(
      page.getByRole("cell", {
        name: softwareSummary,
      })
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

    const prioritySelect = page.locator("select").nth(2);

    await expect(prioritySelect).toBeVisible();

    await prioritySelect.selectOption("HIGH");

    await searchTicket(page, highSummary);

    const searchInput = page.getByPlaceholder(
      "Search by ticket number or summary..."
    );

    await searchInput.fill("");

    await expect(
      page.getByRole("cell", {
        name: lowSummary,
      })
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

  await expect(page.getByText("My Tickets", { exact: true })).toBeVisible();

  await expect(
    page.getByText("Loading...", { exact: true })
  ).toBeHidden();



  const searchInput = page.getByPlaceholder(
    "Search by ticket number or summary..."
  );

  await searchInput.fill(`E2E Sort ${timestamp}`);

  // Use text instead of role="cell" so this works on
  // desktop, tablet, and mobile layouts.
  const summaryALocator = page.getByText(summaryA, {
    exact: true,
  });

  const summaryBLocator = page.getByText(summaryB, {
    exact: true,
  });

  await expect(summaryALocator).toBeVisible();
  await expect(summaryBLocator).toBeVisible();

  const summaryTexts = await page
    .getByText(/^(AAA|ZZZ) E2E Sort \d+$/, { exact: false })
    .allTextContents();

  const indexA = summaryTexts.indexOf(summaryA);
  const indexB = summaryTexts.indexOf(summaryB);

  expect(indexA).toBeGreaterThanOrEqual(0);
  expect(indexB).toBeGreaterThanOrEqual(0);

  // AAA must appear before ZZZ in ascending order.
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

  // ZZZ must appear before AAA in descending order.
  expect(boxB!.y).toBeLessThan(boxA!.y);
});


  test("can paginate through tickets", async ({ page }) => {
    await selectAlice(page);

    const timestamp = Date.now();

    // Create enough tickets to guarantee at least two pages.
    for (let i = 1; i <= 11; i++) {
      await createTicket(
        page,
        `E2E Pagination ${timestamp} ${i}`,
        "Hardware",
        "MEDIUM"
      );
    }

    // Clear any search/filter state and use default createdAt ordering.
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

    // Scroll the pagination control into view for mobile/tablet.
    
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

    // Page 2 must contain at least one ticket.
    await expect(
      page.locator("tbody tr").first()
    ).toBeVisible();

    const previousButton = pagination.getByRole("button", {
      name: "Previous",
    });

    await expect(previousButton).toBeEnabled();

    // Return to page 1.
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
      page.getByRole("cell", {
        name: summary,
      }).first()
    ).toBeVisible();

    await page.getByRole("button", {
      name: "Clear Filters",
    }).click();

    await expect(searchInput).toHaveValue("");

    // Verify the ticket still exists after clearing filters.
    // Search again to avoid depending on pagination position.
    await searchInput.fill(summary);

    await expect(
      page.getByRole("cell", {
        name: summary,
      }).first()
    ).toBeVisible();
  });
});


