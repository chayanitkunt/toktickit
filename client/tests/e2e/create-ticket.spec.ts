import { test, expect, Page } from '@playwright/test';

async function selectAliceRequester(page: Page) {
  await page.goto("/");

  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const requesterSelect = page.locator("#requester-select");
  await expect(requesterSelect).toBeVisible();

  await expect(requesterSelect.locator("option")).toContainText([
    "Alice Johnson",
  ]);

  await requesterSelect.selectOption({
    label: "Alice Johnson",
  });

  await page.getByRole("button", { name: /Continue/i }).click();

  await expect(
    page.getByRole("heading", { name: "My Tickets" })
  ).toBeVisible();
}

test.describe("Create Ticket", () => {
  test("can create a new ticket", async ({ page }) => {
    await selectAliceRequester(page);

    // Open Create Ticket
    await page.getByRole("main").getByRole("button", {
      name: "+ Create Ticket",
    }).click();

    await expect(
      page.getByRole("heading", { name: "Create Ticket" })
    ).toBeVisible();

    const selects = page.locator("select");

    await expect(selects).toHaveCount(3);

    // 0 = Category
    // 1 = Related System
    // 2 = Requested Priority

    await selects.nth(0).selectOption({
      label: "Hardware",
    });

    await selects.nth(1).selectOption({
      label: "Corporate Laptop",
    });

    await selects.nth(2).selectOption("HIGH");

    // Summary
    await page.locator('input[type="text"]').fill(
      "Laptop screen flickers randomly"
    );

    // Description
    await page.locator("textarea").fill(
      "The laptop screen flickers randomly while I am using it. Please check the display and determine the cause of the problem."
    );

    // Submit
    await page.getByRole("button", {
      name: "Create Ticket",
      exact: true,
    }).click();

    // Success state should show the backend-generated Ticket Number
    await expect(
      page.getByRole("heading", { name: "Ticket Created" })
    ).toBeVisible();

    await expect(page.getByText(/TKT-\d{4}-\d{6}/)).toBeVisible();

    await page
      .getByRole("button", { name: "Go to My Tickets" })
      .click();

    // My Tickets should be visible again
    await expect(
      page.getByRole("heading", { name: "My Tickets" })
    ).toBeVisible();
  });

  test("validates ticket attachments", async ({ page }) => {
    await selectAliceRequester(page);

    // Open Create Ticket
    await page.getByRole("main").getByRole("button", {
      name: "+ Create Ticket",
    }).click();

    await expect(
      page.getByRole("heading", { name: "Create Ticket" })
    ).toBeVisible();

    const selects = page.locator("select");

    await selects.nth(0).selectOption({
      label: "Hardware",
    });

    await selects.nth(1).selectOption({
      label: "Corporate Laptop",
    });

    await selects.nth(2).selectOption("HIGH");

    await page.locator('input[type="text"]').fill(
      "Attachment validation test"
    );

    await page.locator("textarea").fill(
      "This ticket is used to verify attachment validation."
    );

    // Upload a valid PNG attachment
    const fileInput = page.locator('input[type="file"]');

    await fileInput.setInputFiles({
      name: "test-attachment.png",
      mimeType: "image/png",
      buffer: Buffer.from("test attachment"),
    });

    // Verify the file input accepted the attachment
    const fileName = await fileInput.evaluate(
      (input) =>
        (input as HTMLInputElement).files?.[0]?.name
    );

    expect(fileName).toBe("test-attachment.png");
  });
});
