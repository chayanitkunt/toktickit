import { test, expect } from "@playwright/test";

test.describe("Development Requester", () => {
  test("can select a requester", async ({ page }) => {
    await page.goto("/");

    const requesterSelect = page.locator("#requester-select");

    await expect(requesterSelect).toBeVisible();

    await requesterSelect.selectOption({
      label: "Bob Smith (bob@example.com)",
    });

    await expect(
      page.getByText("Current requester:", { exact: false })
    ).toBeVisible();

    await expect(
      page.getByText("Bob Smith", { exact: true })
    ).toBeVisible();
  });
});
