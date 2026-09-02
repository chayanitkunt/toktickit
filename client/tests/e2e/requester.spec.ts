import { test, expect } from "@playwright/test";

test.describe("Development Requester", () => {
  test("can select a requester", async ({ page }) => {
    await page.goto("/");

    const requesterSelect = page.locator("#requester-select");

    await expect(requesterSelect).toBeVisible();

    await expect(
      requesterSelect.locator("option", {
        hasText: "Bob Smith",
      })
    ).toBeAttached();

    await requesterSelect.selectOption({
      label: "Bob Smith",
    });

    await expect(requesterSelect).toHaveValue("2");

    await expect(
      page.getByRole("button", { name: /Continue/i })
    ).toBeEnabled();

    await page.getByRole("button", { name: /Continue/i }).click();
  });
});
