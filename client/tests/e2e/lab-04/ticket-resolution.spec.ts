import { test, expect, type Page } from "@playwright/test";

const PASSWORD = "ChangeMe123!";
const REQUESTER = "quinn.requester@example.com";
const STAFF = "michael.brown@tiktockit.com";

async function login(page: Page, email: string) {
  await page.goto("/");
  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/^password$/i).fill(PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
}

test("Resolved is gated until IT Staff records an Action Taken", async ({ page }) => {
  const summary = `E2E resolution gate ${Date.now()}`;
  await login(page, REQUESTER);
  await page.getByRole("main").getByRole("button", { name: "+ Create Ticket" }).click();
  const selects = page.locator("select");
  await selects.nth(0).selectOption({ label: "Hardware" });
  await selects.nth(1).selectOption({ label: "Corporate Laptop" });
  await selects.nth(2).selectOption("MEDIUM");
  await page.locator('input[type="text"]').fill(summary);
  await page.locator("textarea").fill("Ticket used to demonstrate the resolution gate.");
  await page.getByRole("button", { name: "Create Ticket", exact: true }).click();
  await page.getByRole("button", { name: "Go to My Tickets" }).click();
  await page.getByTestId("current-user-identity").getByRole("button", { name: /logout/i }).click();

  await login(page, STAFF);
  await page.getByLabel(/^search$/i).fill(summary);
  await page.locator("tr", { hasText: summary }).getByRole("button").click();
  const status = page.getByLabel(/current status/i);
  await status.selectOption("OPEN");
  await status.selectOption("IN_PROGRESS");

  await expect(page.getByText(/Add an Action Taken before resolving this Ticket/i)).toBeVisible();
  await expect(status.locator('option[value="RESOLVED"]')).toBeDisabled();
  await page.getByRole("button", { name: /go to actions taken/i }).click();
  await page.getByRole("button", { name: /add action taken/i }).click();
  await page.getByLabel("Action Description").fill("Checked the device configuration.");
  await page.getByLabel("Result").fill("The reported issue is resolved.");
  await page.getByRole("button", { name: /^add action taken$/i }).click();

  await expect(status.locator('option[value="RESOLVED"]')).toBeEnabled();
  await status.selectOption("RESOLVED");
  await expect(page.getByText("Resolved", { exact: true }).first()).toBeVisible();
});
