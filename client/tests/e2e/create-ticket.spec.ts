import { test, expect } from "@playwright/test";

test.describe("Create Ticket", () => {
  test("can create a new ticket", async ({ page }) => {
    await page.goto("/");

    // Select requester
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

    // Open Create Ticket
    await page.getByRole("button", {
      name: "+ Create Ticket",
    }).click();

    await expect(
      page.getByRole("heading", { name: "Create Ticket" })
    ).toBeVisible();

    const selects = page.locator("select");

    await expect(selects).toHaveCount(4);

    // 0 = Development Requester
    // 1 = Category
    // 2 = Related System
    // 3 = Requested Priority

    await selects.nth(1).selectOption({
      label: "Hardware",
    });

    await selects.nth(2).selectOption({
      label: "Corporate Laptop",
    });

    await selects.nth(3).selectOption("HIGH");

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
    }).click();

    // After successful creation, Create Ticket should disappear
    await expect(
      page.getByRole("heading", { name: "Create Ticket" })
    ).not.toBeVisible();

    // My Tickets should be visible again
    await expect(
      page.getByText("My Tickets", { exact: true })
    ).toBeVisible();
  });

    test("validates ticket attachments", async ({ page }) => {
    await page.goto("/");

    // Select requester
    const requesterSelect = page.locator("#requester-select");

    await expect(requesterSelect).toBeVisible();

    await requesterSelect.selectOption({
      label: "Alice Johnson (alice@example.com)",
    });

    // Open Create Ticket
    await page.getByRole("button", {
      name: "+ Create Ticket",
    }).click();

    await expect(
      page.getByRole("heading", { name: "Create Ticket" })
    ).toBeVisible();

    // Fill required ticket fields
    const selects = page.locator("select");

    await selects.nth(1).selectOption({
      label: "Hardware",
    });

    await selects.nth(2).selectOption({
      label: "Corporate Laptop",
    });

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
      (input) => (input as HTMLInputElement).files?.[0]?.name
    );

    expect(fileName).toBe("test-attachment.png");
      });
  
});
